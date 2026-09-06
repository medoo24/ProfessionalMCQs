// ═══════════════════════════════════════════════════════
// FilterPanels.tsx — File, Lesson, and Tag filter dropdown panels
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { I } from './Icons';
import { Question } from '../types';

// ── File Filter Panel ──────────────────────────────────────────────

export interface FileFilterPanelProps {
  availableFiles: string[];
  selectedFiles: Set<string>;
  onToggle: (file: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onUploadClick: () => void;
  filesCountMap?: Record<string, number>;
}

export function FileFilterPanel({
  availableFiles,
  selectedFiles,
  onToggle,
  onSelectAll,
  onClearAll,
  onUploadClick,
  filesCountMap = {}
}: FileFilterPanelProps) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const cleanName = (f: string) => f.replace(/^data\//, '').replace(/\.(json|txt|csv|tsv)$/i, '');

  const filtered = useMemo(() => {
    if (!q.trim()) return availableFiles;
    const lo = q.toLowerCase();
    return availableFiles.filter(f => f.toLowerCase().includes(lo) || cleanName(f).toLowerCase().includes(lo));
  }, [availableFiles, q]);

  return (
    <div
      className="dropdown"
      style={{
        width: 320,
        padding: 0,
        overflow: 'hidden',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header / Search */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <I.Search />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter question banks…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)' }}
        />
        {q && (
          <button
            onClick={() => setQ('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1 }}
          >
            <I.X s={12} />
          </button>
        )}
      </div>

      {/* Action shortcuts */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card2)',
          fontSize: 11,
          flexShrink: 0
        }}
      >
        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
          {selectedFiles.size} of {availableFiles.length} bank(s) active
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={onSelectAll}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 11, padding: 0 }}
          >
            Select All
          </button>
          <span style={{ color: 'var(--border2)' }}>|</span>
          <button
            onClick={onClearAll}
            style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: 700, cursor: 'pointer', fontSize: 11, padding: 0 }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scrollable File List */}
      <div style={{ maxHeight: 280, overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            No matching bank files
          </div>
        )}
        {filtered.map(f => {
          const isSel = selectedFiles.has(f);
          const count = filesCountMap[f];
          return (
            <div
              key={f}
              className="dd-item"
              onClick={() => onToggle(f)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                background: isSel ? 'var(--pg)' : undefined,
                transition: 'background .1s'
              }}
            >
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => {}}
                style={{ accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  fontWeight: isSel ? 700 : 500,
                  color: isSel ? 'var(--primary)' : 'var(--text)'
                }}
                title={f}
              >
                {cleanName(f)}
              </span>
              {count !== undefined && (
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: isSel ? 'var(--primary)' : 'var(--muted)',
                    background: 'var(--card2)',
                    padding: '1px 5px',
                    borderRadius: 4,
                    flexShrink: 0,
                    border: '1px solid var(--border)'
                  }}
                >
                  {count} Qs
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload button at bottom */}
      <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', background: 'var(--card2)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <button
          className="btn ghost"
          onClick={onUploadClick}
          style={{ width: '100%', fontSize: 11, padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--primary)' }}
        >
          <I.Upload /> <span>+ Upload More Files</span>
        </button>
      </div>
    </div>
  );
}

// ── Lesson Filter Panel ──────────────────────────────────────────────

export interface LessonFilterPanelProps {
  availableLessons: string[];
  selectedLessons: Set<string>;
  onToggle: (lesson: string) => void;
  onClear: () => void;
}

