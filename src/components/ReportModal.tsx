// ═══════════════════════════════════════════════════════
// ReportModal.tsx — Study stats report (streak, lesson breakdown, tags)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { I } from './Icons';
import { Question, SM2Card, StudySession } from '../types';
import { isDue } from '../sm2';

// Re-export decoupled components for backward compatibility
export { NoteModal } from './Modals/NoteModal';
export { TagEditModal } from './Modals/TagEditModal';
export { StreakHeatmap } from './StreakHeatmap';
export { QuestionCard } from './QuestionCard';

export interface ReportModalProps {
  questions: Question[];
  favIds: Set<string>;
  completedIds: Set<string>;
  notes: Record<string, string>;
  srData: Record<string, SM2Card>;
  weakIds: Set<string>;
  sessions: StudySession[];
  streak: number;
  onClose: () => void;
}

export function ReportModal({
  questions,
  favIds,
  completedIds,
  notes,
  srData,
  weakIds,
  sessions,
  streak,
  onClose
}: ReportModalProps) {
  const total = questions.length;
  const done = completedIds.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const due = questions.filter(q => isDue(srData[q.id])).length;
  const weak = weakIds.size;
  const noted = Object.values(notes).filter(n => n && n.trim()).length;

  const lessonMap: Record<string, { total: number; done: number }> = {};
  questions.forEach(q => {
    if (!lessonMap[q.lesson]) lessonMap[q.lesson] = { total: 0, done: 0 };
    lessonMap[q.lesson].total++;
    if (completedIds.has(q.id)) lessonMap[q.lesson].done++;
  });
  const lessons = Object.entries(lessonMap).sort((a, b) => b[1].total - a[1].total);

  const tagMap: Record<string, number> = {};
  questions.forEach(q => {
    if (q.tag) {
      if (!tagMap[q.tag]) tagMap[q.tag] = 0;
      tagMap[q.tag]++;
    }
  });
  const tags = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const totalSessionSec = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const avgSession = sessions.length > 0 ? Math.round(totalSessionSec / sessions.length) : 0;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>📊 Study Report</div>
          <button className="btn ghost" onClick={onClose}>
            <I.X s={15} />
          </button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8, marginBottom: 20 }}>
          {[
            [total, 'Total', 'var(--text)'],
            [done, 'Done', 'var(--green)'],
            [total - done, 'Unsolved', 'var(--yellow)'],
            [due, 'SR Due', 'var(--purple)'],
            [weak, 'Weak', 'var(--red)'],
            [favIds.size, 'Favorites', 'var(--yellow)'],
            [noted, 'Notes', 'var(--primary)'],
            [streak, 'Day Streak', 'var(--yellow)'],
            [sessions.length, 'Sessions', 'var(--muted)']
          ].map(([n, l, c]) => (
            <div key={l as string} className="stat-card" style={{ alignItems: 'center' }}>
              <div className="stat-num" style={{ color: c as string }}>
                {n}
              </div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
          <span>Overall Progress</span>
          <span style={{ fontFamily: 'var(--mono)' }}>{pct}%</span>
        </div>
        <div className="pb" style={{ marginBottom: 20 }}>
          <div
            className="pb-fill"
            style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--primary)' }}
          />
        </div>

        {/* Session time */}
        {sessions.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              <I.Clock /> Total study time:{' '}
              <b style={{ color: 'var(--text)' }}>
                {Math.floor(totalSessionSec / 3600)}h {Math.floor((totalSessionSec % 3600) / 60)}m
              </b>
            </span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Avg session:{' '}
              <b style={{ color: 'var(--text)' }}>
                {Math.floor(avgSession / 60)}m {avgSession % 60}s
              </b>
            </span>
          </div>
        )}

        {/* Lesson breakdown */}
        {lessons.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 8 }}>
              Lesson Breakdown
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table className="rt">
                <thead>
                  <tr>
                    <th>Lesson</th>
                    <th>Total</th>
                    <th>Done</th>
                    <th style={{ width: 120 }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map(([l, d]) => {
                    const p = Math.round((d.done / d.total) * 100);
                    return (
                      <tr key={l}>
                        <td style={{ fontSize: 12, maxWidth: 200 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l}>
                            {l.length > 40 ? l.slice(0, 40) + '…' : l}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center' }}>{d.total}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center', color: 'var(--green)' }}>
                          {d.done}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="pb" style={{ flex: 1 }}>
                              <div className="pb-fill" style={{ width: `${p}%`, background: p === 100 ? 'var(--green)' : 'var(--primary)' }} />
                            </div>
                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', minWidth: 28 }}>
                              {p}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 8 }}>
              Top Tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(([tag, count]) => (
                <span key={tag} className="tag-chip">
                  <I.Tag />
                  {tag} <span style={{ fontFamily: 'var(--mono)', color: 'var(--primary)' }}>×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn"
          onClick={() => {
            let t = `QnA Hub Report\n${'='.repeat(40)}\n\nTotal: ${total}\nDone: ${done} (${pct}%)\nSR Due: ${due}\nWeak: ${weak}\nStreak: ${streak} days\n\nLessons:\n`;
            lessons.forEach(([l, d]) => (t += `  ${l}: ${d.done}/${d.total}\n`));
            navigator.clipboard?.writeText(t).then(() => alert('Copied!'));
          }}
        >
          <I.Copy /> Copy Report
        </button>
      </div>
    </div>
  );
}
