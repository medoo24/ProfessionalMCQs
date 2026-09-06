// ═══════════════════════════════════════════════════════
// useFilters.ts — Filtering, searching, and visible questions logic
// ═══════════════════════════════════════════════════════

import { useState, useMemo, useRef, useCallback } from 'react';
import { Question, SM2Card, Collection } from '../types';
import { isDue } from '../sm2';
import { qNum } from '../parser';

export interface UseFiltersProps {
  questions: Question[];
  customTags: Record<string, string>;
  pinnedIds: Set<string>;
  completedIds: Set<string>;
  favIds: Set<string>;
  weakIds: Set<string>;
  srData: Record<string, SM2Card>;
  collections: Collection[];
}

export function useFilters({
  questions,
  customTags,
  pinnedIds,
  completedIds,
  favIds,
  weakIds,
  srData,
  collections
}: UseFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dSearch, setDSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [activeCollId, setActiveCollId] = useState<string | null>(null);
  const [qFilters, setQFilters] = useState<Set<string>>(new Set(['unsolved']));
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLInputElement>(null);
  const searchDebRef = useRef<any>(null);

  // Search debounce
  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
    clearTimeout(searchDebRef.current);
    searchDebRef.current = setTimeout(() => setDSearch(val), 180);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDSearch('');
  }, []);

  const toggleLesson = useCallback((l: string) => {
    setSelectedLessons(prev => {
      const n = new Set(prev);
      n.has(l) ? n.delete(l) : n.add(l);
      return n;
    });
  }, []);

  const clearLessons = useCallback(() => {
    setSelectedLessons(new Set());
  }, []);

  const toggleTag = useCallback((t: string) => {
    setSelectedTags(prev => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTags(new Set());
  }, []);

  const jumpToTag = useCallback((t: string) => {
    setSelectedTags(new Set([t]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleQFilter = useCallback((key: string) => {
    setQFilters(prev => {
      const n = new Set(prev);
      if (key === 'all') return new Set(['all']);
      n.delete('all');
      if (n.has(key)) {
        n.delete(key);
        if (n.size === 0) n.add('all');
      } else {
        n.add(key);
      }
      return n;
    });
  }, []);

  // Tag list extraction
  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach(q => {
      const t = customTags[q.id] || q.tag;
      if (t && t.trim()) counts[t.trim()] = (counts[t.trim()] || 0) + 1;
    });
    const normal: string[] = [], restTags: string[] = [];
    Object.keys(counts).sort().forEach(t => {
      if (t.length > 40 && counts[t] === 1) restTags.push(t);
      else normal.push(t);
    });
    if (restTags.length > 0) normal.push('__REST__');
    return { tags: normal, restTags };
  }, [questions, customTags]);

  // Main question filtering
  const visibleQuestions = useMemo(() => {
    let f = questions;

    // Pinning puts items at top
    f = [...f.filter(q => pinnedIds.has(q.id)), ...f.filter(q => !pinnedIds.has(q.id))];

    // Lesson filter
    if (selectedLessons.size > 0) {
      f = f.filter(q => selectedLessons.has(q.lesson));
    }

    // Tag filter
    if (selectedTags.size > 0) {
      f = f.filter(q => {
        const t = (customTags[q.id] || q.tag || '').trim();
        if (selectedTags.has(t)) return true;
        if (selectedTags.has('__REST__') && allTags.restTags && allTags.restTags.includes(t)) return true;
        return false;
      });
    }

    // Search filter
    const q = dSearch.trim();
    if (q) {
      const range = q.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const s = parseInt(range[1], 10), e = parseInt(range[2], 10);
        f = f.filter(x => {
          const n = parseInt(qNum(x.id), 10);
          return n >= s && n <= e;
        });
      } else {
        const lo = q.toLowerCase();
        f = f.filter(x =>
          x.question.toLowerCase().includes(lo) ||
          x.options.some(o => o.toLowerCase().includes(lo)) ||
          (x.explanation && x.explanation.toLowerCase().includes(lo)) ||
          (x.tag && x.tag.toLowerCase().includes(lo)) ||
          (customTags[x.id] && customTags[x.id].toLowerCase().includes(lo)) ||
          (x.answerText && x.answerText.toLowerCase().includes(lo))
        );
      }
    }

    // Tab / Collection / SR Due filter
    if (activeTab === 'Collection' && activeCollId) {
      const col = collections.find(c => c.id === activeCollId);
      if (col) f = f.filter(x => col.qIds.includes(x.id));
    } else if (activeTab === 'SR Due') {
      f = f.filter(x => isDue(srData[x.id]));
    }

    // Question solved status filter
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
  }, [
    questions,
    dSearch,
    activeTab,
    activeCollId,
    favIds,
    completedIds,
    pinnedIds,
    selectedLessons,
    selectedTags,
    allTags,
    srData,
    weakIds,
    collections,
    customTags,
    qFilters
  ]);

  return {
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
  };
}