export function LessonFilterPanel({
  availableLessons,
  selectedLessons,
  onToggle,
  onClear
}: LessonFilterPanelProps) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = q.trim()
    ? availableLessons.filter(l => l.toLowerCase().includes(q.toLowerCase()))
    : availableLessons;

  return (
    <div className="dropdown" style={{ width: 300, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <I.Search />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search lessons…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)' }}
        />
        {q && (
          <button
            onClick={() => setQ('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1 }}
          >
            <I.X s={12} />
          </button>
        )}
      </div>

      {selectedLessons.size > 0 && (
        <div
          className="dd-item"
          onClick={onClear}
          style={{ color: 'var(--red)', fontWeight: 700, borderBottom: '1px solid var(--border)', fontSize: 12 }}
        >
          ✕ Clear all ({selectedLessons.size})
        </div>
      )}

      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>No matches</div>
        )}
        {filtered.map(l => (
          <div
            key={l}
            className="dd-item"
            onClick={() => onToggle(l)}
            style={{ background: selectedLessons.has(l) ? 'var(--pg)' : undefined }}
          >
            <input
              type="checkbox"
              checked={selectedLessons.has(l)}
              onChange={() => {}}
              style={{ accentColor: 'var(--primary)', flexShrink: 0 }}
            />
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: selectedLessons.has(l) ? 'var(--primary)' : undefined
              }}
              title={l}
            >
              {l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tag Filter Panel ──────────────────────────────────────────────

export interface TagFilterPanelProps {
  allTags: string[];
  restTags?: string[];
  selectedTags: Set<string>;
  onToggle: (tag: string) => void;
  onClear: () => void;
  questions: Question[];
  customTags: Record<string, string>;
  floatMode?: boolean;
}

export function TagFilterPanel({
  allTags,
  restTags,
  selectedTags,
  onToggle,
  onClear,
  questions,
  customTags,
  floatMode
}: TagFilterPanelProps) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const tagCounts = useMemo(() => {
    const m: Record<string, number> = {};
    questions.forEach(qItem => {
      const t = customTags[qItem.id] || qItem.tag;
      if (t && t.trim()) m[t.trim()] = (m[t.trim()] || 0) + 1;
    });
    if (restTags && restTags.length > 0) {
      m['__REST__'] = restTags.reduce((acc, t) => acc + (m[t] || 0), 0);
    }
    return m;
  }, [questions, customTags, restTags]);

  const filtered = useMemo(() => {
    if (!q.trim()) return allTags;
    const lo = q.toLowerCase();
    return allTags.filter(t => (t === '__REST__' ? 'rest'.includes(lo) : t.toLowerCase().includes(lo)));
  }, [allTags, q]);

  return (
    <div
      style={{
        position: floatMode ? 'fixed' : 'absolute',
        top: floatMode ? 112 : 'calc(100% + 6px)',
        left: floatMode ? 'unset' : 0,
        width: 300,
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--r)',
        boxShadow: 'var(--shadowl)',
        zIndex: 200,
        animation: 'fadeUp .15s ease-out',
        overflow: 'hidden'
      }}
    >
      {/* Search */}
      <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <I.Search />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search tags…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)' }}
        />
        {q && (
          <button
            onClick={() => setQ('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1 }}
          >
            <I.X s={12} />
          </button>
        )}
      </div>

      {/* Clear all */}
      {selectedTags.size > 0 && (
        <div
          className="dd-item"
          onClick={onClear}
          style={{ color: 'var(--red)', fontWeight: 700, borderBottom: '1px solid var(--border)', fontSize: 12 }}
        >
          ✕ Clear all ({selectedTags.size})
        </div>
      )}

      {/* Scrollable list */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>No matches</div>
        )}
        {filtered.map(t => {
          const active = selectedTags.has(t);
          const cnt = tagCounts[t] || 0;
          const isRest = t === '__REST__';
          const label = isRest ? `Rest (${restTags?.length || 0} misc)` : t;
          return (
            <div
              key={t}
              className="dd-item"
              onClick={() => onToggle(t)}
              title={
                isRest
                  ? `Tags >40 chars with 1 question:\n${(restTags || []).slice(0, 8).join('\n')}${
                      (restTags?.length || 0) > 8 ? '\n…' : ''
                    }`
                  : t
              }
              style={{ background: active ? 'var(--pg)' : undefined }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => {}}
                style={{ accentColor: 'var(--primary)', flexShrink: 0 }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: active ? 'var(--primary)' : undefined,
                  fontStyle: isRest ? 'italic' : undefined
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                {cnt}
              </span>
            </div>
          );
        })}

        {/* Rest info row */}
        {restTags && restTags.length > 0 && (
          <div
            style={{
              padding: '6px 14px',
              fontSize: 10,
              color: 'var(--muted)',
              borderTop: '1px solid var(--border)',
              lineHeight: 1.5
            }}
          >
            <b>Rest</b> = {restTags.length} tag{restTags.length > 1 ? 's' : ''} &gt;40 chars with 1 question
          </div>
        )}
      </div>
    </div>
  );
}
