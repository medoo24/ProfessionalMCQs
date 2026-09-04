// ═══════════════════════════════════════════════════════════════════════
// App.jsx — Main application component
// State management, filtering, keyboard shortcuts, export, header/toolbar/layout + Firebase auth
// ═══════════════════════════════════════════════════════════════════════
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Auto-discovery of question bank files ────────────────────────────────────
// Strategy (in order):
//  1. Fetch data/ directory listing (works with Python http.server & any server
//     that returns HTML directory indexes — no config needed, just drop files in)
//  2. Fall back to data/manifest.json  (needed for GitHub Pages / static hosts
//     that don't serve directory listings)
//  3. Fall back to AVAILABLE_FILES from config.js

const DATA_FILE_EXTS = new Set(['json','txt','tsv','csv']);

async function discoverDataFiles() {
  // ── Attempt 1: GitHub Contents API (works on GitHub Pages — zero manifest required!) ──
  try {
    const host = window.location.hostname;
    let owner = 'medoo24';
    let repo = 'ProfessionalMCQs';
    
    if (host.endsWith('.github.io')) {
      owner = host.split('.')[0];
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0) repo = parts[0];
    }

    if (owner && repo && (host.endsWith('.github.io') || host.includes('github'))) {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data`);
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const files = items
            .filter(item => item.type === 'file' && DATA_FILE_EXTS.has(item.name.split('.').pop().toLowerCase()))
            .map(item => 'data/' + item.name);
          if (files.length > 0) return files;
        }
      }
    }
  } catch { /* GitHub API fallback */ }

  // ── Attempt 2: parse local HTTP directory listing (for Python http.server) ──
  try {
    const r = await fetch('data/');
    if (r.ok) {
      const html = await r.text();
      const links = [...html.matchAll(/href="([^"?#]+)"/gi)]
        .map(m => m[1])
        .filter(href => {
          if (href.endsWith('/') || href.startsWith('?') || href === '../') return false;
          const ext = href.split('.').pop().toLowerCase();
          return DATA_FILE_EXTS.has(ext);
        })
        .map(href => 'data/' + href.split('/').pop());
      if (links.length > 0) return links;
    }
  } catch { /* directory listing not available */ }

  // ── Attempt 3: manifest.json fallback ──
  try {
    const r = await fetch('data/manifest.json');
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.files) && j.files.length) {
        return j.files.map(f => f.startsWith('data/') || f.startsWith('http') || f.startsWith('/') ? f : 'data/' + f);
      }
    }
  } catch { /* no manifest */ }

  return null; // caller falls back to AVAILABLE_FILES
}


// ── MAIN APP ────────────────────────────────────────────────────────────
function App() {
  // ── Auth state ──
  const [authUser, setAuthUser] = React.useState(null);        // Firebase user | null
  const [authReady, setAuthReady] = React.useState(!window.FIREBASE_CONFIGURED); // skip if no Firebase
  const [syncStatus, setSyncStatus] = React.useState('local'); // 'local'|'idle'|'syncing'|'error'|'offline'
  const [lastSynced, setLastSynced] = React.useState(null);
  const [availableFiles, setAvailableFiles] = React.useState(AVAILABLE_FILES);

  // ── File & data ──
  const initFile = load('activeFile', AVAILABLE_FILES[0] || '');
  const initFk = fileKeyFrom(initFile || 'file');
  const [activeFile, setActiveFile] = useState(() => initFile);
  const [fileKey, setFileKey] = useState(() => initFk);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [availableLessons, setAvailableLessons] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Per-file state (all keyed by fileKey)
  const [favIds, setFavIds] = useState(() => new Set(load('favs', [], initFk)));
  const [completedIds, setCompletedIds] = useState(() => new Set(load('done', [], initFk)));
  const [pinnedIds, setPinnedIds] = useState(() => new Set(load('pins', [], initFk)));
  const [notes, setNotes] = useState(() => load('notes', {}, initFk));
  const [customTags, setCustomTags] = useState(() => load('ctags', {}, initFk));
  const [srData, setSrData] = useState(() => load('sr', {}, initFk));
  const [wrongCounts, setWrongCounts] = useState(() => load('wrong', {}, initFk));
  const [collectionSets, setCollectionSets] = useState(() => {
    const saved = load('collectionSets', null, initFk);
    if (saved) return saved;
    const old = load('collections', [], initFk);
    return [{ id: 'set-user-1', name: 'My Collections', type: 'user', colls: old }];
  });
  const [activeSetId, setActiveSetId] = useState(() => {
    const saved = load('collectionSets', null, initFk);
    return saved && saved.length ? saved[0].id : 'set-user-1';
  });
  const [sessions, setSessions] = useState(() => load('sessions', []));
  const [streak, setStreak] = useState(() => load('streak', 0));

  // View state
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [dSearch, setDSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [activeCollId, setActiveCollId] = useState(null);
  const [qFilters, setQFilters] = useState(new Set(['unsolved']));
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [lessonDDOpen, setLessonDDOpen] = useState(false);
  const [tagDDOpen, setTagDDOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState(() => load('display', { showOptions: true, showAnswer: true, showExplanation: true, showTags: true }));
  const [compact, setCompact] = useState(() => load('compact', false));
  const [theme, setTheme] = useState(() => load('theme', 'dark'));

  // UI
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulk, setSelectedBulk] = useState(new Set());
  const [autoCollapseDone, setAutoCollapseDone] = useState(() => load('autoCollapseDone', false));
  const [isExporting, setIsExporting] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  // Modals
  const [showReport, setShowReport] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [practiceMode, setPracticeMode] = useState('practice');
  const [showExamLauncher, setShowExamLauncher] = useState(false);
  const [examCustomPool, setExamCustomPool] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showTVLauncher, setShowTVLauncher] = useState(false);
  const [tvSession, setTvSession] = useState(null);
  const [tvHistory, setTvHistory] = useState(() => load('tvHistory', []));
  const [showNarration, setShowNarration] = useState(false);
  const [showKnowledgeMap, setShowKnowledgeMap] = useState(false);
  const [noteModal, setNoteModal] = useState(null);
  const [tagModal, setTagModal] = useState(null);
  const [localAnsOverrides, setLocalAnsOverrides] = useState({});
  const [localOptOverrides, setLocalOptOverrides] = useState({});
  const [localExpOverrides, setLocalExpOverrides] = useState({});

  const sessionStartRef = useRef(Date.now());
  const searchRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchDebRef = useRef(null);
  const lessonDDRef = useRef(null);
  const tagDDRef = useRef(null);

  // ── Auto-discover files in data/ folder ──
  useEffect(() => {
    discoverDataFiles().then(files => {
      if (files && files.length) {
        setAvailableFiles(files);
        const lastSaved = load('activeFile', null);
        const targetFile = (lastSaved && files.includes(lastSaved))
          ? lastSaved
          : (activeFile && files.includes(activeFile) ? activeFile : files[0]);
        if (targetFile) {
          loadFile(targetFile);
        }
      }
    });
  }, []);

  // ── Firebase Auth ──
  useEffect(() => {
    if (!window.FIREBASE_CONFIGURED) return;
    initFirebase();
    const unsub = onAuthChange(user => {
      setAuthUser(user);
      setAuthReady(true);
      setSyncStatus(user && !user.isAnonymous ? 'idle' : 'local');
    });
    return unsub;
  }, []);

  // ── Cloud sync: pull on sign-in ──
  useEffect(() => {
    if (!authUser || authUser.isAnonymous || !fileKey) return;
    setSyncStatus('syncing');
    pullFromCloud(authUser.uid, fileKey).then(found => {
      if (found) {
        // Reload state from localStorage (now updated by pullFromCloud)
        setFavIds(new Set(load('favs', [], fileKey)));
        setCompletedIds(new Set(load('done', [], fileKey)));
        setPinnedIds(new Set(load('pins', [], fileKey)));
        setNotes(load('notes', {}, fileKey));
        setCustomTags(load('ctags', {}, fileKey));
        setSrData(load('sr', {}, fileKey));
        setWrongCounts(load('wrong', {}, fileKey));
        showToast('☁ Progress synced from cloud');
      }
      setSyncStatus('idle');
      setLastSynced(Date.now());
    }).catch(() => setSyncStatus('error'));
  }, [authUser?.uid]);

  // ── Cloud sync: push on state changes (debounced 3s) ──
  const cloudPushRef = useRef(null);
  useEffect(() => {
    if (!authUser || authUser.isAnonymous || !fileKey) return;
    clearTimeout(cloudPushRef.current);
    cloudPushRef.current = setTimeout(() => {
      setSyncStatus('syncing');
      pushToCloud(authUser.uid, fileKey)
        .then(() => { setSyncStatus('idle'); setLastSynced(Date.now()); })
        .catch(() => setSyncStatus('error'));
    }, 3000);
  }, [favIds, completedIds, pinnedIds, notes, customTags, srData, wrongCounts, collectionSets]);

  const handleSignOut = async () => {
    await signOutUser();
    setAuthUser(null);
    setSyncStatus('local');
    showToast('Signed out');
  };

  const handleSyncNow = async () => {
    if (!authUser || authUser.isAnonymous) return;
    setSyncStatus('syncing');
    await pushToCloud(authUser.uid, fileKey);
    setSyncStatus('idle');
    setLastSynced(Date.now());
    showToast('☁ Synced!');
  };

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    const handler = e => {
      if (lessonDDRef.current && !lessonDDRef.current.contains(e.target)) setLessonDDOpen(false);
      if (tagDDRef.current && !tagDDRef.current.contains(e.target)) setTagDDOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const weakIds = useMemo(() => new Set(Object.entries(wrongCounts).filter(([, c]) => c >= 3).map(([id]) => id)), [wrongCounts]);
  const collections = useMemo(() => collectionSets.flatMap(s => s.colls), [collectionSets]);

  // ── Persistence ──
  useEffect(() => save('favs', Array.from(favIds), fileKey), [favIds, fileKey]);
  useEffect(() => save('done', Array.from(completedIds), fileKey), [completedIds, fileKey]);
  useEffect(() => save('pins', Array.from(pinnedIds), fileKey), [pinnedIds, fileKey]);
  useEffect(() => save('notes', notes, fileKey), [notes, fileKey]);
  useEffect(() => save('ctags', customTags, fileKey), [customTags, fileKey]);
  useEffect(() => save('sr', srData, fileKey), [srData, fileKey]);
  useEffect(() => save('wrong', wrongCounts, fileKey), [wrongCounts, fileKey]);
  useEffect(() => save('collectionSets', collectionSets, fileKey), [collectionSets, fileKey]);
  useEffect(() => save('tvHistory', tvHistory), [tvHistory]);
  useEffect(() => save('sessions', sessions), [sessions]);
  useEffect(() => save('display', displaySettings), [displaySettings]);
  useEffect(() => save('compact', compact), [compact]);
  useEffect(() => save('autoCollapseDone', autoCollapseDone), [autoCollapseDone]);
  useEffect(() => save('theme', theme), [theme]);

  // ── Theme ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    ['aurora', 'synthwave', 'galaxy', 'candy'].forEach(t => document.body.classList.remove('live-' + t));
    const td = THEMES.find(t => t.id === theme);
    if (td?.live) document.body.classList.add('live-' + theme);
  }, [theme]);

  // ── Reading progress rail ──
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
      const fill = document.getElementById('read-fill');
      if (fill) fill.style.height = `${Math.min(100, pct)}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Streak tracking ──
  useEffect(() => {
    const today = new Date().toDateString();
    const lastSession = sessions[sessions.length - 1];
    if (!lastSession || new Date(lastSession.date).toDateString() !== today) return;
    let s = 0, d = new Date(); d.setHours(0, 0, 0, 0);
    const daySet = new Set(sessions.map(x => new Date(x.date).toDateString()));
    while (daySet.has(d.toDateString())) { s++; d.setDate(d.getDate() - 1); }
    setStreak(s); save('streak', s);
  }, [sessions]);

  // ── Session recording ──
  useEffect(() => {
    const handleUnload = () => {
      const dur = Math.round((Date.now() - sessionStartRef.current) / 1000);
      if (dur < 30) return;
      const newSession = { date: Date.now(), duration: dur };
      const updated = [...load('sessions', []), newSession].slice(-200);
      save('sessions', updated);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // ── Toast ──
  const showToast = (msg, type = 'success', undoFn = null) => {
    clearTimeout(toastTimerRef.current);
    setToast({ msg, type, undoFn });
    toastTimerRef.current = setTimeout(() => setToast(null), undoFn ? 5000 : 3000);
  };
  const dismissToast = () => { clearTimeout(toastTimerRef.current); setToast(null); };

  // ── Reset helpers ──
  const resetFileData = () => {
    if (!fileKey) return;
    clearFileData(fileKey);
    setFavIds(new Set()); setCompletedIds(new Set()); setPinnedIds(new Set());
    setNotes({}); setCustomTags({}); setSrData({}); setWrongCounts({});
    setCollapsedIds(new Set()); setLocalAnsOverrides({}); setLocalOptOverrides({}); setLocalExpOverrides({});
    const sys = buildSystemSets(questions, availableLessons);
    setCollectionSets([...sys, { id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }]);
    setActiveSetId('set-lessons');
    showToast('🗑 File data reset', 'warn');
  };

  const resetAllData = () => {
    clearAllQnaData();
    setFavIds(new Set()); setCompletedIds(new Set()); setPinnedIds(new Set());
    setNotes({}); setCustomTags({}); setSrData({}); setWrongCounts({});
    setCollapsedIds(new Set()); setLocalAnsOverrides({}); setLocalOptOverrides({}); setLocalExpOverrides({});
    setSessions([]); setStreak(0);
    if (questions.length) {
      const sys = buildSystemSets(questions, availableLessons);
      setCollectionSets([...sys, { id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }]);
    } else {
      setCollectionSets([{ id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }]);
    }
    setActiveSetId(questions.length ? 'set-lessons' : 'set-user-1');
    showToast('🗑 All data reset', 'warn');
  };

  // ── System sets builder ──
  const buildSystemSets = (qs, lessons) => {
    let pi = 0;
    const lessonColls = (lessons || []).filter(l => l && l !== 'General').map(l => ({
      id: 'ls-' + l.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_'),
      name: l, color: PALETTE[pi++ % PALETTE.length],
      qIds: qs.filter(q => q.lesson === l).map(q => q.id)
    }));
    const generalQs = qs.filter(q => !q.lesson || q.lesson === 'General');
    if (generalQs.length) lessonColls.push({ id: 'ls-General', name: 'General', color: '#8892a4', qIds: generalQs.map(q => q.id) });
    const chunk = Math.ceil(qs.length / 10);
    const numericColls = Array.from({ length: 10 }, (_, i) => {
      const sl = qs.slice(i * chunk, (i + 1) * chunk);
      if (!sl.length) return null;
      return { id: `num-${i}`, name: `Part ${i + 1}`, color: PALETTE[(i * 3 + 7) % PALETTE.length], qIds: sl.map(q => q.id) };
    }).filter(Boolean);
    return [
      { id: 'set-lessons', name: 'By Lesson', type: 'lesson', colls: lessonColls },
      { id: 'set-numeric', name: 'By Part (10)', type: 'numeric', colls: numericColls },
    ];
  };

  // ── File loading ──
  const loadFile = (fileName) => {
    if (!fileName) return;
    const url = (fileName.startsWith('data/') || fileName.startsWith('http://') || fileName.startsWith('https://') || fileName.startsWith('/'))
      ? fileName
      : 'data/' + fileName;
    save('activeFile', url);
    setActiveFile(url);
    setIsLoading(true); setFetchError(null);
    setSearchQuery(''); setDSearch(''); setSelectedLessons(new Set()); setSelectedTags(new Set()); setCollapsedIds(new Set()); setActiveTab('All');
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(text => {
        const fk = fileKeyFrom(fileName);
        setFileKey(fk);
        const { parsed, lessons } = parseTextData(text, fk);
        setQuestions(parsed); setAvailableLessons(lessons); setIsLoading(false);
        setFavIds(new Set(load('favs', [], fk)));
        setCompletedIds(new Set(load('done', [], fk)));
        setPinnedIds(new Set(load('pins', [], fk)));
        setNotes(load('notes', {}, fk));
        setCustomTags(load('ctags', {}, fk));
        setSrData(load('sr', {}, fk));
        setWrongCounts(load('wrong', {}, fk));
        const savedSets = load('collectionSets', null, fk);
        const userSets = savedSets ? savedSets.filter(s => s.type === 'user')
          : [{ id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }];
        const sys = buildSystemSets(parsed, lessons);
        setCollectionSets([...sys, ...userSets]);
        setActiveSetId('set-lessons');
        showToast(`Loaded ${parsed.length} questions`);
      })
      .catch(err => { setFetchError(`Cannot load "${fileName}". ${err.message}`); setIsLoading(false); });
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = e => {
      const fk = fileKeyFrom(file.name);
      setFileKey(fk);
      const { parsed, lessons } = parseTextData(e.target.result, fk);
      setQuestions(parsed); setAvailableLessons(lessons);
      save('activeFile', file.name);
      setActiveFile(file.name); setSearchQuery(''); setDSearch(''); setSelectedLessons(new Set()); setSelectedTags(new Set()); setCollapsedIds(new Set()); setActiveTab('All'); setFetchError(null);
      setFavIds(new Set(load('favs', [], fk)));
      setCompletedIds(new Set(load('done', [], fk)));
      setPinnedIds(new Set(load('pins', [], fk)));
      setNotes(load('notes', {}, fk));
      setCustomTags(load('ctags', {}, fk));
      setSrData(load('sr', {}, fk));
      setWrongCounts(load('wrong', {}, fk));
      const savedSets = load('collectionSets', null, fk);
      const userSets = savedSets ? savedSets.filter(s => s.type === 'user')
        : [{ id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }];
      const sys = buildSystemSets(parsed, lessons);
      setCollectionSets([...sys, ...userSets]);
      setActiveSetId('set-lessons');
      // Add uploaded file to available list if not already there
      setAvailableFiles(prev => prev.includes(file.name) ? prev : [file.name, ...prev]);
      showToast(`Loaded ${parsed.length} questions from "${file.name}"`);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const target = load('activeFile', AVAILABLE_FILES[0] || '');
    if (target && availableFiles.includes(target) && !questions.length) {
      loadFile(target);
    }
  }, []);

  // ── Toggles ──
  const toggleFav = useCallback((id) => setFavIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleDone = useCallback((id) => {
    setCompletedIds(prev => {
      const wasDone = prev.has(id);
      const snap = new Set(prev);
      const next = new Set(prev);
      wasDone ? next.delete(id) : next.add(id);
      if (!wasDone) setCollapsedIds(c => { if (!autoCollapseDone) return c; const n = new Set(c); n.add(id); return n; });
      showToast(wasDone ? '↩ Unmarked Done' : '✓ Marked Done', wasDone ? 'warn' : 'success', () => setCompletedIds(snap));
      return next;
    });
  }, [autoCollapseDone]);
  const togglePin = useCallback((id) => setPinnedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleCollapse = useCallback((id) => setCollapsedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleCollapseAll = useCallback(() => {
    setCollapsedIds(prev => prev.size > 0 ? new Set() : new Set(questions.map(q => q.id)));
  }, [questions]);
  const toggleLesson = useCallback(l => { setSelectedLessons(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n; }); }, []);
  const toggleTag = useCallback(t => { setSelectedTags(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; }); }, []);
  const jumpToTag = useCallback(t => { setSelectedTags(new Set([t])); setTagDDOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const toggleQFilter = useCallback(key => {
    setQFilters(prev => {
      const n = new Set(prev);
      if (key === 'all') return new Set(['all']);
      n.delete('all');
      if (n.has(key)) { n.delete(key); if (n.size === 0) n.add('all'); }
      else n.add(key);
      return n;
    });
  }, []);
  const toggleLocalAns = useCallback((qId) => { setLocalAnsOverrides(prev => { const cur = prev[qId]; if (cur === undefined) return { ...prev, [qId]: true }; if (cur === true) return { ...prev, [qId]: false }; const n = { ...prev }; delete n[qId]; return n; }); }, []);
  const toggleLocalOpt = useCallback((qId) => { setLocalOptOverrides(prev => { const cur = prev[qId]; if (cur === undefined) return { ...prev, [qId]: true }; if (cur === true) return { ...prev, [qId]: false }; const n = { ...prev }; delete n[qId]; return n; }); }, []);
  const toggleLocalExp = useCallback((qId) => { setLocalExpOverrides(prev => { const cur = prev[qId]; if (cur === undefined) return { ...prev, [qId]: true }; if (cur === true) return { ...prev, [qId]: false }; const n = { ...prev }; delete n[qId]; return n; }); }, []);
  const saveNote = useCallback((qId, text) => { setNotes(prev => ({ ...prev, [qId]: text })); }, []);
  const saveCustomTag = useCallback((qId, tag) => { setCustomTags(prev => ({ ...prev, [qId]: tag })); }, []);
  const rateSR = useCallback((qId, quality) => { setSrData(prev => ({ ...prev, [qId]: sm2(prev[qId], quality) })); }, []);
  const addWrong = useCallback((qId) => { setWrongCounts(prev => ({ ...prev, [qId]: (prev[qId] || 0) + 1 })); }, []);
  const markDone = useCallback((qId) => { setCompletedIds(prev => { const n = new Set(prev); n.add(qId); return n; }); }, []);
  const markWeak = useCallback((qId) => {
    setWrongCounts(prev => {
      const snap = { ...prev };
      const next = { ...prev, [qId]: Math.max((prev[qId] || 0) + 1, 3) };
      showToast('⚡ Marked Weak', 'warn', () => setWrongCounts(snap));
      return next;
    });
  }, []);

  // ── Bulk actions ──
  const toggleBulkSelect = useCallback((id) => { setSelectedBulk(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);
  const bulkMarkDone = useCallback(() => {
    if (!selectedBulk.size) return;
    const snap = new Set(completedIds); const ids = new Set(selectedBulk);
    setCompletedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    if (autoCollapseDone) setCollapsedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    showToast(`✓ ${ids.size} marked Done`, 'success', () => setCompletedIds(snap));
    setSelectedBulk(new Set());
  }, [selectedBulk, completedIds, autoCollapseDone]);
  const bulkMarkWeak = useCallback(() => {
    if (!selectedBulk.size) return;
    const snap = { ...wrongCounts }; const ids = new Set(selectedBulk);
    setWrongCounts(prev => { const n = { ...prev }; ids.forEach(id => { n[id] = Math.max((n[id] || 0) + 1, 3); }); return n; });
    showToast(`⚡ ${ids.size} marked Weak`, 'warn', () => setWrongCounts(snap));
    setSelectedBulk(new Set());
  }, [selectedBulk, wrongCounts]);
  const bulkAddToCollection = useCallback((collId) => {
    if (!selectedBulk.size) return;
    const ids = new Set(selectedBulk);
    setCollectionSets(prev => prev.map(s => ({ ...s, colls: s.colls.map(c => c.id !== collId ? c : { ...c, qIds: Array.from(new Set([...c.qIds, ...ids])) }) })));
    const col = collections.find(c => c.id === collId);
    showToast(`📁 ${ids.size} added to "${col?.name || ''}"`, 'success');
    setSelectedBulk(new Set());
  }, [selectedBulk, collections]);
  const bulkRemoveFromColl = useCallback((collId) => {
    if (!selectedBulk.size || !collId) return;
    const ids = new Set(selectedBulk);
    setCollectionSets(prev => prev.map(s => ({ ...s, colls: s.colls.map(c => c.id !== collId ? c : { ...c, qIds: c.qIds.filter(id => !ids.has(id)) }) })));
    showToast(`🗑 ${ids.size} removed from collection`, 'warn');
    setSelectedBulk(new Set());
  }, [selectedBulk, collections]);

  // ── Search debounce ──
  const handleSearch = val => {
    setSearchQuery(val);
    clearTimeout(searchDebRef.current);
    searchDebRef.current = setTimeout(() => setDSearch(val), 180);
  };

  // ── Filter logic ──
  const allTags = useMemo(() => {
    const counts = {};
    questions.forEach(q => { const t = customTags[q.id] || q.tag; if (t && t.trim()) counts[t.trim()] = (counts[t.trim()] || 0) + 1; });
    const normal = [], restTags = [];
    Object.keys(counts).sort().forEach(t => { if (t.length > 40 && counts[t] === 1) restTags.push(t); else normal.push(t); });
    if (restTags.length > 0) normal.push('__REST__');
    return { tags: normal, restTags };
  }, [questions, customTags]);

  const visibleQuestions = useMemo(() => {
    let f = questions;
    f = [...f.filter(q => pinnedIds.has(q.id)), ...f.filter(q => !pinnedIds.has(q.id))];
    if (selectedLessons.size > 0) f = f.filter(q => selectedLessons.has(q.lesson));
    if (selectedTags.size > 0) f = f.filter(q => {
      const t = (customTags[q.id] || q.tag || '').trim();
      if (selectedTags.has(t)) return true;
      if (selectedTags.has('__REST__') && allTags.restTags && allTags.restTags.includes(t)) return true;
      return false;
    });
    const q = dSearch.trim();
    if (q) {
      const range = q.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) { const s = parseInt(range[1]), e = parseInt(range[2]); f = f.filter(x => { const n = parseInt(qNum(x.id)); return n >= s && n <= e; }); }
      else {
        const lo = q.toLowerCase();
        f = f.filter(x => x.question.toLowerCase().includes(lo) || x.options.some(o => o.toLowerCase().includes(lo)) || (x.explanation && x.explanation.toLowerCase().includes(lo)) || (x.tag && x.tag.toLowerCase().includes(lo)) || (customTags[x.id] && customTags[x.id].toLowerCase().includes(lo)) || (x.answerText && x.answerText.toLowerCase().includes(lo)));
      }
    }
    if (activeTab === 'Collection' && activeCollId) { const col = collections.find(c => c.id === activeCollId); if (col) f = f.filter(x => col.qIds.includes(x.id)); }
    else if (activeTab === 'SR Due') f = f.filter(x => isDue(srData[x.id]));
    if (!qFilters.has('all') && qFilters.size > 0) {
      f = f.filter(x => {
        if (qFilters.has('done') && completedIds.has(x.id)) return true;
        if (qFilters.has('unsolved') && !completedIds.has(x.id)) return true;
        if (qFilters.has('fav') && favIds.has(x.id)) return true;
        if (qFilters.has('weak') && weakIds.has(x.id)) return true;
        return false;
      });
    }
    return f;
  }, [questions, dSearch, activeTab, activeCollId, favIds, completedIds, pinnedIds, selectedLessons, selectedTags, allTags, srData, weakIds, collections, customTags, qFilters]);

  const pct = questions.length > 0 ? Math.round((completedIds.size / questions.length) * 100) : 0;
  const qCollectionsMap = useMemo(() => { const map = {}; collections.forEach(c => { c.qIds.forEach(qId => { if (!map[qId]) map[qId] = []; map[qId].push(c); }); }); return map; }, [collections]);
  const srDueCount = useMemo(() => questions.filter(q => isDue(srData[q.id])).length, [questions, srData]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!questions.length) return;
    let lastKey = '', lastKeyTime = 0;
    const onKey = e => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); setToast(prev => { if (prev?.undoFn) { clearTimeout(toastTimerRef.current); prev.undoFn(); return null; } return prev; }); return; }
        if (e.key === 'k' || e.key === 'K') { e.preventDefault(); setShowShortcuts(v => !v); return; }
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); searchRef.current?.focus(); return; }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setShowReport(v => !v); return; }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setPracticeMode('practice'); setShowPractice(true); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setShowExamLauncher(true); return; }
        if (e.key === '/') { e.preventDefault(); setCompact(v => !v); return; }
      }
      if (inInput) return;
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setLocalAnsOverrides({}); setDisplaySettings(p => ({ ...p, showAnswer: !p.showAnswer })); return; }
      const now = Date.now();
      if (e.key === 'g') { if (lastKey === 'g' && now - lastKeyTime < 500) { window.scrollTo({ top: 0, behavior: 'smooth' }); setFocusedIdx(0); } lastKey = 'g'; lastKeyTime = now; return; }
      lastKey = e.key; lastKeyTime = now;
      if (e.key === 'G' && e.shiftKey) { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return; }
      if (e.key === 'Escape') { setDSearch(''); setSearchQuery(''); setShowShortcuts(false); setShowReport(false); return; }
      if (e.key === 't' || e.key === 'T') { setTheme(p => { const ids = THEMES.map(t => t.id); const i = ids.indexOf(p); return ids[(i + 1) % ids.length]; }); return; }
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => { const n = Math.min(visibleQuestions.length - 1, i + 1); scrollToQ(visibleQuestions[n]?.id); return n; }); return; }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => { const n = Math.max(0, i - 1); scrollToQ(visibleQuestions[n]?.id); return n; }); return; }
      const fq = visibleQuestions[focusedIdx];
      if (!fq) return;
      if (e.key === ' ') { e.preventDefault(); toggleCollapse(fq.id); }
      if (e.key === 'f' || e.key === 'F') toggleFav(fq.id);
      if (e.key === 'd' || e.key === 'D') toggleDone(fq.id);
      if (e.key === 'p' || e.key === 'P') togglePin(fq.id);
      if (e.key === 'n' || e.key === 'N') setNoteModal({ qId: fq.id, question: fq.question });
      if (e.key === 'c' || e.key === 'C') {
        let text = `[Q${qNum(fq.id)}] ${fq.question}\n`;
        if (displaySettings.showOptions && fq.options?.length) fq.options.forEach((o, i) => { text += `  ${String.fromCharCode(65 + i)}) ${o}\n`; });
        if (displaySettings.showAnswer) text += `  ✓ ${fq.answerKey ? fq.answerKey + ' — ' : ''}${fq.answerText}\n`;
        if (displaySettings.showExplanation && fq.explanation) text += `  📖 ${fq.explanation}\n`;
        navigator.clipboard?.writeText(text).then(() => showToast('Copied!'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questions, visibleQuestions, focusedIdx, displaySettings]);

  const scrollToQ = (id) => { if (!id) return; const el = document.getElementById(`q-${id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  // ── Export ──
  const exportToText = () => {
    if (!visibleQuestions.length) return showToast('Nothing to export', 'warn');
    let text = `QnA Hub Export\n${'='.repeat(50)}\n\n`;
    visibleQuestions.forEach(q => {
      text += `[ID: ${qNum(q.id)}] ${q.lesson !== 'General' ? '[' + q.lesson + ']' : ''}\n${q.question}\n`;
      if (displaySettings.showOptions && q.options.length > 0) q.options.forEach((o, i) => { text += `  ${String.fromCharCode(65 + i)}) ${o}\n`; });
      if (displaySettings.showAnswer) text += `  ✓ ${q.answerKey ? q.answerKey + ' — ' : ''}${q.answerText}\n`;
      if (displaySettings.showExplanation && q.explanation) text += `  📖 ${q.explanation}\n`;
      const tag = customTags[q.id] || q.tag; if (tag) text += `  🏷️ ${tag}\n`;
      if (notes[q.id]) text += `  📝 ${notes[q.id]}\n`;
      text += `\n${'—'.repeat(40)}\n\n`;
    });
    navigator.clipboard?.writeText(text).then(() => showToast('Copied!'));
  };

  const exportToDocx = async () => {
    if (!visibleQuestions.length) return showToast('Nothing to export', 'warn');
    showToast('Building DOCX...', 'success');
    try {
      const docx = window.docx || window.docxLib;
      if (!docx) return showToast('DOCX library not loaded yet', 'error');
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType } = docx;
      const BLUE = '2E5FAD', GREEN = '006644', GRAY = 'CCCCCC', DARKGRAY = '555555';
      const border = { style: BorderStyle.SINGLE, size: 1, color: GRAY };
      const borders = { top: border, bottom: border, left: border, right: border };
      const cellMarg = { top: 80, bottom: 80, left: 120, right: 120 };
      const titleLabel = activeCollId ? collections.find(c => c.id === activeCollId)?.name : activeTab === 'SR Due' ? 'SR Due' : (activeFile || 'Export');
      const showOpts = displaySettings.showOptions, showAns = displaySettings.showAnswer, showExp = displaySettings.showExplanation, showTags = displaySettings.showTags;
      const children = [];
      children.push(new Paragraph({ children: [new TextRun({ text: `QnA Hub — ${titleLabel}`, bold: true, size: 36, color: BLUE, font: 'Arial' })], spacing: { after: 120 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: `${visibleQuestions.length} questions · ${new Date().toLocaleDateString()}`, size: 18, color: '888888', font: 'Arial' })], spacing: { after: 400 } }));
      visibleQuestions.forEach((q, qi) => {
        const isDoneQ = completedIds.has(q.id), isWeakQ = weakIds.has(q.id), isFavQ = favIds.has(q.id);
        const tag = customTags[q.id] || q.tag, note = notes[q.id];
        children.push(new Paragraph({ children: [new TextRun({ text: `Q${qNum(q.id)}. `, bold: true, size: 24, color: BLUE, font: 'Arial' }), new TextRun({ text: q.question, bold: true, size: 24, font: 'Arial', color: isDoneQ ? '22AA66' : isWeakQ ? 'CC3333' : '111111' })], spacing: { before: 280, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 4 } } }));
        if (q.lesson && q.lesson !== 'General') children.push(new Paragraph({ children: [new TextRun({ text: q.lesson, size: 17, color: '777777', italics: true, font: 'Arial' })], spacing: { after: 60 } }));
        if (showOpts && q.options && q.options.length > 0) {
          const rows = q.options.map((opt, oi) => { const letter = String.fromCharCode(65 + oi); const isCorrect = showAns && q.answerKey && q.answerKey.toUpperCase() === letter; return new TableRow({ children: [new TableCell({ borders, margins: cellMarg, width: { size: 720, type: WidthType.DXA }, shading: isCorrect ? { fill: 'D5F0E8', type: ShadingType.CLEAR } : {}, children: [new Paragraph({ children: [new TextRun({ text: letter + ')', bold: true, size: 20, font: 'Arial', color: isCorrect ? GREEN : '333333' })] })] }), new TableCell({ borders, margins: cellMarg, width: { size: 8640, type: WidthType.DXA }, shading: isCorrect ? { fill: 'D5F0E8', type: ShadingType.CLEAR } : {}, children: [new Paragraph({ children: [new TextRun({ text: opt, size: 20, font: 'Arial', bold: isCorrect, color: isCorrect ? GREEN : '222222' })] })] })] }); });
          children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [720, 8640], rows }));
          children.push(new Paragraph({ spacing: { after: 60 } }));
        }
        if (showAns) { const ansLine = (q.answerKey ? q.answerKey + ' — ' : '') + (q.answerText || ''); if (ansLine.trim()) children.push(new Paragraph({ children: [new TextRun({ text: 'Answer: ', bold: true, size: 20, color: GREEN, font: 'Arial' }), new TextRun({ text: ansLine, size: 20, font: 'Arial', color: GREEN })], spacing: { before: 60, after: 60 }, indent: { left: 240 } })); }
        if (showExp && q.explanation) children.push(new Paragraph({ children: [new TextRun({ text: 'Explanation: ', bold: true, size: 18, color: DARKGRAY, font: 'Arial', italics: true }), new TextRun({ text: q.explanation, size: 18, font: 'Arial', color: DARKGRAY, italics: true })], spacing: { before: 40, after: 60 }, indent: { left: 240 } }));
        if (showTags && tag) children.push(new Paragraph({ children: [new TextRun({ text: `Tag: ${tag}`, size: 17, color: '888888', font: 'Arial' })], indent: { left: 240 }, spacing: { after: 30 } }));
        if (note) children.push(new Paragraph({ children: [new TextRun({ text: `Note: ${note}`, size: 17, color: 'AA8800', font: 'Arial', italics: true })], indent: { left: 240 }, spacing: { after: 30 } }));
        const badges = []; if (isDoneQ) badges.push('Done'); if (isWeakQ) badges.push('Weak'); if (isFavQ) badges.push('Fav');
        if (badges.length) children.push(new Paragraph({ children: [new TextRun({ text: badges.join('  '), size: 16, color: 'AAAAAA', font: 'Arial' })], indent: { left: 240 }, spacing: { after: 100 } }));
        if (qi < visibleQuestions.length - 1) children.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
      });
      const doc = new Document({ styles: { default: { document: { run: { font: 'Arial', size: 22 } } } }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } }, children }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
      a.download = `QnA_${(titleLabel || 'export').replace(/[^a-z0-9]/gi, '_')}.docx`;
      a.click(); URL.revokeObjectURL(url);
      showToast('DOCX exported! 📄');
    } catch (err) { console.error('DOCX error', err); showToast('DOCX failed: ' + err.message, 'error'); }
  };

  const exportToPDF = () => {
    if (!visibleQuestions.length) return showToast('Nothing to export', 'warn');
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return showToast('PDF library not loaded', 'error');
    setIsExporting(true); showToast('Generating PDF...');
    try {
      const showOpts = displaySettings.showOptions, showAns = displaySettings.showAnswer, showExp = displaySettings.showExplanation, showTags = displaySettings.showTags;
      const titleLabel = activeCollId ? collections.find(c => c.id === activeCollId)?.name : activeTab === 'SR Due' ? 'SR Due' : (activeFile || 'Export');
      const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const PW = 612, PH = 792, ML = 48, MR = 48, MT = 48, MB = 48, CW = PW - ML - MR;
      const BLUE = [46, 95, 173], BLACK = [17, 17, 17], GRAY = [120, 120, 120], DKGRAY = [80, 80, 80], GREEN = [0, 110, 68], RED = [180, 40, 40], DONE = [30, 160, 80], LINE = [220, 220, 220], BGOPT = [245, 250, 255], BGCORRECT = [213, 240, 232];
      let y = MT;
      const checkPage = (need = 16) => { if (y + need > PH - MB) { doc.addPage(); y = MT; } };
      const wrap = (text, maxW, fontSize) => { doc.setFontSize(fontSize); return doc.splitTextToSize(String(text || ''), maxW); };
      const textBlock = (lines, x, fontSize, color, opts = {}) => { doc.setFontSize(fontSize); doc.setTextColor(...color); if (opts.bold) doc.setFont('helvetica', 'bold'); else if (opts.italic) doc.setFont('helvetica', 'italic'); else doc.setFont('helvetica', 'normal'); const lh = fontSize * 1.4; lines.forEach(line => { checkPage(lh); doc.text(line, x, y); y += lh; }); if (opts.after) y += opts.after; };
      doc.setFillColor(...BLUE); doc.rect(ML, y, CW, 2, 'F'); y += 8;
      textBlock([`QnA Hub — ${titleLabel}`], ML, 18, BLUE, { bold: true, after: 4 });
      textBlock([`${visibleQuestions.length} questions  ·  ${new Date().toLocaleDateString()}`], ML, 9, GRAY, { after: 16 });
      doc.setFillColor(...LINE); doc.rect(ML, y, CW, 0.5, 'F'); y += 12;
      visibleQuestions.forEach((q, qi) => {
        checkPage(40);
        const isDoneQ = completedIds.has(q.id), isWeakQ = weakIds.has(q.id), tag = customTags[q.id] || q.tag, note = notes[q.id];
        const qLabel = `Q${qNum(q.id)}`; doc.setFillColor(...BLUE); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        const badgeW = doc.getTextWidth(qLabel) + 8; doc.roundedRect(ML, y - 9, badgeW, 13, 2, 2, 'F'); doc.text(qLabel, ML + 4, y);
        const qX = ML + badgeW + 6; const qColor = isDoneQ ? DONE : isWeakQ ? RED : BLACK;
        const qLines = wrap(q.question, CW - badgeW - 8, 11); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...qColor);
        qLines.forEach((line, li) => { if (li > 0) { checkPage(16); doc.text(line, qX, y); y += 15.4; } else { doc.text(line, qX, y); y += 15.4; } }); y += 2;
        if (q.lesson && q.lesson !== 'General') { checkPage(13); doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(q.lesson, ML + 4, y); y += 12; }
        if (showOpts && q.options && q.options.length > 0) { y += 2; q.options.forEach((opt, oi) => { const letter = String.fromCharCode(65 + oi); const isCorrect = showAns && q.answerKey && q.answerKey.toUpperCase() === letter; const optLines = wrap(opt, CW - 30, 10); const rowH = Math.max(18, optLines.length * 14 + 6); checkPage(rowH); doc.setFillColor(...(isCorrect ? BGCORRECT : BGOPT)); doc.rect(ML, y - 11, CW, rowH, 'F'); doc.setFillColor(...(isCorrect ? GREEN : [90, 110, 160])); doc.circle(ML + 9, y - 4, 7, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(letter, ML + 6.5, y - 1); doc.setFont('helvetica', isCorrect ? 'bold' : 'normal'); doc.setFontSize(10); doc.setTextColor(...(isCorrect ? GREEN : DKGRAY)); optLines.forEach((line, li) => { if (li > 0) { checkPage(14); doc.text(line, ML + 22, y); y += 14; } else { doc.text(line, ML + 22, y); } }); y += rowH - (optLines.length - 1) * 14 - 2; }); y += 4; }
        if (showAns) { const ansLine = (q.answerKey ? q.answerKey + ' — ' : '') + (q.answerText || ''); if (ansLine.trim()) { checkPage(16); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...GREEN); doc.text('Answer: ', ML + 8, y); const labelW = doc.getTextWidth('Answer: '); doc.setFont('helvetica', 'normal'); const aLines = wrap(ansLine, CW - 8 - labelW, 9.5); aLines.forEach((line, li) => { if (li === 0) { doc.text(line, ML + 8 + labelW, y); y += 14; } else { checkPage(14); doc.text(line, ML + 8 + labelW, y); y += 14; } }); y += 2; } }
        if (showExp && q.explanation) { checkPage(14); const expLines = wrap('Explanation: ' + q.explanation, CW - 8, 9); doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...DKGRAY); expLines.forEach(line => { checkPage(13); doc.text(line, ML + 8, y); y += 13; }); y += 2; }
        if (showTags && tag) { checkPage(12); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(`Tag: ${tag}`, ML + 8, y); y += 12; }
        if (note) { checkPage(12); const nLines = wrap('Note: ' + note, CW - 8, 8); doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(170, 136, 0); nLines.forEach(line => { checkPage(12); doc.text(line, ML + 8, y); y += 12; }); }
        y += 6;
        if (qi < visibleQuestions.length - 1) { checkPage(10); doc.setFillColor(...LINE); doc.rect(ML, y, CW, 0.5, 'F'); y += 10; }
      });
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(`${i} / ${pageCount}`, PW / 2, PH - 18, { align: 'center' }); doc.text('QnA Hub', ML, PH - 18); }
      doc.save(`QnA_${(titleLabel || 'export').replace(/[^a-z0-9]/gi, '_')}.pdf`);
      showToast('PDF exported! ✓');
    } catch (err) { console.error('PDF error', err); showToast('PDF failed: ' + err.message, 'error'); }
    finally { setIsExporting(false); }
  };

  // ── Tabs ──
  const TABS = [{ id: 'All', label: 'All', count: questions.length, cls: '' }, { id: 'SR Due', label: 'SR Due', count: srDueCount, cls: 'act-p' }];
  const practicePool = useMemo(() => questions.filter(q => q.options && q.options.length > 0), [questions]);
  const wrongPool = useMemo(() => questions.filter(q => wrongCounts[q.id] > 0 && q.options && q.options.length > 0), [questions, wrongCounts]);

  // ── Show login if Firebase configured and not authenticated ──
  if (window.FIREBASE_CONFIGURED && !authReady) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--muted)', fontSize: 14 }}>Loading…</div>;
  }
  if (window.FIREBASE_CONFIGURED && authReady && !authUser) {
    return <LoginPage />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 200, padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 15 }}>Q</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.02em' }}>QnA Hub</span>
          {streak > 0 && <span title={`${streak} day streak!`} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, color: 'var(--yellow)' }}><I.Flame />×{streak}</span>}
        </div>

        {/* Middle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, margin: '0 12px', maxWidth: 480 }}>
          {availableFiles.length > 1 && (
            <select className="input" style={{ maxWidth: 200 }} value={activeFile} onChange={e => { setActiveFile(e.target.value); loadFile(e.target.value); }}>
              {availableFiles.map(f => <option key={f} value={f}>{f.split('/').pop()}</option>)}
            </select>
          )}
          <button className="btn" onClick={() => fileInputRef.current?.click()}><I.Upload /><span>Upload</span></button>
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.tsv,.json" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); }} />
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {questions.length > 0 && <>
            <button className="btn ghost" onClick={() => setShowCollections(true)} title="Collections"><I.Folder /></button>
            <button className="btn ghost" onClick={() => setShowReport(true)} title="Report (Ctrl+R)"><I.Chart /></button>
            <button className="btn ghost" onClick={() => setShowKnowledgeMap(true)} title="Knowledge Map">🗺️</button>
            {practicePool.length > 0 && (
              <div style={{ position: 'relative', display: 'flex', gap: 4 }}>
                <button className="btn primary" onClick={() => { setPracticeMode('practice'); setShowPractice(true); }} style={{ padding: '6px 10px' }}><I.Brain /> Practice</button>
                <button className="btn primary" onClick={() => setShowExamLauncher(true)} style={{ padding: '6px 10px', fontSize: 11 }}>📝 Exam</button>
                {wrongPool.length > 0 && <button className="btn danger" onClick={() => { setPracticeMode('wrong'); setShowPractice(true); }} style={{ padding: '6px 10px', fontSize: 11 }}>❌ Wrong</button>}
                <button className="btn" onClick={() => setShowTVLauncher(true)} style={{ padding: '6px 10px', fontSize: 11 }} title="TV Show Mode">📺 TV</button>
                <button className="btn" onClick={() => setShowNarration(true)} style={{ padding: '6px 10px', fontSize: 11 }} title="Narration">🔊 Listen</button>
              </div>
            )}
          </>}
          <button className="btn ghost" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (Ctrl+K)"><I.Keyboard /></button>
          <ThemePicker theme={theme} setTheme={setTheme} />
          {/* Auth user menu */}
          {authUser && (
            <div style={{ position: 'relative' }}>
              <UserMenu user={authUser} syncStatus={syncStatus} lastSynced={lastSynced} onSignOut={handleSignOut} onSyncNow={handleSyncNow} />
            </div>
          )}
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      {questions.length > 0 && !isLoading && (
        <div style={{ background: 'var(--surface)', padding: '8px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 58, zIndex: 40 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div ref={lessonDDRef} style={{ position: 'relative' }}>
              <button className="btn" onClick={() => { setLessonDDOpen(v => !v); setTagDDOpen(false); }}>
                <I.Filter />{selectedLessons.size === 0 ? 'All Lessons' : `${selectedLessons.size} lesson(s)`}<I.Cd />
              </button>
              {lessonDDOpen && (<LessonFilterPanel availableLessons={availableLessons} selectedLessons={selectedLessons} onToggle={toggleLesson} onClear={() => { setSelectedLessons(new Set()); setLessonDDOpen(false); }} />)}
            </div>
            {allTags.tags.length > 0 && (
              <div ref={tagDDRef} style={{ position: 'relative' }}>
                <button className="btn" onClick={() => { setTagDDOpen(v => !v); setLessonDDOpen(false); }}>
                  <I.Tag />{selectedTags.size === 0 ? 'All Tags' : `${selectedTags.size} tag(s)`}<I.Cd />
                </button>
                {tagDDOpen && (<TagFilterPanel allTags={allTags.tags} restTags={allTags.restTags} selectedTags={selectedTags} onToggle={toggleTag} onClear={() => { setSelectedTags(new Set()); setTagDDOpen(false); }} questions={questions} customTags={customTags} />)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[{ key: 'all', label: 'All', color: 'var(--muted)' }, { key: 'unsolved', label: 'Unsolved', color: 'var(--yellow)' }, { key: 'done', label: 'Done', color: 'var(--green)' }, { key: 'fav', label: '★ Fav', color: 'var(--yellow)' }, { key: 'weak', label: '⚡ Weak', color: 'var(--red)' }].map(f => {
                const on = qFilters.has(f.key) || (f.key === 'all' && qFilters.has('all'));
                return (<button key={f.key} onClick={() => toggleQFilter(f.key)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap', border: `1px solid ${on ? f.color : 'var(--border2)'}`, background: on ? f.color + '22' : 'var(--card2)', color: on ? f.color : 'var(--muted)' }}>{f.label}</button>);
              })}
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><I.Search /></div>
              <input ref={searchRef} className="input" style={{ paddingLeft: 32 }} placeholder="Search, ID, or range (1-50)... (Ctrl+F)" value={searchQuery} onChange={e => handleSearch(e.target.value)} />
              {searchQuery && <button onClick={() => { setSearchQuery(''); setDSearch(''); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><I.X /></button>}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[{ k: 'showOptions', l: 'Options' }, { k: 'showAnswer', l: 'Answers' }, { k: 'showExplanation', l: 'Explain' }, { k: 'showTags', l: 'Tags' }].map(s => (
                <button key={s.k} className="btn" onClick={() => { if (s.k === 'showAnswer') setLocalAnsOverrides({}); if (s.k === 'showOptions') setLocalOptOverrides({}); if (s.k === 'showExplanation') setLocalExpOverrides({}); setDisplaySettings(p => ({ ...p, [s.k]: !p[s.k] })); }} style={{ fontSize: 11, padding: '5px 9px', ...(displaySettings[s.k] ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : { opacity: .6 }) }}>
                  {displaySettings[s.k] ? <I.Eye /> : <I.EyeOff />} {s.l}
                </button>
              ))}
              <button className="btn" onClick={() => setCompact(v => !v)} style={{ fontSize: 11, padding: '5px 9px', ...(compact ? { background: 'var(--card2)' } : { opacity: .7 }) }}>{compact ? '⊡ Normal' : '⊟ Compact'}</button>
              <button className="btn" onClick={toggleCollapseAll} style={{ fontSize: 11, padding: '5px 9px' }}>{collapsedIds.size > 0 ? '↕ Expand' : '↕ Collapse'}</button>
              <button className="btn" onClick={() => setAutoCollapseDone(v => !v)} style={{ fontSize: 11, padding: '5px 9px', gap: 5, ...(autoCollapseDone ? { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' } : { opacity: .65 }) }}>{autoCollapseDone ? '↙ Auto-fold ✓' : '↙ Auto-fold'}</button>
              <button className="btn" onClick={() => { setBulkMode(v => !v); setSelectedBulk(new Set()); }} style={{ fontSize: 11, padding: '5px 9px', ...(bulkMode ? { background: 'var(--purple)', color: '#fff', borderColor: 'var(--purple)' } : { opacity: .75 }) }}>{bulkMode ? '☑ Bulk on' : '☑ Bulk'}</button>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={exportToText} style={{ fontSize: 11 }}><I.Copy /> Copy</button>
              <button className="btn" onClick={exportToPDF} disabled={isExporting} style={{ fontSize: 11 }}>{isExporting ? <I.Loader /> : <I.Download />} PDF</button>
              <button className="btn" onClick={exportToDocx} style={{ fontSize: 11 }}>📄 DOCX</button>
              <div style={{ width: 1, height: 20, background: 'var(--border2)', margin: '0 2px' }} />
              <button className="btn" onClick={() => { if (confirm(`Reset all progress for "${activeFile || 'this file'}"?\nThis clears done, favorites, notes, wrong counts, and collections for this file only.`)) resetFileData(); }} style={{ fontSize: 11, color: 'var(--yellow)', borderColor: 'var(--yellow)', opacity: .8 }}>↺ File</button>
              <button className="btn" onClick={() => { if (confirm('Reset ALL data for ALL files?\nThis cannot be undone.')) resetAllData(); }} style={{ fontSize: 11, color: 'var(--red)', borderColor: 'var(--red)', opacity: .8 }}>🗑 All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLECTION SETS PANEL ── */}
      {questions.length > 0 && (
        <div className="set-panel">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', height: 40, padding: '0 12px', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {TABS.map(tab => (
                  <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? tab.cls || 'active' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setActiveTab(tab.id); setActiveCollId(null); }}>
                    {tab.label}<span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: .8, background: 'rgba(255,255,255,.15)', padding: '1px 5px', borderRadius: 4 }}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{pct}%</span>
                <div className="pb" style={{ width: 80 }}><div className="pb-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--green)' : 'var(--primary)' }} /></div>
              </div>
            </div>
            {collectionSets.map(set => {
              const isOpen = activeSetId === set.id;
              const typeIcon = set.type === 'lesson' ? '📚' : set.type === 'numeric' ? '🔢' : '📁';
              const isUser = set.type === 'user';
              return (
                <div key={set.id} className="set-row">
                  <div className="set-label" style={{ color: isOpen ? 'var(--primary)' : 'var(--muted)' }} onClick={() => setActiveSetId(isOpen ? '__none__' : set.id)}>
                    <span style={{ fontSize: 13 }}>{typeIcon}</span>
                    {isUser ? (
                      <input defaultValue={set.name} onBlur={e => setCollectionSets(prev => prev.map(s => s.id !== set.id ? s : { ...s, name: e.target.value.trim() || s.name }))} onKeyDown={e => { e.key === 'Enter' && e.target.blur(); e.stopPropagation(); }} onClick={e => e.stopPropagation()} style={{ background: 'none', border: 'none', outline: 'none', fontWeight: 700, fontSize: 11, color: 'inherit', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '.07em', width: '80px', cursor: 'text' }} title="Click to rename" />
                    ) : (<span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>{set.name}</span>)}
                    <span style={{ fontSize: 9, marginLeft: 'auto' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div className="set-chips">
                      {set.colls.length === 0 && (<span style={{ fontSize: 11, color: 'var(--muted)', padding: '0 4px' }}>Empty — click ✎ to add collections</span>)}
                      {set.colls.map(c => {
                        const done = c.qIds.filter(id => completedIds.has(id)).length, total = c.qIds.length;
                        const pctC = total > 0 ? Math.round(done / total * 100) : 0;
                        const isActive = activeTab === 'Collection' && activeCollId === c.id;
                        return (
                          <button key={c.id} className={`coll-chip${isActive ? ' active' : ''}`} style={{ borderColor: isActive ? c.color : 'var(--border2)', background: isActive ? c.color + '22' : 'var(--card2)', color: isActive ? c.color : 'var(--muted)' }} onClick={() => { setActiveTab('Collection'); setActiveCollId(c.id); }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                            <span>{c.name}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: .7 }}>{done}/{total}</span>
                            {total > 0 && (<div className="coll-chip-prog"><div style={{ height: '100%', background: c.color, width: `${pctC}%`, borderRadius: 2, transition: 'width .4s' }} /></div>)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!isOpen && <div style={{ flex: 1 }} />}
                  <div className="set-actions">
                    {isUser && <>
                      <button className="set-action-btn" onClick={() => { setActiveSetId(set.id); setShowCollections(true); }}>✎ Edit</button>
                      {collectionSets.filter(s => s.type === 'user').length < 6 && (<button className="set-action-btn" onClick={() => { const id = 'set-user-' + Date.now(); setCollectionSets(prev => [...prev, { id, name: 'New Set', type: 'user', colls: [] }]); setActiveSetId(id); }}>+ Set</button>)}
                      {collectionSets.filter(s => s.type === 'user').length > 1 && (<button className="set-action-btn" style={{ color: 'var(--red)' }} onClick={() => { setCollectionSets(prev => prev.filter(s => s.id !== set.id)); setActiveSetId(collectionSets.find(s => s.type === 'user' && s.id !== set.id)?.id || 'set-lessons'); }}>✕</button>)}
                    </>}
                    {!isUser && (<button className="set-action-btn" onClick={() => { if (!questions.length) return; const sys = buildSystemSets(questions, availableLessons); const updated = sys.find(s => s.id === set.id); if (updated) setCollectionSets(prev => prev.map(s => s.id === set.id ? updated : s)); showToast(`↺ ${set.name} refreshed`); }}>↺ Reset</button>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '18px 20px', boxSizing: 'border-box' }}>
        {!isLoading && !fetchError && questions.length === 0 && (
          <div className={`upload-zone ${isDragOver ? 'drag' : ''} afu`} onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }} onClick={() => fileInputRef.current?.click()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Drop your question file here</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>or click to browse — supports .txt, .csv, .tsv, .json</div>
          </div>
        )}
        {isLoading && (<div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700, margin: '0 auto', paddingTop: 20 }}>{[...Array(6)].map((_, i) => <div key={i} className="shimmer" style={{ height: compact ? 55 : 85, borderRadius: 12 }} />)}</div>)}
        {fetchError && !isLoading && (<div style={{ textAlign: 'center', padding: 60 }} className="afu"><div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div><div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--red)' }}>Failed to load</div><div style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 400, margin: '0 auto 16px' }}>{fetchError}</div><button className="btn primary" onClick={() => fileInputRef.current?.click()}>Upload Manually</button></div>)}
        {!isLoading && !fetchError && questions.length > 0 && sessions.length > 0 && (
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Study activity (90d)</span>
            <StreakHeatmap sessions={sessions} />
            {streak > 0 && <span style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><I.Flame />{streak} day streak</span>}
          </div>
        )}
        {!isLoading && !fetchError && questions.length > 0 && (
          <>
            <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 12, fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Showing {visibleQuestions.length} of {questions.length}{!qFilters.has('all') && qFilters.size > 0 && (<span style={{ color: 'var(--primary)', marginLeft: 6 }}>[{Array.from(qFilters).join('+')}]</span>)}</span>
              {dSearch && <span>for "<b style={{ color: 'var(--text)' }}>{dSearch}</b>"</span>}
              {focusedIdx >= 0 && visibleQuestions[focusedIdx] && <span style={{ color: 'var(--primary)' }}>focused: Q{qNum(visibleQuestions[focusedIdx].id)} (J/K to navigate)</span>}
            </div>
            {visibleQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, border: '2px dashed var(--border2)', borderRadius: 16, color: 'var(--muted)' }} className="afu"><div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div><div style={{ fontWeight: 600, marginBottom: 4 }}>No questions match</div><div style={{ fontSize: 13 }}>Adjust search or filters</div></div>
            ) : (
              <>
                {bulkMode && (
                  <div className="bulk-bar">
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{selectedBulk.size} selected</span>
                    <button onClick={() => setSelectedBulk(new Set(visibleQuestions.map(q => q.id)))}>All {visibleQuestions.length}</button>
                    <button onClick={() => setSelectedBulk(new Set())} disabled={!selectedBulk.size}>Clear</button>
                    <div className="bulk-sep" />
                    <button onClick={bulkMarkDone} disabled={!selectedBulk.size}>✓ Mark Done</button>
                    <button onClick={bulkMarkWeak} disabled={!selectedBulk.size}>⚡ Mark Weak</button>
                    {collections.length > 0 && (
                      <div style={{ position: 'relative' }}>
                        <button disabled={!selectedBulk.size} onClick={e => { e.currentTarget.nextSibling.style.display = e.currentTarget.nextSibling.style.display === 'block' ? 'none' : 'block'; }}>📁 Add to… ▾</button>
                        <div style={{ display: 'none', position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 8, minWidth: 160, boxShadow: 'var(--shadow)', zIndex: 100 }}>
                          {collections.map(c => (<div key={c.id} onClick={() => { bulkAddToCollection(c.id); }} className="dd-item" style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />{c.name}</div>))}
                        </div>
                      </div>
                    )}
                    {activeCollId && (<button onClick={() => bulkRemoveFromColl(activeCollId)} disabled={!selectedBulk.size} style={{ background: 'rgba(240,96,88,.3)', borderColor: 'rgba(240,96,88,.5)' }}>🗑 Remove from collection</button>)}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => { setBulkMode(false); setSelectedBulk(new Set()); }}>✕ Exit</button>
                  </div>
                )}
                <div id="q-list">
                  {visibleQuestions.map((q, i) => {
                    const qCollections = qCollectionsMap[q.id] || [];
                    return (
                      <QuestionCard key={q.id} q={q}
                        isCollapsed={collapsedIds.has(q.id)} isFav={favIds.has(q.id)}
                        isDone={completedIds.has(q.id)} isPinned={pinnedIds.has(q.id)}
                        isWeak={weakIds.has(q.id)} srCard={srData[q.id]} isDue={isDue(srData[q.id])}
                        displaySettings={displaySettings} searchQ={dSearch}
                        onToggleCollapse={toggleCollapse} onToggleFav={toggleFav}
                        onToggleDone={toggleDone} onTogglePin={togglePin}
                        onOpenNote={qId => setNoteModal({ qId, question: q.question })}
                        noteText={notes[q.id] || ''} onOpenTag={qId => setTagModal({ qId, question: q.question })}
                        customTag={customTags[q.id] || ''}
                        compact={compact} collections={qCollections}
                        focused={focusedIdx === i} onFocusClick={() => setFocusedIdx(i)}
                        localAnsOverride={localAnsOverrides[q.id]}
                        onToggleLocalAns={toggleLocalAns}
                        localOptOverride={localOptOverrides[q.id]}
                        onToggleLocalOpt={toggleLocalOpt}
                        localExpOverride={localExpOverrides[q.id]}
                        onToggleLocalExp={toggleLocalExp}
                        bulkMode={bulkMode}
                        isBulkSelected={selectedBulk.has(q.id)}
                        onToggleBulk={toggleBulkSelect}
                        onJumpTag={jumpToTag}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* ── MODALS ── */}
      {showExamLauncher && <ExamLauncher questions={questions} collections={collections} completedIds={completedIds} wrongCounts={wrongCounts} onClose={() => setShowExamLauncher(false)} onStart={(pool) => { setExamCustomPool(pool); setPracticeMode('exam'); setShowPractice(true); setShowExamLauncher(false); }} />}
      {showReport && <ReportModal questions={questions} favIds={favIds} completedIds={completedIds} notes={notes} srData={srData} weakIds={weakIds} sessions={sessions} streak={streak} onClose={() => setShowReport(false)} />}
      {showPractice && (<PracticeMode questions={practiceMode === 'wrong' ? wrongPool : practiceMode === 'exam' ? (examCustomPool || practicePool.slice(0, 40)) : practicePool} mode={practiceMode} onClose={() => { setShowPractice(false); setExamCustomPool(null); }} onRateSR={rateSR} weakIds={weakIds} onAddWrong={addWrong} onMarkDone={markDone} onMarkWeak={markWeak} />)}
      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
      {showNarration && <NarrationMode questions={visibleQuestions} displaySettings={displaySettings} favIds={favIds} completedIds={completedIds} onToggleFav={toggleFav} onToggleDone={toggleDone} onClose={() => setShowNarration(false)} />}
      {showKnowledgeMap && <KnowledgeMap questions={questions} completedIds={completedIds} favIds={favIds} weakIds={weakIds} customTags={customTags} onClose={() => setShowKnowledgeMap(false)} />}
      {showTVLauncher && <TVLauncher questions={questions} collections={collections} availableLessons={availableLessons} allTags={allTags} completedIds={completedIds} favIds={favIds} weakIds={weakIds} tvHistory={tvHistory} onSaveHistory={(entry) => setTvHistory(prev => [entry, ...prev.filter(h => h.id !== entry.id)].slice(0, 20))} onDeleteHistory={(id) => setTvHistory(prev => prev.filter(h => h.id !== id))} onRenameHistory={(id, name) => setTvHistory(prev => prev.map(h => h.id === id ? { ...h, name } : h))} onStart={(sess) => { setTvSession(sess); setShowTVLauncher(false); }} onClose={() => setShowTVLauncher(false)} />}
      {tvSession && <TVPlayer session={tvSession} favIds={favIds} completedIds={completedIds} onToggleFav={toggleFav} onToggleDone={toggleDone} onClose={() => setTvSession(null)} />}
      {showCollections && (() => {
        const userSets = collectionSets.filter(s => s.type === 'user');
        const editSet = userSets.find(s => s.id === activeSetId) || userSets[0];
        if (!editSet) return null;
        const sysSets = collectionSets.filter(s => s.type !== 'user');
        return <CollectionsModal questions={questions} collections={editSet.colls} setName={editSet.name} systemSets={sysSets} onSave={(newColls, newName, silent) => { setCollectionSets(prev => prev.map(s => s.id !== editSet.id ? s : { ...s, colls: newColls, name: newName || s.name })); if (!silent) { setShowCollections(false); showToast('Collections saved'); } }} onClose={() => setShowCollections(false)} pinnedIds={pinnedIds} favIds={favIds} completedIds={completedIds} wrongIds={new Set(Object.keys(wrongCounts))} srData={srData} weakIds={weakIds} />;
      })()}
      {noteModal && <NoteModal qId={noteModal.qId} question={noteModal.question} noteText={notes[noteModal.qId] || ''} onSave={saveNote} onClose={() => setNoteModal(null)} />}
      {tagModal && <TagEditModal qId={tagModal.qId} question={tagModal.question} currentTag={customTags[tagModal.qId] || ''} onSave={saveCustomTag} onClose={() => setTagModal(null)} />}

      {/* ── TOAST ── */}
      {toast && (
        <div className="toast" style={{ background: toast.type === 'error' ? 'var(--red)' : toast.type === 'warn' ? 'var(--yellow)' : 'var(--green)', color: '#fff' }}>
          <span style={{ flex: 1 }}>{toast.type === 'error' ? '⚠ ' : toast.type === 'warn' ? '⚠ ' : '✓ '}{toast.msg}</span>
          {toast.undoFn && (<button className="toast-undo-btn" onClick={() => { toast.undoFn(); dismissToast(); }}>↩ Undo</button>)}
          <button className="toast-x" onClick={dismissToast} title="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

