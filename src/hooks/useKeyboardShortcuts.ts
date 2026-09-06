// ═══════════════════════════════════════════════════════
// useKeyboardShortcuts.ts — Keyboard shortcut listener
// ═══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Question, DisplaySettings, ToastType } from '../types';
import { THEMES } from '../config';
import { qNum } from '../parser';

export interface UseKeyboardShortcutsProps {
  questions: Question[];
  visibleQuestions: Question[];
  focusedIdx: number;
  setFocusedIdx: React.Dispatch<React.SetStateAction<number>>;
  displaySettings: DisplaySettings;
  setDisplaySettings: React.Dispatch<React.SetStateAction<DisplaySettings>>;
  setLocalAnsOverrides: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setCompact: React.Dispatch<React.SetStateAction<boolean>>;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  showToast: (msg: string, type?: ToastType, undoFn?: (() => void) | null) => void;
  toggleCollapse: (id: string) => void;
  toggleFav: (id: string) => void;
  toggleDone: (id: string) => void;
  togglePin: (id: string) => void;
  setNoteModal: (modal: { qId: string; question: string } | null) => void;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  setShowReport: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPractice: React.Dispatch<React.SetStateAction<boolean>>;
  setPracticeMode: React.Dispatch<React.SetStateAction<string>>;
  setShowExamLauncher: React.Dispatch<React.SetStateAction<boolean>>;
  searchRef: React.RefObject<HTMLInputElement>;
  clearSearch: () => void;
  toastTimerRef: React.MutableRefObject<any>;
  setToast: React.Dispatch<React.SetStateAction<any>>;
}

export function useKeyboardShortcuts({
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
  toggleCollapse,
  toggleFav,
  toggleDone,
  togglePin,
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
}: UseKeyboardShortcutsProps) {
  const lastKeyRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  const scrollToQ = (id: string) => {
    if (!id) return;
    const el = document.getElementById(`q-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (!questions.length) return;

    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Modifier key combos
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          setToast((prev: any) => {
            if (prev?.undoFn) {
              clearTimeout(toastTimerRef.current);
              prev.undoFn();
              return null;
            }
            return prev;
          });
          return;
        }
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          setShowShortcuts(v => !v);
          return;
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          searchRef.current?.focus();
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setShowReport(v => !v);
          return;
        }
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setPracticeMode('practice');
          setShowPractice(true);
          return;
        }
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          setShowExamLauncher(true);
          return;
        }
        if (e.key === '/') {
          e.preventDefault();
          setCompact(v => !v);
          return;
        }
      }

      if (inInput) return;

      // Single-key commands
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setLocalAnsOverrides({});
        setDisplaySettings(p => ({ ...p, showAnswer: !p.showAnswer }));
        return;
      }

      const now = Date.now();
      if (e.key === 'g') {
        if (lastKeyRef.current === 'g' && now - lastKeyTimeRef.current < 500) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setFocusedIdx(0);
        }
        lastKeyRef.current = 'g';
        lastKeyTimeRef.current = now;
        return;
      }
      lastKeyRef.current = e.key;
      lastKeyTimeRef.current = now;

      if (e.key === 'G' && e.shiftKey) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        return;
      }

      if (e.key === 'Escape') {
        clearSearch();
        setShowShortcuts(false);
        setShowReport(false);
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        setTheme(p => {
          const ids = THEMES.map(t => t.id);
          const i = ids.indexOf(p);
          return ids[(i + 1) % ids.length];
        });
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx(i => {
          const n = Math.min(visibleQuestions.length - 1, i + 1);
          scrollToQ(visibleQuestions[n]?.id);
          return n;
        });
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx(i => {
          const n = Math.max(0, i - 1);
          scrollToQ(visibleQuestions[n]?.id);
          return n;
        });
        return;
      }

      // Actions on focused question
      const fq = visibleQuestions[focusedIdx];
      if (!fq) return;

      if (e.key === ' ') {
        e.preventDefault();
        toggleCollapse(fq.id);
      }
      if (e.key === 'f' || e.key === 'F') toggleFav(fq.id);
      if (e.key === 'd' || e.key === 'D') toggleDone(fq.id);
      if (e.key === 'p' || e.key === 'P') togglePin(fq.id);
      if (e.key === 'n' || e.key === 'N') setNoteModal({ qId: fq.id, question: fq.question });
      if (e.key === 'c' || e.key === 'C') {
        let text = `[Q${qNum(fq.id)}] ${fq.question}\n`;
        if (displaySettings.showOptions && fq.options?.length) {
          fq.options.forEach((o, i) => {
            text += `  ${String.fromCharCode(65 + i)}) ${o}\n`;
          });
        }
        if (displaySettings.showAnswer) {
          text += `  ✓ ${fq.answerKey ? fq.answerKey + ' — ' : ''}${fq.answerText}\n`;
        }
        if (displaySettings.showExplanation && fq.explanation) {
          text += `  📖 ${fq.explanation}\n`;
        }
        navigator.clipboard?.writeText(text).then(() => showToast('Copied!'));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    questions,
    visibleQuestions,
    focusedIdx,
    displaySettings,
    setFocusedIdx,
    setDisplaySettings,
    setLocalAnsOverrides,
    setCompact,
    setTheme,
    showToast,
    toggleCollapse,
    toggleFav,
    toggleDone,
    togglePin,
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
  ]);

  return { scrollToQ };
}
