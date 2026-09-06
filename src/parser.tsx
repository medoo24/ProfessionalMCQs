// ═══════════════════════════════════════════════════════
// parser.tsx — Question bank file parser
//
// Supported format: tab-separated (or custom separator) text files, and JSON.
// See data/QUESTION_BANK_GUIDE.md for the full column schema.
// ═══════════════════════════════════════════════════════

import React from 'react';
import { Question } from './types';

export interface ParseResult {
  parsed: Question[];
  lessons: string[];
}

/**
 * Parse a question bank text file into structured question objects.
 *
 * Supports two formats:
 *   1. Tab-separated (.txt/.tsv/.csv) — Anki-style format
 *   2. JSON (.json) — Structured format with lesson/question/options/answerKey/tags fields
 */
export function parseTextData(text: string, fileKey?: string): ParseResult {
  const fk = fileKey || 'file';

  // ── JSON format detection ──────────────────────────────────────────
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJsonData(trimmed, fk);
  }

  // ── Tab-separated format ───────────────────────────────────────────
  return parseTsvData(text, fk);
}

/**
 * Parse JSON question bank format.
 * Supports: { questions: [...] } or [...] (array directly)
 * Each question: { lesson, question, options[], answerKey, answerText, explanation, tags[] }
 */
export function parseJsonData(text: string, fk: string): ParseResult {
  const parsed: Question[] = [];
  const lessons = new Set<string>();
  let seq = 1;

  try {
    const raw = JSON.parse(text);
    const qs = Array.isArray(raw) ? raw : (raw.questions || []);

    for (const q of qs) {
      if (!q.question) continue;
      const lesson = q.lesson || q.section || 'General';
      lessons.add(lesson);

      // tags can be array or string
      let tag = '';
      if (Array.isArray(q.tags)) tag = q.tags[0] || '';
      else if (typeof q.tags === 'string') tag = q.tags;
      else if (q.tag) tag = q.tag;

      parsed.push({
        id:          `${fk}__${seq++}`,
        numId:       seq - 1,
        fileKey:     fk,
        lesson,
        question:    q.question,
        options:     Array.isArray(q.options) ? q.options : [],
        answerKey:   q.answerKey || q.answer_key || '',
        answerText:  q.answerText || q.answer_text || '',
        explanation: q.explanation || '',
        tag
      });
    }
  } catch (e: any) {
    console.error('[QnA] JSON parse error:', e?.message || e);
  }

  return { parsed, lessons: Array.from(lessons) };
}

/**
 * Parse tab-separated question bank format (Anki-style).
 */
export function parseTsvData(text: string, fk: string): ParseResult {
  const parsed: Question[] = [];
  let seq = 1;
  const lessons = new Set<string>();

  // Detect separator: default tab, overrideable via #separator: directive
  let sep = '\t';
  const sm = text.match(/#separator:(.+)/);
  if (sm) {
    const s = sm[1].trim();
    sep = s === 'tab' ? '\t' : s === 'comma' ? ',' : s;
  }

  // Optional: explicit tags column directive (#tags column:N)
  let tagCol = -1;
  const tm = text.match(/#tags column:(\d+)/i);
  if (tm) tagCol = parseInt(tm[1], 10) - 1;

  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const cols = line.split(sep);
    if (cols.length < 2) continue;

    // Detect if first column is a lesson/category label
    let lesson = 'General', qText = cols[0].trim(), optStart = 1;
    const c0 = cols[0].trim();
    if (
      cols.length >= 3 &&
      (c0.includes('::') || /page\s*\d+/i.test(c0) || /mcq/i.test(c0) ||
       /tropical/i.test(c0) || /infections/i.test(c0))
    ) {
      lesson = c0;
      qText = cols[1] ? cols[1].trim() : 'Unknown';
      optStart = 2;
    }
    lessons.add(lesson);

    let options: string[] = [], answerKey = '', answerText = '', explanation = '', tag = '';

    // Extract tag from explicit tagCol
    if (tagCol !== -1 && cols.length > tagCol && cols[tagCol].trim()) {
      tag = cols[tagCol].trim();
      cols[tagCol] = '';
    }

    // Find the answer key column (single letter A–E)
    let ai = -1;
    for (let c = optStart; c < cols.length; c++) {
      if (/^[A-E]$/i.test(cols[c].trim())) { ai = c; break; }
    }

    if (ai !== -1) {
      // Options are columns between optStart and the answer key
      for (let c = optStart; c < ai; c++) {
        if (cols[c].trim()) options.push(cols[c].trim());
      }
      answerKey = cols[ai].trim().toUpperCase();
      answerText = cols[ai + 1] ? cols[ai + 1].trim() : '';

      // Remaining columns: look for tag (last non-empty) and explanation
      let rem = cols.slice(ai + 2).map(c => c.trim());
      if (!tag) {
        let li = -1;
        for (let k = rem.length - 1; k >= 0; k--) {
          if (rem[k]) { li = k; break; }
        }
        if (li !== -1) { tag = rem[li]; rem[li] = ''; }
      }
      const ep = rem.filter(Boolean);
      if (ep.length) explanation = ep.join(' | ');
    } else {
      // Fallback: no answer key column found
      options = cols.slice(optStart, cols.length - 2).filter(c => c.trim());
      answerText = cols[cols.length - 2] ? cols[cols.length - 2].trim() : '';
      if (!tag) tag = cols[cols.length - 1] ? cols[cols.length - 1].trim() : '';
      else explanation = cols[cols.length - 1] ? cols[cols.length - 1].trim() : '';
    }

    if (!qText) continue;

    parsed.push({
      id: `${fk}__${seq++}`,
      numId: seq - 1,
      fileKey: fk,
      lesson,
      question: qText,
      options,
      answerKey,
      answerText,
      explanation,
      tag
    });
  }

  return { parsed, lessons: Array.from(lessons) };
}

/**
 * Derive a short, filesystem-safe key from a filename.
 * Used to namespace all localStorage/Firestore data per file.
 */
export function fileKeyFrom(name: string): string {
  return (name || 'file')
    .replace(/^(\/?data\/|\.\/data\/|\/)/i, '') // strip leading directory prefixes like data/
    .replace(/\.[^.]+$/, '')                   // strip extension
    .replace(/[^a-zA-Z0-9]/g, '_')             // replace special chars
    .slice(0, 24) || 'file';
}

/**
 * Extract the short display number from a prefixed question ID.
 * e.g. "Critical_Thinking__42" → "42"
 */
export function qNum(id: string | number): string {
  if (!id) return '?';
  if (typeof id === 'number') return String(id);
  const parts = String(id).split('__');
  return parts.length > 1 ? parts[parts.length - 1] : String(id);
}

/**
 * Highlight occurrences of search query in text.
 * Returns an array of strings/JSX elements with <mark> wrapping matches.
 */
export function hl(text: string, q: string): React.ReactNode {
  if (!q || !text) return text;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const re = new RegExp(`(${safe})`, 'gi');
    return text.split(re).map((p, i) =>
      new RegExp(safe, 'i').test(p) ? <mark key={i}>{p}</mark> : p
    );
  } catch { return text; }
}
