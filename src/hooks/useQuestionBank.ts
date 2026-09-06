// ═══════════════════════════════════════════════════════
// useQuestionBank.ts — Question banks loading, multi-bank mixing,
// and partitioned local & cloud persistence
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { Question, SM2Card, CollectionSet, ToastType } from '../types';
import { AVAILABLE_FILES, PALETTE } from '../config';
import { parseTextData, fileKeyFrom } from '../parser';
import { load, save, clearFileData, clearAllQnaData, pushToCloud, pullFromCloud, syncWithCloud } from '../storage';
import { discoverDataFiles } from '../utils/fileDiscovery';

export interface UseQuestionBankProps {
  authUser: any;
  showToast: (msg: string, type?: ToastType, undoFn?: (() => void) | null) => void;
  setSyncStatus: (status: 'local' | 'idle' | 'syncing' | 'error' | 'offline') => void;
  setLastSynced: (time: number) => void;
  onClearFilters?: () => void;
}

export function useQuestionBank({
  authUser,
  showToast,
  setSyncStatus,
  setLastSynced,
  onClearFilters
}: UseQuestionBankProps) {
  const initFile = load('activeFile', AVAILABLE_FILES[0] || '');
  const initFk = fileKeyFrom(initFile || 'file');

  const [availableFiles, setAvailableFiles] = useState<string[]>(AVAILABLE_FILES);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(() => {
    const saved = load<string[] | null>('selectedFiles', null);
    if (saved && Array.isArray(saved) && saved.length) return new Set(saved);
    const single = load('activeFile', AVAILABLE_FILES[0] || '');
    return new Set(single ? [single] : [AVAILABLE_FILES[0]]);
  });

  const [activeFile, setActiveFile] = useState<string>(() => initFile);
  const [fileKey, setFileKey] = useState<string>(() => initFk);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [availableLessons, setAvailableLessons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filesCountMap, setFilesCountMap] = useState<Record<string, number>>({});

  // Per-file / active set data
  const [favIds, setFavIds] = useState<Set<string>>(() => new Set(load<string[]>('favs', [], initFk)));
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set(load<string[]>('done', [], initFk)));
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set(load<string[]>('pins', [], initFk)));
  const [notes, setNotes] = useState<Record<string, string>>(() => load('notes', {}, initFk));
  const [customTags, setCustomTags] = useState<Record<string, string>>(() => load('ctags', {}, initFk));
  const [srData, setSrData] = useState<Record<string, SM2Card>>(() => load('sr', {}, initFk));
  const [wrongCounts, setWrongCounts] = useState<Record<string, number>>(() => load('wrong', {}, initFk));

  const [collectionSets, setCollectionSets] = useState<CollectionSet[]>(() => {
    const saved = load<CollectionSet[] | null>('collectionSets', null, initFk);
    if (saved) return saved;
    const old = load<any[]>('collections', [], initFk);
    return [{ id: 'set-user-1', name: 'My Collections', type: 'user', colls: old }];
  });

  const [activeSetId, setActiveSetId] = useState<string>(() => {
    const saved = load<CollectionSet[] | null>('collectionSets', null, initFk);
    return saved && saved.length ? saved[0].id : 'set-user-1';
  });

  const uploadedFilesCache = useRef<Map<string, any>>(new Map());

  // Helper to build default system collections
  const buildSystemSets = (qs: Question[], lessons: string[]): CollectionSet[] => {
    let pi = 0;
    const lessonColls = (lessons || []).filter(l => l && l !== 'General').map(l => ({
      id: 'ls-' + l.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_'),
      name: l,
      color: PALETTE[pi++ % PALETTE.length],
      qIds: qs.filter(q => q.lesson === l).map(q => q.id)
    }));
    const generalQs = qs.filter(q => !q.lesson || q.lesson === 'General');
    if (generalQs.length) {
      lessonColls.push({ id: 'ls-General', name: 'General', color: '#8892a4', qIds: generalQs.map(q => q.id) });
    }

    const chunk = Math.ceil(qs.length / 10);
    const numericColls = Array.from({ length: 10 }, (_, i) => {
      const sl = qs.slice(i * chunk, (i + 1) * chunk);
      if (!sl.length) return null;
      return {
        id: `num-${i}`,
        name: `Part ${i + 1}`,
        color: PALETTE[(i * 3 + 7) % PALETTE.length],
        qIds: sl.map(q => q.id)
      };
    }).filter(Boolean) as any[];

    return [
      { id: 'set-lessons', name: 'By Lesson', type: 'lesson', colls: lessonColls },
      { id: 'set-numeric', name: 'By Part (10)', type: 'numeric', colls: numericColls }
    ];
  };

  // Discover data files on startup
  useEffect(() => {
    discoverDataFiles().then(files => {
      if (files && files.length) {
        setAvailableFiles(files);
      }
    });
  }, []);

  // Fetch or retrieve cached question file
  const fetchOrGetParsedFile = async (fileName: string) => {
    if (uploadedFilesCache.current.has(fileName)) {
      return uploadedFilesCache.current.get(fileName);
    }
    const url =
      fileName.startsWith('data/') ||
      fileName.startsWith('http://') ||
      fileName.startsWith('https://') ||
      fileName.startsWith('/')
        ? fileName
        : 'data/' + fileName;

    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    const fk = fileKeyFrom(fileName);
    const { parsed, lessons } = parseTextData(text, fk);
    const data = { fileName, fileKey: fk, parsed, lessons, text };
    uploadedFilesCache.current.set(fileName, data);
    setFilesCountMap(prev => ({ ...prev, [fileName]: parsed.length }));
    return data;
  };

  // Lazily populate question counts in idle time without blocking mobile startup
  useEffect(() => {
    let cancelled = false;
    let timerId: any = null;

    const scheduleNext = (index: number) => {
      if (cancelled || index >= availableFiles.length) return;
      const f = availableFiles[index];
      if (!filesCountMap[f] && !f.startsWith('Combined')) {
        timerId = setTimeout(() => {
          if (cancelled) return;
          fetchOrGetParsedFile(f)
            .catch(() => {})
            .finally(() => {
              if (!cancelled) {
                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                  (window as any).requestIdleCallback(() => scheduleNext(index + 1), { timeout: 2000 });
                } else {
                  scheduleNext(index + 1);
                }
              }
            });
        }, 1500);
      } else {
        scheduleNext(index + 1);
      }
    };

    scheduleNext(0);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [availableFiles]);

  // Load selected files (single or multi-bank)
  const loadSelectedFiles = async (filesSet: Set<string>) => {
    const list = Array.from(filesSet || []).filter(Boolean);
    if (!list.length) {
      if (availableFiles.length) {
        list.push(availableFiles[0]);
      } else {
        return;
      }
    }

    setIsLoading(true);
    setFetchError(null);
    if (onClearFilters) onClearFilters();

    try {
      const parsedResults = await Promise.all(list.map(f => fetchOrGetParsedFile(f)));

      const allParsed: Question[] = [];
      const lessonsSet = new Set<string>();
      const mergedFavs = new Set<string>();
      const mergedDone = new Set<string>();
      const mergedPins = new Set<string>();
      const mergedNotes: Record<string, string> = {};
      const mergedTags: Record<string, string> = {};
      const mergedSr: Record<string, SM2Card> = {};
      const mergedWrong: Record<string, number> = {};

      parsedResults.forEach(pf => {
        allParsed.push(...pf.parsed);
        pf.lessons.forEach((l: string) => lessonsSet.add(l));

        const fFavs = load<string[]>('favs', [], pf.fileKey) || [];
        fFavs.forEach(id => mergedFavs.add(id));
        const fDone = load<string[]>('done', [], pf.fileKey) || [];
        fDone.forEach(id => mergedDone.add(id));
        const fPins = load<string[]>('pins', [], pf.fileKey) || [];
        fPins.forEach(id => mergedPins.add(id));
        Object.assign(mergedNotes, load('notes', {}, pf.fileKey) || {});
        Object.assign(mergedTags, load('ctags', {}, pf.fileKey) || {});
        Object.assign(mergedSr, load('sr', {}, pf.fileKey) || {});
        Object.assign(mergedWrong, load('wrong', {}, pf.fileKey) || {});
      });

      const allLessons = Array.from(lessonsSet);
      const isSingle = parsedResults.length === 1;
      const effectiveFk = isSingle ? parsedResults[0].fileKey : 'mix_' + parsedResults.map(p => p.fileKey).join('_');
      const activeName = isSingle ? parsedResults[0].fileName : `Combined (${parsedResults.length} files)`;

      setFileKey(effectiveFk);
      setQuestions(allParsed);
      setAvailableLessons(allLessons);
      setActiveFile(activeName);
      save('activeFile', activeName);
      save('selectedFiles', list);

      setFavIds(mergedFavs);
      setCompletedIds(mergedDone);
      setPinnedIds(mergedPins);
      setNotes(mergedNotes);
      setCustomTags(mergedTags);
      setSrData(mergedSr);
      setWrongCounts(mergedWrong);

      const sys = buildSystemSets(allParsed, allLessons);
      const savedSets = load<CollectionSet[] | null>('collectionSets', null, effectiveFk);
      const userSets: CollectionSet[] = savedSets
        ? savedSets.filter(s => s.type === 'user')
        : [{ id: 'set-user-1', name: 'My Collections', type: 'user' as const, colls: [] }];
      setCollectionSets([...sys, ...userSets]);
      setActiveSetId('set-lessons');

      setIsLoading(false);
      showToast(
        isSingle
          ? `Loaded ${allParsed.length} questions from "${parsedResults[0].fileName.split('/').pop()}"`
          : `Loaded ${allParsed.length} questions from ${parsedResults.length} banks`
      );
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setFetchError(`Cannot load selected file(s). ${err.message}`);
    }
  };

  const loadFile = (fileName: string) => {
    const next = new Set([fileName]);
    setSelectedFiles(next);
    loadSelectedFiles(next);
  };

  const toggleFileSelect = (fileName: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        if (next.size <= 1) {
          showToast('At least one bank file must remain selected', 'warn');
          return prev;
        }
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      loadSelectedFiles(next);
      return next;
    });
  };

  const selectAllFiles = () => {
    const next = new Set(availableFiles);
    setSelectedFiles(next);
    loadSelectedFiles(next);
  };

  const clearAllFiles = () => {
    const next = new Set([availableFiles[0]]);
    setSelectedFiles(next);
    loadSelectedFiles(next);
  };

  const readFileAsync = (file: File): Promise<{ file: File; text: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve({ file, text: e.target?.result as string });
      reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
      reader.readAsText(file);
    });
  };

  const handleFileUploads = async (fileInput: FileList | File[]) => {
    if (!fileInput) return;
    const files = Array.isArray(fileInput) ? fileInput : Array.from(fileInput);
    if (!files.length) return;

    try {
      setIsLoading(true);
      const readResults = await Promise.all(files.map(readFileAsync));

      const newFileNames: string[] = [];
      readResults.forEach(({ file, text }) => {
        const fk = fileKeyFrom(file.name);
        const { parsed, lessons } = parseTextData(text, fk);
        uploadedFilesCache.current.set(file.name, { fileName: file.name, fileKey: fk, parsed, lessons, text });
        setFilesCountMap(prev => ({ ...prev, [file.name]: parsed.length }));
        newFileNames.push(file.name);
      });

      setAvailableFiles(prev => {
        const existing = new Set(prev);
        const toAdd = newFileNames.filter(n => !existing.has(n));
        return [...toAdd, ...prev];
      });

      const nextSelection = new Set([...selectedFiles, ...newFileNames]);
      setSelectedFiles(nextSelection);
      await loadSelectedFiles(nextSelection);
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setFetchError(`Failed to upload files: ${err.message}`);
    }
  };

  // Initial load
  useEffect(() => {
    const saved = load<string[] | null>('selectedFiles', null);
    const initialSet =
      saved && Array.isArray(saved) && saved.length
        ? new Set(saved)
        : new Set([load('activeFile', AVAILABLE_FILES[0] || '') || AVAILABLE_FILES[0]]);
    loadSelectedFiles(initialSet);
  }, []);

  // Cloud Sync state and handlers
  const syncInProgressRef = useRef(false);
  const isInitialSyncRef = useRef<Record<string, boolean>>({});
  const pushTimerRef = useRef<any>(null);

  const performCloudSync = useCallback(
    async (uid: string, targetFk?: string) => {
      const fk = targetFk || fileKey;
      if (!uid || !fk || syncInProgressRef.current) return;
      syncInProgressRef.current = true;
      setSyncStatus('syncing');

      try {
        const res = await syncWithCloud(uid, fk);
        if (res.success && res.mergedData) {
          const { done, favs, pins, notes: mNotes, ctags, sr, wrong, collectionSets: mSets } = res.mergedData;
          setCompletedIds(new Set(done));
          setFavIds(new Set(favs));
          setPinnedIds(new Set(pins));
          setNotes(mNotes || {});
          setCustomTags(ctags || {});
          setSrData(sr || {});
          setWrongCounts(wrong || {});
          if (mSets && mSets.length) {
            setCollectionSets(mSets);
          }
          setLastSynced(Date.now());
          setSyncStatus('idle');
          if (done.length > 0) {
            showToast(`☁ Synced! ${done.length} completed questions available.`);
          }
        } else {
          setSyncStatus('idle');
        }
      } catch (err: any) {
        console.warn('Sync error:', err);
        setSyncStatus('error');
      } finally {
        syncInProgressRef.current = false;
        isInitialSyncRef.current[fk] = true;
      }
    },
    [fileKey, setSyncStatus, setLastSynced, showToast]
  );

  // Automatically sync when user logs in or switches question bank
  useEffect(() => {
    if (authUser?.uid && !authUser.isAnonymous && fileKey) {
      performCloudSync(authUser.uid, fileKey);
    }
  }, [authUser?.uid, fileKey, performCloudSync]);

  // Partitioned status synchronization
  const syncPartition = useCallback(
    (key: string, data: any) => {
      save(key, data, fileKey);

      const sourceFks = new Set<string>();
      questions.forEach(q => {
        if (q.fileKey) sourceFks.add(q.fileKey);
        else if (q.id && q.id.includes('__')) sourceFks.add(q.id.split('__')[0]);
      });

      if (sourceFks.size > 0) {
        sourceFks.forEach(fk => {
          if (Array.isArray(data)) {
            const fileIds = data.filter(id => typeof id === 'string' && id.startsWith(fk + '__'));
            save(key, fileIds, fk);
          } else if (data && typeof data === 'object') {
            const fileMap: Record<string, any> = {};
            Object.entries(data).forEach(([id, val]) => {
              if (id.startsWith(fk + '__')) fileMap[id] = val;
            });
            save(key, fileMap, fk);
          }

          // Only push to cloud after initial sync has completed to prevent empty overwrites
          if (authUser?.uid && !authUser.isAnonymous && isInitialSyncRef.current[fk]) {
            clearTimeout(pushTimerRef.current);
            pushTimerRef.current = setTimeout(() => {
              pushToCloud(authUser.uid, fk).then(() => {
                setLastSynced(Date.now());
              });
            }, 1000);
          }
        });
      }
    },
    [fileKey, questions, authUser, setLastSynced]
  );

  useEffect(() => syncPartition('favs', Array.from(favIds)), [favIds, syncPartition]);
  useEffect(() => syncPartition('done', Array.from(completedIds)), [completedIds, syncPartition]);
  useEffect(() => syncPartition('pins', Array.from(pinnedIds)), [pinnedIds, syncPartition]);
  useEffect(() => syncPartition('notes', notes), [notes, syncPartition]);
  useEffect(() => syncPartition('ctags', customTags), [customTags, syncPartition]);
  useEffect(() => syncPartition('sr', srData), [srData, syncPartition]);
  useEffect(() => syncPartition('wrong', wrongCounts), [wrongCounts, syncPartition]);
  useEffect(() => save('collectionSets', collectionSets, fileKey), [collectionSets, fileKey]);

  // Reset helpers
  const resetFileData = () => {
    if (!fileKey) return;
    clearFileData(fileKey);
    setFavIds(new Set());
    setCompletedIds(new Set());
    setPinnedIds(new Set());
    setNotes({});
    setCustomTags({});
    setSrData({});
    setWrongCounts({});
    const sys = buildSystemSets(questions, availableLessons);
    setCollectionSets([...sys, { id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }]);
    setActiveSetId('set-lessons');
    showToast('🗑 File data reset', 'warn');
  };

  const resetAllData = () => {
    clearAllQnaData();
    setFavIds(new Set());
    setCompletedIds(new Set());
    setPinnedIds(new Set());
    setNotes({});
    setCustomTags({});
    setSrData({});
    setWrongCounts({});
    if (questions.length) {
      const sys = buildSystemSets(questions, availableLessons);
      setCollectionSets([...sys, { id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }]);
    } else {
      setCollectionSets([{ id: 'set-user-1', name: 'My Collections', type: 'user', colls: [] }]);
    }
    setActiveSetId(questions.length ? 'set-lessons' : 'set-user-1');
    showToast('🗑 All data reset', 'warn');
  };

  return {
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
    loadFile,
    loadSelectedFiles,
    toggleFileSelect,
    selectAllFiles,
    clearAllFiles,
    handleFileUploads,
    resetFileData,
    resetAllData,
    buildSystemSets,
    performCloudSync
  };
}
