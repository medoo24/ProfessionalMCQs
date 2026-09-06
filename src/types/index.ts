// ═══════════════════════════════════════════════════════
// types/index.ts — Core TypeScript types and interfaces
// ═══════════════════════════════════════════════════════

export interface Question {
  id: string;
  numId: number;
  fileKey: string;
  lesson: string;
  question: string;
  options: string[];
  answerKey: string;
  answerText: string;
  explanation: string;
  tag: string;
}

export interface SM2Card {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextDue: number;
  lastReviewed: number;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
  qIds: string[];
  query?: string;
}

export interface CollectionSet {
  id: string;
  name: string;
  type: 'lesson' | 'numeric' | 'user';
  colls: Collection[];
}

export interface DisplaySettings {
  showOptions: boolean;
  showAnswer: boolean;
  showExplanation: boolean;
  showTags: boolean;
}

export interface Theme {
  id: string;
  label: string;
  icon: string;
  live?: boolean;
}

export interface StudySession {
  date: number;
  duration: number;
}

export type ToastType = 'success' | 'warn' | 'error';

export interface ToastState {
  msg: string;
  type: ToastType;
  undoFn?: (() => void) | null;
}

export interface TVConfig {
  name: string;
  lessons: string[];
  tags: string[];
  qFilter: string;
  searchWord: string;
  collectionId: string | null;
  randomize: boolean;
  maxQs: number;
  showQuestion: boolean;
  showOptions: boolean;
  showAnswer: boolean;
  showExplanation: boolean;
  questionTime: number;
  optionsTime: number;
  answerTime: number;
  explanationTime: number;
  loop: boolean;
}

export interface TVHistoryEntry {
  id: string;
  name: string;
  config: TVConfig;
  ts: number;
}

export interface TVSession {
  questions: Question[];
  config: TVConfig;
}
