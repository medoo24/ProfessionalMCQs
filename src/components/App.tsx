// ═══════════════════════════════════════════════════════
// App.tsx — Main application root component
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Question,
  Collection,
  CollectionSet,
  DisplaySettings,
  StudySession,
  ToastState,
  ToastType,
  TVHistoryEntry,
  TVSession
} from '../types';
import { THEMES } from '../config';
import { qNum } from '../parser';
import {
  FIREBASE_CONFIGURED,
  initFirebase,
  onAuthChange,
  signOutUser
} from '../firebase';
import { load, save, pushToCloud } from '../storage';
import { sm2, isDue } from '../sm2';
import { exportToText, exportToDocx, exportToPDF } from '../utils/exportUtils';

import { useQuestionBank } from '../hooks/useQuestionBank';
import { useFilters } from '../hooks/useFilters';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

import { I } from './Icons';
import { ThemePicker } from './ThemePicker';
import { QuestionCard } from './QuestionCard';
import { FileFilterPanel, LessonFilterPanel, TagFilterPanel } from './FilterPanels';
import { StreakHeatmap } from './StreakHeatmap';
import { NoteModal } from './Modals/NoteModal';
import { TagEditModal } from './Modals/TagEditModal';
import { ShortcutsPanel } from './ShortcutsPanel';
import { CollectionsModal } from './CollectionsModal';
import { ReportModal } from './ReportModal';
import { PracticeMode } from './PracticeMode';
import { ExamLauncher } from './ExamLauncher';
import { NarrationMode } from './NarrationMode';
import { KnowledgeMap, TVLauncher, TVPlayer } from './TVMode';
import { LoginPage } from './Auth/LoginPage';
import { UserMenu } from './Auth/UserMenu';

export function App() {
  // ── Auth State ──
  const [authUser, setAuthUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState<boolean>(!FIREBASE_CONFIGURED);
  const [offlineBypass, setOfflineBypass] = useState<boolean>(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'local' | 'idle' | 'syncing' | 'error' | 'offline'>('local');
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  // ── Toast State ──
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = useCallback((msg: string, type: ToastType = 'success', undoFn: (() => void) | null = null) => {
    clearTimeout(toastTimerRef.current);
    setToast({ msg, type, undoFn });
    toastTimerRef.current = setTimeout(() => setToast(null), undoFn ? 5000 : 3000);
  }, []);

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // ── Question Bank Hook ──
  const {
    availableFiles,
    selectedFiles,
    activeFile,
    fileKey,
    questions,
    availableLessons,
    isLoading,
    fetchError,
    filesCountMap,
    favIds,
    setFavIds,
    completedIds,
    setCompletedIds,
    pinnedIds,
    setPinnedIds,
    notes,
    setNotes,
    customTags,
    setCustomTags,
    srData,
    setSrData,
    wrongCounts,
    setWrongCounts,
    collectionSets,
    setCollectionSets,
    activeSetId,
    setActiveSetId,
    toggleFileSelect,
    selectAllFiles,
    clearAllFiles,
    handleFileUploads,
    resetFileData,
    resetAllData,
    buildSystemSets,
    performCloudSync
  } = useQuestionBank({
    authUser,
    showToast,
    setSyncStatus,
    setLastSynced
  });

  // ── Derived Data ──
  const weakIds = useMemo(() => new Set(Object.entries(wrongCounts).filter(([, c]) => c >= 3).map(([id]) => id)), [wrongCounts]);
  const collections = useMemo(() => collectionSets.flatMap(s => s.colls), [collectionSets]);
  const qCollectionsMap = useMemo(() => {
    const map: Record<string, Collection[]> = {};
    collections.forEach(c => {
      c.qIds.forEach(qId => {
        if (!map[qId]) map[qId] = [];
        map[qId].push(c);
      });
    });
    return map;
  }, [collections]);
  const srDueCount = useMemo(() => questions.filter(q => isDue(srData[q.id])).length, [questions, srData]);

  // ── Filters Hook ──
  const {
    searchQuery,
    setSearchQuery,
    dSearch,
    setDSearch,
    handleSearch,
    clearSearch,
    searchRef,
    activeTab,
    setActiveTab,
    activeCollId,
    setActiveCollId,
    qFilters,
    toggleQFilter,
    selectedLessons,
    setSelectedLessons,
    toggleLesson,
    clearLessons,
    selectedTags,
    setSelectedTags,
    toggleTag,
    clearTags,
    jumpToTag,
    allTags,
    visibleQuestions
  } = useFilters({
    questions,
    customTags,
    pinnedIds,
    completedIds,
    favIds,
    weakIds,
    srData,
    collections
  });

  // ── Windowed Progressive Rendering for Smooth Mobile Performance ──
  const [renderLimit, setRenderLimit] = useState<number>(35);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRenderLimit(35);
  }, [activeFile, activeTab, activeCollId, searchQuery, selectedLessons, selectedTags, qFilters]);

  useEffect(() => {
    if (!loadMoreRef.current || renderLimit >= visibleQuestions.length) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0] && entries[0].isIntersecting) {
          setRenderLimit(prev => Math.min(prev + 30, visibleQuestions.length));
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [renderLimit, visibleQuestions.length]);

  const renderedQuestions = useMemo(() => {
    return visibleQuestions.slice(0, renderLimit);
  }, [visibleQuestions, renderLimit]);

  // ── UI Settings ──
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() =>
    load('display', { showOptions: true, showAnswer: true, showExplanation: true, showTags: true })
  );
  const [compact, setCompact] = useState<boolean>(() => load('compact', false));
  const [theme, setTheme] = useState<string>(() => load('theme', 'dark'));
  const [autoCollapseDone, setAutoCollapseDone] = useState<boolean>(() => load('autoCollapseDone', false));

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [isDragOver, setIsDragOver] = useState(false);

  const [fileDDOpen, setFileDDOpen] = useState(false);
  const [lessonDDOpen, setLessonDDOpen] = useState(false);
  const [tagDDOpen, setTagDDOpen] = useState(false);

  const fileDDRef = useRef<HTMLDivElement>(null);
  const lessonDDRef = useRef<HTMLDivElement>(null);
  const tagDDRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [collapsedIds, setCollapsedIds] = useState<Set<string | number>>(new Set());
  const [localAnsOverrides, setLocalAnsOverrides] = useState<Record<string, boolean>>({});
  const [localOptOverrides, setLocalOptOverrides] = useState<Record<string, boolean>>({});
  const [localExpOverrides, setLocalExpOverrides] = useState<Record<string, boolean>>({});

  // ── Modals State ──
  const [showReport, setShowReport] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [practiceMode, setPracticeMode] = useState('practice');
  const [showExamLauncher, setShowExamLauncher] = useState(false);
  const [examCustomPool, setExamCustomPool] = useState<Question[] | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showTVLauncher, setShowTVLauncher] = useState(false);
  const [tvSession, setTvSession] = useState<TVSession | null>(null);
  const [tvHistory, setTvHistory] = useState<TVHistoryEntry[]>(() => load('tvHistory', []));
  const [showNarration, setShowNarration] = useState(false);
  const [showKnowledgeMap, setShowKnowledgeMap] = useState(false);
  const [noteModal, setNoteModal] = useState<{ qId: string; question: string } | null>(null);
  const [tagModal, setTagModal] = useState<{ qId: string; question: string } | null>(null);

  const [sessions, setSessions] = useState<StudySession[]>(() => load('sessions', []));
  const [streak, setStreak] = useState<number>(() => load('streak', 0));
  const sessionStartRef = useRef(Date.now());

  // ── Firebase Auth Init ──
  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    initFirebase();
    let settled = false;

    // Safety timeout: prevent offline app from hanging indefinitely on "Loading…"
    const timer = setTimeout(() => {
      if (!settled) {
        setAuthReady(true);
      }
    }, 2000);

    const unsub = onAuthChange(user => {
      settled = true;
      clearTimeout(timer);
      setAuthUser(user);
      setAuthReady(true);
      setSyncStatus(user && !user.isAnonymous ? 'idle' : 'local');
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setAuthUser(null);
    setSyncStatus('local');
    showToast('Signed out');
  };

  const handleSyncNow = async () => {
    if (!authUser || authUser.isAnonymous || !fileKey) return;
    setSyncStatus('syncing');
    await performCloudSync(authUser.uid, fileKey);
    setSyncStatus('idle');
    setLastSynced(Date.now());
  };

  // ── Outside Click Listeners ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fileDDRef.current && !fileDDRef.current.contains(e.target as Node)) setFileDDOpen(false);
      if (lessonDDRef.current && !lessonDDRef.current.contains(e.target as Node)) setLessonDDOpen(false);
      if (tagDDRef.current && !tagDDRef.current.contains(e.target as Node)) setTagDDOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Persistence Effects ──
  useEffect(() => save('display', displaySettings), [displaySettings]);
  useEffect(() => save('compact', compact), [compact]);
  useEffect(() => save('autoCollapseDone', autoCollapseDone), [autoCollapseDone]);
  useEffect(() => save('theme', theme), [theme]);
  useEffect(() => save('tvHistory', tvHistory), [tvHistory]);
  useEffect(() => save('sessions', sessions), [sessions]);

  // ── Theme Effect ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = document.body.className.replace(/\blive-\S+/g, '').trim();
    const td = THEMES.find(t => t.id === theme);
    if (td?.live) document.body.classList.add('live-' + theme);
  }, [theme]);

  // ── Reading Rail Effect ──
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      const fill = document.getElementById('read-fill');
      if (fill) fill.style.height = `${Math.min(100, pct)}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Streak Tracking ──
  useEffect(() => {
    const today = new Date().toDateString();
    const lastSession = sessions[sessions.length - 1];
    if (!lastSession || new Date(lastSession.date).toDateString() !== today) return;
    let s = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const daySet = new Set(sessions.map(x => new Date(x.date).toDateString()));
    while (daySet.has(d.toDateString())) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    setStreak(s);
    save('streak', s);
  }, [sessions]);

  // ── Session Recording ──
  useEffect(() => {
    const handleUnload = () => {
      const dur = Math.round((Date.now() - sessionStartRef.current) / 1000);
      if (dur < 30) return;
      const newSession = { date: Date.now(), duration: dur };
      const updated = [...load<StudySession[]>('sessions', []), newSession].slice(-200);
      save('sessions', updated);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // ── Action Toggles ──
  const toggleFav = useCallback((id: string | number) => {
    setFavIds(p => {
      const n = new Set(p);
      const strId = String(id);
      n.has(strId) ? n.delete(strId) : n.add(strId);
      return n;
    });
  }, [setFavIds]);

  const toggleDone = useCallback((id: string | number) => {
    const strId = String(id);
    setCompletedIds(prev => {
      const wasDone = prev.has(strId);
      const snap = new Set(prev);
      const next = new Set(prev);
      wasDone ? next.delete(strId) : next.add(strId);
      if (!wasDone && autoCollapseDone) {
        setCollapsedIds(c => new Set(c).add(id));
      }
      showToast(wasDone ? '↩ Unmarked Done' : '✓ Marked Done', wasDone ? 'warn' : 'success', () => setCompletedIds(snap));
      return next;
    });
  }, [autoCollapseDone, setCompletedIds, showToast]);

  const togglePin = useCallback((id: string | number) => {
    setPinnedIds(p => {
      const n = new Set(p);
      const strId = String(id);
      n.has(strId) ? n.delete(strId) : n.add(strId);
      return n;
    });
  }, [setPinnedIds]);

  const toggleCollapse = useCallback((id: string | number) => {
    setCollapsedIds(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleCollapseAll = useCallback(() => {
    setCollapsedIds(prev => (prev.size > 0 ? new Set() : new Set(questions.map(q => q.id))));
  }, [questions]);

  const toggleLocalAns = useCallback((qId: string | number) => {
    const k = String(qId);
    setLocalAnsOverrides(prev => {
      const cur = prev[k];
      if (cur === undefined) return { ...prev, [k]: true };
      if (cur === true) return { ...prev, [k]: false };
      const n = { ...prev };
      delete n[k];
      return n;
    });
  }, []);

  const toggleLocalOpt = useCallback((qId: string | number) => {
    const k = String(qId);
    setLocalOptOverrides(prev => {
      const cur = prev[k];
      if (cur === undefined) return { ...prev, [k]: true };
      if (cur === true) return { ...prev, [k]: false };
      const n = { ...prev };
      delete n[k];
      return n;
    });
  }, []);

  const toggleLocalExp = useCallback((qId: string | number) => {
    const k = String(qId);
    setLocalExpOverrides(prev => {
      const cur = prev[k];
      if (cur === undefined) return { ...prev, [k]: true };
      if (cur === true) return { ...prev, [k]: false };
      const n = { ...prev };
      delete n[k];
      return n;
    });
  }, []);

  const saveNote = useCallback((qId: string | number, text: string) => {
    setNotes(prev => ({ ...prev, [String(qId)]: text }));
  }, [setNotes]);

  const saveCustomTag = useCallback((qId: string | number, tag: string) => {
    setCustomTags(prev => ({ ...prev, [String(qId)]: tag }));
  }, [setCustomTags]);

  const rateSR = useCallback((qId: string | number, quality: number) => {
    const k = String(qId);
    setSrData(prev => ({ ...prev, [k]: sm2(prev[k], quality) }));
  }, [setSrData]);

  const addWrong = useCallback((qId: string | number) => {
    const k = String(qId);
    setWrongCounts(prev => ({ ...prev, [k]: (prev[k] || 0) + 1 }));
  }, [setWrongCounts]);

  const markDone = useCallback((qId: string | number) => {
    setCompletedIds(prev => new Set(prev).add(String(qId)));
  }, [setCompletedIds]);

  const markWeak = useCallback((qId: string | number) => {
    const k = String(qId);
    setWrongCounts(prev => {
      const snap = { ...prev };
      const next = { ...prev, [k]: Math.max((prev[k] || 0) + 1, 3) };
      showToast('⚡ Marked Weak', 'warn', () => setWrongCounts(snap));
      return next;
    });
  }, [setWrongCounts, showToast]);

  // ── Bulk Actions ──
  const toggleBulkSelect = useCallback((id: string | number) => {
    const strId = String(id);
    setSelectedBulk(p => {
      const n = new Set(p);
      n.has(strId) ? n.delete(strId) : n.add(strId);
      return n;
    });
  }, []);

  const bulkMarkDone = useCallback(() => {
    if (!selectedBulk.size) return;
    const snap = new Set(completedIds);
    const ids = new Set(selectedBulk);
    setCompletedIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => n.add(id));
      return n;
    });
    if (autoCollapseDone) {
      setCollapsedIds(prev => {
        const n = new Set(prev);
        ids.forEach(id => n.add(id));
        return n;
      });
    }
    showToast(`✓ ${ids.size} marked Done`, 'success', () => setCompletedIds(snap));
    setSelectedBulk(new Set());
  }, [selectedBulk, completedIds, autoCollapseDone, setCompletedIds, showToast]);

  const bulkMarkWeak = useCallback(() => {
    if (!selectedBulk.size) return;
    const snap = { ...wrongCounts };
    const ids = new Set(selectedBulk);
    setWrongCounts(prev => {
      const n = { ...prev };
      ids.forEach(id => {
        n[id] = Math.max((n[id] || 0) + 1, 3);
      });
      return n;
    });
    showToast(`⚡ ${ids.size} marked Weak`, 'warn', () => setWrongCounts(snap));
    setSelectedBulk(new Set());
  }, [selectedBulk, wrongCounts, setWrongCounts, showToast]);

  const bulkAddToCollection = useCallback((collId: string) => {
    if (!selectedBulk.size) return;
    const ids = new Set(selectedBulk);
    setCollectionSets(prev =>
      prev.map(s => ({
        ...s,
        colls: s.colls.map(c => (c.id !== collId ? c : { ...c, qIds: Array.from(new Set([...c.qIds, ...ids])) }))
      }))
    );
    const col = collections.find(c => c.id === collId);
    showToast(`📁 ${ids.size} added to "${col?.name || ''}"`, 'success');
    setSelectedBulk(new Set());
  }, [selectedBulk, collections, setCollectionSets, showToast]);

  const bulkRemoveFromColl = useCallback((collId: string) => {
    if (!selectedBulk.size || !collId) return;
    const ids = new Set(selectedBulk);
    setCollectionSets(prev =>
      prev.map(s => ({
        ...s,
        colls: s.colls.map(c => (c.id !== collId ? c : { ...c, qIds: c.qIds.filter(id => !ids.has(String(id))) }))
      }))
    );
    showToast(`🗑 ${ids.size} removed from collection`, 'warn');
    setSelectedBulk(new Set());
  }, [selectedBulk, setCollectionSets, showToast]);

  // ── Keyboard Shortcuts Hook ──
  useKeyboardShortcuts({
    questions,
    visibleQuestions,
    focusedIdx,
    setFocusedIdx,
    displaySettings,
    setDisplaySettings,
    setLocalAnsOverrides,
    setCompact,
    setTheme,
    showToast,
    toggleCollapse: id => toggleCollapse(id),
    toggleFav: id => toggleFav(id),
    toggleDone: id => toggleDone(id),
    togglePin: id => togglePin(id),
    setNoteModal,
    setShowShortcuts,
    setShowReport,
    setShowPractice,
    setPracticeMode,
    setShowExamLauncher,
    searchRef,
    clearSearch,
    toastTimerRef,
    setToast
  });

  // ── Export Handlers ──
  const titleLabel =
    activeTab === 'Collection' && activeCollId
      ? collections.find(c => c.id === activeCollId)?.name || 'Collection'
      : activeFile || 'Questions';

  const handleExportToText = () => {
    exportToText({
      visibleQuestions,
      displaySettings,
      customTags,
      notes,
      showToast
    });
  };

  const handleExportToDocx = () => {
    exportToDocx({
      visibleQuestions,
      displaySettings,
      customTags,
      notes,
      completedIds,
      weakIds,
      favIds,
      titleLabel,
      showToast
    });
  };

  const handleExportToPDF = () => {
    exportToPDF({
      visibleQuestions,
      displaySettings,
      customTags,
      notes,
      completedIds,
      weakIds,
      favIds,
      titleLabel,
      showToast,
      setIsExporting
    });
  };

  // ── Tabs & Practice Pools ──
  const TABS = [
    { id: 'All', label: 'All', count: questions.length, cls: '' },
    { id: 'SR Due', label: 'SR Due', count: srDueCount, cls: 'act-p' }
  ];
  const practicePool = useMemo(() => questions.filter(q => q.options && q.options.length > 0), [questions]);
  const wrongPool = useMemo(
    () => questions.filter(q => wrongCounts[q.id] > 0 && q.options && q.options.length > 0),
    [questions, wrongCounts]
  );
  const pct = questions.length > 0 ? Math.round((completedIds.size / questions.length) * 100) : 0;

  // ── Auth Loading or Required Check ──
  if (FIREBASE_CONFIGURED && !authReady && !offlineBypass) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--muted)', fontSize: 14, gap: 14 }}>
        <div>Loading…</div>
        <button className="btn" onClick={() => setOfflineBypass(true)} style={{ fontSize: 12 }}>
          📱 Launch in Offline Mode
        </button>
      </div>
    );
  }
  if (FIREBASE_CONFIGURED && authReady && !authUser && !offlineBypass) {
    return <LoginPage onContinueOffline={() => setOfflineBypass(true)} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── HEADER ── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky',
        top: 0, zIndex: 200, padding: '0 20px', height: 58, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, background: 'var(--primary)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 15
          }}>Q</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.02em' }}>QnA Hub</span>
          {streak > 0 && (
            <span title={`${streak} day streak!`} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, color: 'var(--yellow)' }}>
              <I.Flame />×{streak}
            </span>
          )}
        </div>

        {/* Middle: Multi-Bank Selector & Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, margin: '0 12px', maxWidth: 480 }}>
          <div ref={fileDDRef} style={{ position: 'relative', flex: 1, minWidth: 170 }}>
            <button
              className="btn"
              onClick={() => setFileDDOpen(v => !v)}
              style={{ width: '100%', justifyContent: 'space-between', padding: '6px 10px', fontSize: 12, gap: 6 }}
              title="Select Question Bank Files"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <I.Folder />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                  {selectedFiles.size === 1
                    ? Array.from(selectedFiles)[0].split('/').pop()?.replace(/\.(json|txt|csv|tsv)$/i, '')
                    : selectedFiles.size === availableFiles.length
                      ? `All Banks (${selectedFiles.size})`
                      : `${selectedFiles.size} Banks Mixed`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {questions.length > 0 && (
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: 0.8, background: 'var(--card2)', padding: '1px 5px', borderRadius: 4 }}>
                    {questions.length} Qs
                  </span>
                )}
                <I.Cd />
              </div>
            </button>
            {fileDDOpen && (
              <FileFilterPanel
                availableFiles={availableFiles}
                selectedFiles={selectedFiles}
                onToggle={toggleFileSelect}
                onSelectAll={selectAllFiles}
                onClearAll={clearAllFiles}
                onUploadClick={() => {
                  setFileDDOpen(false);
                  fileInputRef.current?.click();
                }}
                filesCountMap={filesCountMap}
              />
            )}
          </div>
          <button className="btn" onClick={() => fileInputRef.current?.click()} title="Upload question bank file(s)">
            <I.Upload /><span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.csv,.tsv,.json"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUploads(e.target.files);
                e.target.value = '';
              }
            }}
          />
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {questions.length > 0 && (
            <>
              <button className="btn ghost" onClick={() => setShowCollections(true)} title="Collections"><I.Folder /></button>
              <button className="btn ghost" onClick={() => setShowReport(true)} title="Report (Ctrl+R)"><I.Chart /></button>
              <button className="btn ghost" onClick={() => setShowKnowledgeMap(true)} title="Knowledge Map">🗺️</button>
              {practicePool.length > 0 && (
                <div style={{ position: 'relative', display: 'flex', gap: 4 }}>
                  <button className="btn primary" onClick={() => { setPracticeMode('practice'); setShowPractice(true); }} style={{ padding: '6px 10px' }}>
                    <I.Brain /> Practice
                  </button>
                  <button className="btn primary" onClick={() => setShowExamLauncher(true)} style={{ padding: '6px 10px', fontSize: 11 }}>
                    📝 Exam
                  </button>
                  {wrongPool.length > 0 && (
                    <button className="btn danger" onClick={() => { setPracticeMode('wrong'); setShowPractice(true); }} style={{ padding: '6px 10px', fontSize: 11 }}>
                      ❌ Wrong
                    </button>
                  )}
                  <button className="btn" onClick={() => setShowTVLauncher(true)} style={{ padding: '6px 10px', fontSize: 11 }} title="TV Show Mode">
                    📺 TV
                  </button>
                  <button className="btn" onClick={() => setShowNarration(true)} style={{ padding: '6px 10px', fontSize: 11 }} title="Narration">
                    🔊 Listen
                  </button>
                </div>
              )}
            </>
          )}
          <button className="btn ghost" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (Ctrl+K)"><I.Keyboard /></button>
          <ThemePicker theme={theme} setTheme={setTheme} />
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
              {lessonDDOpen && (
                <LessonFilterPanel
                  availableLessons={availableLessons}
                  selectedLessons={selectedLessons}
                  onToggle={toggleLesson}
                  onClear={() => { setSelectedLessons(new Set()); setLessonDDOpen(false); }}
                />
              )}
            </div>
            {allTags.tags.length > 0 && (
              <div ref={tagDDRef} style={{ position: 'relative' }}>
                <button className="btn" onClick={() => { setTagDDOpen(v => !v); setLessonDDOpen(false); }}>
                  <I.Tag />{selectedTags.size === 0 ? 'All Tags' : `${selectedTags.size} tag(s)`}<I.Cd />
                </button>
                {tagDDOpen && (
                  <TagFilterPanel
                    allTags={allTags.tags}
                    restTags={allTags.restTags}
                    selectedTags={selectedTags}
                    onToggle={toggleTag}
                    onClear={() => { setSelectedTags(new Set()); setTagDDOpen(false); }}
                    questions={questions}
                    customTags={customTags}
                  />
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All', color: 'var(--muted)' },
                { key: 'unsolved', label: 'Unsolved', color: 'var(--yellow)' },
                { key: 'done', label: 'Done', color: 'var(--green)' },
                { key: 'fav', label: '★ Fav', color: 'var(--yellow)' },
                { key: 'weak', label: '⚡ Weak', color: 'var(--red)' }
              ].map(f => {
                const on = qFilters.has(f.key) || (f.key === 'all' && qFilters.has('all'));
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleQFilter(f.key)}
                    style={{
                      padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                      border: `1px solid ${on ? f.color : 'var(--border2)'}`,
                      background: on ? f.color + '22' : 'var(--card2)',
                      color: on ? f.color : 'var(--muted)'
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
                <I.Search />
              </div>
              <input
                ref={searchRef}
                className="input"
                style={{ paddingLeft: 32 }}
                placeholder="Search, ID, or range (1-50)... (Ctrl+F)"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setDSearch(''); }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                >
                  <I.X />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[
                { k: 'showOptions', l: 'Options' },
                { k: 'showAnswer', l: 'Answers' },
                { k: 'showExplanation', l: 'Explain' },
                { k: 'showTags', l: 'Tags' }
              ].map(s => (
                <button
                  key={s.k}
                  className="btn"
                  onClick={() => {
                    if (s.k === 'showAnswer') setLocalAnsOverrides({});
                    if (s.k === 'showOptions') setLocalOptOverrides({});
                    if (s.k === 'showExplanation') setLocalExpOverrides({});
                    setDisplaySettings(p => ({ ...p, [s.k]: !p[s.k as keyof DisplaySettings] }));
                  }}
                  style={{
                    fontSize: 11, padding: '5px 9px',
                    ...(displaySettings[s.k as keyof DisplaySettings]
                      ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                      : { opacity: 0.6 })
                  }}
                >
                  {displaySettings[s.k as keyof DisplaySettings] ? <I.Eye /> : <I.EyeOff />} {s.l}
                </button>
              ))}
              <button className="btn" onClick={() => setCompact(v => !v)} style={{ fontSize: 11, padding: '5px 9px', ...(compact ? { background: 'var(--card2)' } : { opacity: 0.7 }) }}>
                {compact ? '⊡ Normal' : '⊟ Compact'}
              </button>
              <button className="btn" onClick={toggleCollapseAll} style={{ fontSize: 11, padding: '5px 9px' }}>
                {collapsedIds.size > 0 ? '↕ Expand' : '↕ Collapse'}
              </button>
              <button
                className="btn"
                onClick={() => setAutoCollapseDone(v => !v)}
                style={{ fontSize: 11, padding: '5px 9px', gap: 5, ...(autoCollapseDone ? { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' } : { opacity: 0.65 }) }}
              >
                {autoCollapseDone ? '↙ Auto-fold ✓' : '↙ Auto-fold'}
              </button>
              <button
                className="btn"
                onClick={() => { setBulkMode(v => !v); setSelectedBulk(new Set()); }}
                style={{ fontSize: 11, padding: '5px 9px', ...(bulkMode ? { background: 'var(--purple)', color: '#fff', borderColor: 'var(--purple)' } : { opacity: 0.75 }) }}
              >
                {bulkMode ? '☑ Bulk on' : '☑ Bulk'}
              </button>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={handleExportToText} style={{ fontSize: 11 }}>
                <I.Copy /> Copy
              </button>
              <button className="btn" onClick={handleExportToPDF} disabled={isExporting} style={{ fontSize: 11 }}>
                {isExporting ? <I.Loader /> : <I.Download />} PDF
              </button>
              <button className="btn" onClick={handleExportToDocx} style={{ fontSize: 11 }}>
                📄 DOCX
              </button>
              <div style={{ width: 1, height: 20, background: 'var(--border2)', margin: '0 2px' }} />
              <button
                className="btn"
                onClick={() => {
                  if (confirm(`Reset all progress for "${activeFile || 'this file'}"?\nThis clears done, favorites, notes, wrong counts, and collections for this file only.`)) {
                    resetFileData();
                  }
                }}
                style={{ fontSize: 11, color: 'var(--yellow)', borderColor: 'var(--yellow)', opacity: 0.8 }}
              >
                ↺ File
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (confirm('Reset ALL data for ALL files?\nThis cannot be undone.')) {
                    resetAllData();
                  }
                }}
                style={{ fontSize: 11, color: 'var(--red)', borderColor: 'var(--red)', opacity: 0.8 }}
              >
                🗑 All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLECTION SETS PANEL ── */}
      {questions.length > 0 && (
        <div className="set-panel">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', height: 40, padding: '0 12px', gap: 8
            }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? tab.cls || 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => { setActiveTab(tab.id); setActiveCollId(null); }}
                  >
                    {tab.label}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.8, background: 'rgba(255,255,255,.15)', padding: '1px 5px', borderRadius: 4 }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{pct}%</span>
                <div className="pb" style={{ width: 80 }}>
                  <div className="pb-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--green)' : 'var(--primary)' }} />
                </div>
              </div>
            </div>
            {collectionSets.map(set => {
              const isOpen = activeSetId === set.id;
              const typeIcon = set.type === 'lesson' ? '📚' : set.type === 'numeric' ? '🔢' : '📁 ';
              const isUser = set.type === 'user';
              return (
                <div key={set.id} className="set-row">
                  <div
                    className="set-label"
                    style={{ color: isOpen ? 'var(--primary)' : 'var(--muted)' }}
                    onClick={() => setActiveSetId(isOpen ? '__none__' : set.id)}
                  >
                    <span style={{ fontSize: 13 }}>{typeIcon}</span>
                    {isUser ? (
                      <input
                        defaultValue={set.name}
                        onBlur={e => setCollectionSets(prev => prev.map(s => (s.id !== set.id ? s : { ...s, name: e.target.value.trim() || s.name })))}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); e.stopPropagation(); }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          background: 'none', border: 'none', outline: 'none', fontWeight: 700, fontSize: 11,
                          color: 'inherit', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '.07em',
                          width: '80px', cursor: 'text'
                        }}
                        title="Click to rename"
                      />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>{set.name}</span>
                    )}
                    <span style={{ fontSize: 9, marginLeft: 'auto' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div className="set-chips">
                      {set.colls.length === 0 && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', padding: '0 4px' }}>Empty — click ✎ to add collections</span>
                      )}
                      {set.colls.map(c => {
                        const done = c.qIds.filter(id => completedIds.has(String(id))).length;
                        const total = c.qIds.length;
                        const pctC = total > 0 ? Math.round((done / total) * 100) : 0;
                        const isActive = activeTab === 'Collection' && activeCollId === c.id;
                        return (
                          <button
                            key={c.id}
                            className={`coll-chip${isActive ? ' active' : ''}`}
                            style={{
                              borderColor: isActive ? c.color : 'var(--border2)',
                              background: isActive ? c.color + '22' : 'var(--card2)',
                              color: isActive ? c.color : 'var(--muted)'
                            }}
                            onClick={() => { setActiveTab('Collection'); setActiveCollId(c.id); }}
                          >
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                            <span>{c.name}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.7 }}>{done}/{total}</span>
                            {total > 0 && (
                              <div className="coll-chip-prog">
                                <div style={{ height: '100%', background: c.color, width: `${pctC}%`, borderRadius: 2, transition: 'width .4s' }} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!isOpen && <div style={{ flex: 1 }} />}
                  <div className="set-actions">
                    {isUser && (
                      <>
                        <button className="set-action-btn" onClick={() => { setActiveSetId(set.id); setShowCollections(true); }}>✎ Edit</button>
                        {collectionSets.filter(s => s.type === 'user').length < 6 && (
                          <button
                            className="set-action-btn"
                            onClick={() => {
                              const id = 'set-user-' + Date.now();
                              setCollectionSets(prev => [...prev, { id, name: 'New Set', type: 'user', colls: [] }]);
                              setActiveSetId(id);
                            }}
                          >
                            + Set
                          </button>
                        )}
                        {collectionSets.filter(s => s.type === 'user').length > 1 && (
                          <button
                            className="set-action-btn"
                            style={{ color: 'var(--red)' }}
                            onClick={() => {
                              setCollectionSets(prev => prev.filter(s => s.id !== set.id));
                              setActiveSetId(collectionSets.find(s => s.type === 'user' && s.id !== set.id)?.id || 'set-lessons');
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </>
                    )}
                    {!isUser && (
                      <button
                        className="set-action-btn"
                        onClick={() => {
                          if (!questions.length) return;
                          const sys = buildSystemSets(questions, availableLessons);
                          const updated = sys.find(s => s.id === set.id);
                          if (updated) {
                            setCollectionSets(prev => prev.map(s => (s.id === set.id ? updated : s)));
                          }
                          showToast(`↺ ${set.name} refreshed`);
                        }}
                      >
                        ↺ Reset
                      </button>
                    )}
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
          <div
            className={`upload-zone ${isDragOver ? 'drag' : ''} afu`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragOver(false);
              const files = Array.from(e.dataTransfer.files || []);
              if (files.length > 0) handleFileUploads(files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Drop your question file(s) here</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>or click to browse — select one or multiple .txt, .csv, .tsv, .json files</div>
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700, margin: '0 auto', paddingTop: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shimmer" style={{ height: compact ? 55 : 85, borderRadius: 12 }} />
            ))}
          </div>
        )}

        {fetchError && !isLoading && (
          <div style={{ textAlign: 'center', padding: 60 }} className="afu">
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--red)' }}>Failed to load</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 400, margin: '0 auto 16px' }}>{fetchError}</div>
            <button className="btn primary" onClick={() => fileInputRef.current?.click()}>Upload Manually</button>
          </div>
        )}

        {!isLoading && !fetchError && questions.length > 0 && sessions.length > 0 && (
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Study activity (90d)</span>
            <StreakHeatmap sessions={sessions} />
            {streak > 0 && (
              <span style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <I.Flame />{streak} day streak
              </span>
            )}
          </div>
        )}

        {!isLoading && !fetchError && questions.length > 0 && (
          <>
            <div style={{
              color: 'var(--muted)', fontSize: 11, marginBottom: 12, fontFamily: 'var(--mono)',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span>
                Showing {visibleQuestions.length} of {questions.length}
                {!qFilters.has('all') && qFilters.size > 0 && (
                  <span style={{ color: 'var(--primary)', marginLeft: 6 }}>[{Array.from(qFilters).join('+')}]</span>
                )}
              </span>
              {dSearch && (
                <span>
                  for "<b style={{ color: 'var(--text)' }}>{dSearch}</b>"
                </span>
              )}
              {focusedIdx >= 0 && visibleQuestions[focusedIdx] && (
                <span style={{ color: 'var(--primary)' }}>
                  focused: Q{qNum(visibleQuestions[focusedIdx].id)} (J/K to navigate)
                </span>
              )}
            </div>

            {visibleQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, border: '2px dashed var(--border2)', borderRadius: 16, color: 'var(--muted)' }} className="afu">
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No questions match</div>
                <div style={{ fontSize: 13 }}>Adjust search or filters</div>
              </div>
            ) : (
              <>
                {bulkMode && (
                  <div className="bulk-bar">
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{selectedBulk.size} selected</span>
                    <button onClick={() => setSelectedBulk(new Set(visibleQuestions.map(q => String(q.id))))}>All {visibleQuestions.length}</button>
                    <button onClick={() => setSelectedBulk(new Set())} disabled={!selectedBulk.size}>Clear</button>
                    <div className="bulk-sep" />
                    <button onClick={bulkMarkDone} disabled={!selectedBulk.size}>✓ Mark Done</button>
                    <button onClick={bulkMarkWeak} disabled={!selectedBulk.size}>⚡ Mark Weak</button>
                    {collections.length > 0 && (
                      <div style={{ position: 'relative' }}>
                        <button
                          disabled={!selectedBulk.size}
                          onClick={e => {
                            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (next) next.style.display = next.style.display === 'block' ? 'none' : 'block';
                          }}
                        >
                          📁 Add to… ▾
                        </button>
                        <div style={{
                          display: 'none', position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                          background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 8,
                          minWidth: 160, boxShadow: 'var(--shadow)', zIndex: 100
                        }}>
                          {collections.map(c => (
                            <div
                              key={c.id}
                              onClick={() => bulkAddToCollection(c.id)}
                              className="dd-item"
                              style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            >
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                              {c.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {activeCollId && (
                      <button onClick={() => bulkRemoveFromColl(activeCollId)} disabled={!selectedBulk.size} style={{ background: 'rgba(240,96,88,.3)', borderColor: 'rgba(240,96,88,.5)' }}>
                        🗑 Remove from collection
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => { setBulkMode(false); setSelectedBulk(new Set()); }}>✕ Exit</button>
                  </div>
                )}

                <div id="q-list">
                  {renderedQuestions.map((q, i) => {
                    const qCollections = qCollectionsMap[q.id] || [];
                    return (
                      <QuestionCard
                        key={q.id}
                        q={q}
                        isCollapsed={collapsedIds.has(q.id)}
                        isFav={favIds.has(String(q.id))}
                        isDone={completedIds.has(String(q.id))}
                        isPinned={pinnedIds.has(String(q.id))}
                        isWeak={weakIds.has(String(q.id))}
                        srCard={srData[q.id]}
                        isDue={isDue(srData[q.id])}
                        displaySettings={displaySettings}
                        searchQ={dSearch}
                        onToggleCollapse={() => toggleCollapse(q.id)}
                        onToggleFav={() => toggleFav(q.id)}
                        onToggleDone={() => toggleDone(q.id)}
                        onTogglePin={() => togglePin(q.id)}
                        onOpenNote={qId => setNoteModal({ qId: String(qId), question: q.question })}
                        noteText={notes[q.id] || ''}
                        onOpenTag={qId => setTagModal({ qId: String(qId), question: q.question })}
                        customTag={customTags[q.id] || ''}
                        compact={compact}
                        collections={qCollections}
                        focused={focusedIdx === i}
                        onFocusClick={() => setFocusedIdx(i)}
                        localAnsOverride={localAnsOverrides[q.id]}
                        onToggleLocalAns={() => toggleLocalAns(q.id)}
                        localOptOverride={localOptOverrides[q.id]}
                        onToggleLocalOpt={() => toggleLocalOpt(q.id)}
                        localExpOverride={localExpOverrides[q.id]}
                        onToggleLocalExp={() => toggleLocalExp(q.id)}
                        bulkMode={bulkMode}
                        isBulkSelected={selectedBulk.has(String(q.id))}
                        onToggleBulk={() => toggleBulkSelect(q.id)}
                        onJumpTag={jumpToTag}
                      />
                    );
                  })}

                  {renderLimit < visibleQuestions.length && (
                    <div
                      ref={loadMoreRef}
                      style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        color: 'var(--muted)',
                        fontSize: 13,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div>
                        Showing <strong>{renderedQuestions.length}</strong> of <strong>{visibleQuestions.length}</strong> questions
                      </div>
                      <button
                        className="btn"
                        onClick={() => setRenderLimit(prev => Math.min(prev + 40, visibleQuestions.length))}
                        style={{ fontSize: 13, padding: '8px 18px', background: 'var(--card2)' }}
                      >
                        ↓ Load More Questions
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* ── MODALS ── */}
      {showExamLauncher && (
        <ExamLauncher
          questions={questions}
          collections={collections}
          completedIds={completedIds}
          wrongCounts={wrongCounts}
          onClose={() => setShowExamLauncher(false)}
          onStart={pool => {
            setExamCustomPool(pool);
            setPracticeMode('exam');
            setShowPractice(true);
            setShowExamLauncher(false);
          }}
        />
      )}

      {showReport && (
        <ReportModal
          questions={questions}
          favIds={favIds}
          completedIds={completedIds}
          notes={notes}
          srData={srData}
          weakIds={weakIds}
          sessions={sessions}
          streak={streak}
          onClose={() => setShowReport(false)}
        />
      )}

      {showPractice && (
        <PracticeMode
          questions={
            practiceMode === 'wrong'
              ? wrongPool
              : practiceMode === 'exam'
                ? examCustomPool || practicePool.slice(0, 40)
                : practicePool
          }
          mode={practiceMode}
          onClose={() => {
            setShowPractice(false);
            setExamCustomPool(null);
          }}
          onRateSR={(id, q) => rateSR(id, q)}
          weakIds={weakIds}
          onAddWrong={id => addWrong(id)}
          onMarkDone={id => markDone(id)}
          onMarkWeak={id => markWeak(id)}
        />
      )}

      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}

      {showNarration && (
        <NarrationMode
          questions={questions}
          displaySettings={displaySettings}
          favIds={favIds}
          completedIds={completedIds}
          weakIds={weakIds}
          onToggleFav={id => toggleFav(id)}
          onToggleDone={id => toggleDone(id)}
          onClose={() => setShowNarration(false)}
        />
      )}

      {showKnowledgeMap && (
        <KnowledgeMap
          questions={questions}
          completedIds={completedIds}
          favIds={favIds}
          weakIds={weakIds}
          customTags={customTags}
          onClose={() => setShowKnowledgeMap(false)}
        />
      )}

      {showTVLauncher && (
        <TVLauncher
          questions={questions}
          collections={collections}
          availableLessons={availableLessons}
          allTags={allTags}
          completedIds={completedIds}
          favIds={favIds}
          weakIds={weakIds}
          tvHistory={tvHistory}
          onSaveHistory={entry => setTvHistory(prev => [entry, ...prev.filter(h => h.id !== entry.id)].slice(0, 20))}
          onDeleteHistory={id => setTvHistory(prev => prev.filter(h => h.id !== id))}
          onRenameHistory={(id, name) => setTvHistory(prev => prev.map(h => (h.id === id ? { ...h, name } : h)))}
          onStart={sess => {
            setTvSession(sess);
            setShowTVLauncher(false);
          }}
          onClose={() => setShowTVLauncher(false)}
        />
      )}

      {tvSession && (
        <TVPlayer
          session={tvSession}
          favIds={favIds}
          completedIds={completedIds}
          onToggleFav={id => toggleFav(id)}
          onToggleDone={id => toggleDone(id)}
          onClose={() => setTvSession(null)}
        />
      )}

      {showCollections && (() => {
        const userSets = collectionSets.filter(s => s.type === 'user');
        const editSet = userSets.find(s => s.id === activeSetId) || userSets[0];
        if (!editSet) return null;
        const sysSets = collectionSets.filter(s => s.type !== 'user');
        return (
          <CollectionsModal
            questions={questions}
            collections={editSet.colls}
            setName={editSet.name}
            systemSets={sysSets}
            onSave={(newColls, newName, silent) => {
              setCollectionSets(prev =>
                prev.map(s => (s.id !== editSet.id ? s : { ...s, colls: newColls, name: newName || s.name }))
              );
              if (!silent) {
                setShowCollections(false);
                showToast('Collections saved');
              }
            }}
            onClose={() => setShowCollections(false)}
            pinnedIds={pinnedIds}
            favIds={favIds}
            completedIds={completedIds}
            wrongIds={new Set(Object.keys(wrongCounts))}
            srData={srData}
            weakIds={weakIds}
          />
        );
      })()}

      {noteModal && (
        <NoteModal
          qId={noteModal.qId}
          question={noteModal.question}
          noteText={notes[noteModal.qId] || ''}
          onSave={(id, text) => saveNote(id, text)}
          onClose={() => setNoteModal(null)}
        />
      )}

      {tagModal && (
        <TagEditModal
          qId={tagModal.qId}
          question={tagModal.question}
          currentTag={customTags[tagModal.qId] || ''}
          onSave={(id, tag) => saveCustomTag(id, tag)}
          onClose={() => setTagModal(null)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div
          className="toast"
          style={{
            background: toast.type === 'error' ? 'var(--red)' : toast.type === 'warn' ? 'var(--yellow)' : 'var(--green)',
            color: '#fff'
          }}
        >
          <span style={{ flex: 1 }}>{toast.type === 'error' ? '⚠ ' : toast.type === 'warn' ? '⚠ ' : '✓ '}{toast.msg}</span>
          {toast.undoFn && (
            <button
              className="toast-undo-btn"
              onClick={() => {
                if (toast.undoFn) toast.undoFn();
                dismissToast();
              }}
            >
              ↩ Undo
            </button>
          )}
          <button className="toast-x" onClick={dismissToast} title="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}

export default App;
