// ═══════════════════════════════════════════════════════
// QuestionCard.tsx — Question card component with collapsible details,
// status toggles, inline notes, and tags
// ═══════════════════════════════════════════════════════

import React, { useState, memo } from 'react';
import { I } from './Icons';
import { Question, DisplaySettings, SM2Card, Collection } from '../types';
import { qNum, hl } from '../parser';

export interface QuestionCardProps {
  q: Question;
  isCollapsed: boolean;
  isFav: boolean;
  isDone: boolean;
  isPinned: boolean;
  isWeak: boolean;
  srCard?: SM2Card;
  isDue?: boolean;
  displaySettings: DisplaySettings;
  searchQ: string;
  onToggleCollapse: (id: string) => void;
  onToggleFav: (id: string) => void;
  onToggleDone: (id: string) => void;
  onOpenNote: (qId: string) => void;
  noteText: string;
  onOpenTag: (qId: string) => void;
  customTag: string;
  compact: boolean;
  onTogglePin: (id: string) => void;
  collections: Collection[];
  focused: boolean;
  onFocusClick: () => void;
  localAnsOverride?: boolean;
  onToggleLocalAns: (id: string) => void;
  localOptOverride?: boolean;
  onToggleLocalOpt: (id: string) => void;
  localExpOverride?: boolean;
  onToggleLocalExp: (id: string) => void;
  bulkMode: boolean;
  isBulkSelected: boolean;
  onToggleBulk: (id: string) => void;
  onJumpTag?: (tag: string) => void;
}

export const QuestionCard = memo(function QuestionCard({
  q,
  isCollapsed,
  isFav,
  isDone,
  isPinned,
  isWeak,
  srCard,
  isDue: due,
  displaySettings,
  searchQ,
  onToggleCollapse,
  onToggleFav,
  onToggleDone,
  onOpenNote,
  noteText,
  onOpenTag,
  customTag,
  compact,
  onTogglePin,
  collections,
  focused,
  onFocusClick,
  localAnsOverride,
  onToggleLocalAns,
  localOptOverride,
  onToggleLocalOpt,
  localExpOverride,
  onToggleLocalExp,
  bulkMode,
  isBulkSelected,
  onToggleBulk,
  onJumpTag,
}: QuestionCardProps) {
  const showAns  = localAnsOverride !== undefined ? localAnsOverride : displaySettings.showAnswer;
  const showOpts = localOptOverride !== undefined ? localOptOverride : displaySettings.showOptions;
  const showExp  = localExpOverride !== undefined ? localExpOverride : displaySettings.showExplanation;

  const [copied, setCopied] = useState(false);

  const copyCard = () => {
    let t = `Q${qNum(q.id)}: ${q.question}\n`;
    if (showOpts && q.options && q.options.length > 0) {
      q.options.forEach((o, i) => {
        t += `  ${String.fromCharCode(65 + i)}) ${o}\n`;
      });
    }
    if (showAns) t += `  ✓ ${q.answerKey ? q.answerKey + ' — ' : ''}${q.answerText}\n`;
    if (showExp && q.explanation) t += `  📖 ${q.explanation}\n`;
    navigator.clipboard?.writeText(t.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div
      id={`q-${q.id}`}
      className={`q-card afu ${isDone ? 'done' : ''} ${isPinned && !isDone ? 'pinned' : ''} ${
        isWeak && !isDone && !isPinned ? 'weak-card' : ''
      } ${isBulkSelected ? 'bulk-sel' : ''}`}
      style={{
        marginBottom: compact ? 6 : 12,
        outline: focused && !bulkMode ? '2px solid var(--primary)' : 'none',
        outlineOffset: 2,
        cursor: bulkMode ? 'pointer' : undefined
      }}
      onClick={bulkMode ? (e => { e.stopPropagation(); onToggleBulk(q.id); }) : onFocusClick}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
          padding: compact ? '10px 13px' : '14px 16px',
          cursor: 'pointer'
        }}
        onClick={() => onToggleCollapse(q.id)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
          {bulkMode && (
            <input
              type="checkbox"
              checked={!!isBulkSelected}
              onChange={e => { e.stopPropagation(); onToggleBulk(q.id); }}
              onClick={e => e.stopPropagation()}
              style={{ marginTop: 3, width: 15, height: 15, flexShrink: 0, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          )}
          <button
            onClick={e => { e.stopPropagation(); onToggleDone(q.id); }}
            style={{ marginTop: 2, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            title="Mark done (D)"
          >
            {isDone ? <I.CheckCircle size={17} /> : <I.Circle size={17} />}
          </button>
          <div style={{ flex: 1 }}>
            {q.lesson && q.lesson !== 'General' && (
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 3 }}>
                {q.lesson.length > 55 ? q.lesson.slice(0, 55) + '…' : q.lesson}
              </div>
            )}
            <div
              style={{
                fontSize: compact ? 13 : 14,
                fontWeight: 500,
                lineHeight: 1.55,
                textDecoration: isDone ? 'line-through' : 'none',
                opacity: isDone ? 0.7 : 1
              }}
            >
              {hl(q.question, searchQ)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {due && <span className="tag-chip due" title="Due for review"><I.Zap />Due</span>}
          {isWeak && <span className="tag-chip weak" title="Weak spot — answered wrong ≥3x">⚡</span>}

          {/* Options per-card toggle */}
          {q.options && q.options.length > 0 && (
            <button
              onClick={() => onToggleLocalOpt(q.id)}
              title={`Options: ${localOptOverride === undefined ? 'global' : localOptOverride ? 'shown' : 'hidden'}`}
              style={{
                padding: '3px 7px',
                borderRadius: 6,
                border: `1px solid ${localOptOverride === true ? 'var(--primary)' : localOptOverride === false ? 'var(--red)' : 'var(--border2)'}`,
                background: localOptOverride === true ? 'var(--pg)' : localOptOverride === false ? 'var(--rg)' : 'var(--card2)',
                color: localOptOverride === true ? 'var(--primary)' : localOptOverride === false ? 'var(--red)' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'var(--mono)',
                fontWeight: 700
              }}
            >
              {localOptOverride === false ? <I.EyeOff /> : <I.Eye />}
              {!compact && <span style={{ marginLeft: 3 }}>Opts</span>}
            </button>
          )}

          {/* Explanation per-card toggle */}
          {q.explanation && (
            <button
              onClick={() => onToggleLocalExp(q.id)}
              title={`Explanation: ${localExpOverride === undefined ? 'global' : localExpOverride ? 'shown' : 'hidden'}`}
              style={{
                padding: '3px 7px',
                borderRadius: 6,
                border: `1px solid ${localExpOverride === true ? 'var(--purple)' : localExpOverride === false ? 'var(--red)' : 'var(--border2)'}`,
                background: localExpOverride === true ? 'var(--pug)' : localExpOverride === false ? 'var(--rg)' : 'var(--card2)',
                color: localExpOverride === true ? 'var(--purple)' : localExpOverride === false ? 'var(--red)' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'var(--mono)',
                fontWeight: 700
              }}
            >
              {localExpOverride === false ? <I.EyeOff /> : <I.Eye />}
              {!compact && <span style={{ marginLeft: 3 }}>Exp</span>}
            </button>
          )}

          {/* Answer per-card toggle */}
          <button
            onClick={() => onToggleLocalAns(q.id)}
            title={`Answer: ${localAnsOverride === undefined ? 'global' : localAnsOverride ? 'shown' : 'hidden'} (A)`}
            style={{
              padding: '3px 7px',
              borderRadius: 6,
              border: `1px solid ${localAnsOverride === true ? 'var(--green)' : localAnsOverride === false ? 'var(--red)' : 'var(--border2)'}`,
              background: localAnsOverride === true ? 'var(--gg)' : localAnsOverride === false ? 'var(--rg)' : 'var(--card2)',
              color: localAnsOverride === true ? 'var(--green)' : localAnsOverride === false ? 'var(--red)' : 'var(--muted)',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'var(--mono)',
              fontWeight: 700
            }}
          >
            {localAnsOverride === false ? <I.EyeOff /> : <I.Eye />}
            {!compact && <span style={{ marginLeft: 3 }}>{localAnsOverride === true ? '✓' : localAnsOverride === false ? '✗' : 'Ans'}</span>}
          </button>

          {/* Copy card */}
          <button
            onClick={copyCard}
            title="Copy question to clipboard"
            style={{
              padding: '3px 6px',
              borderRadius: 6,
              border: `1px solid ${copied ? 'var(--green)' : 'var(--border2)'}`,
              background: copied ? 'var(--gg)' : 'var(--card2)',
              color: copied ? 'var(--green)' : 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              lineHeight: 1,
              transition: 'background .2s,border-color .2s,color .2s',
              animation: copied ? 'copyPop .35s ease-out' : 'none',
              position: 'relative',
              minWidth: 28,
              justifyContent: 'center'
            }}
          >
            {copied ? <span style={{ fontSize: 11, fontWeight: 800 }}>✓</span> : <I.Copy />}
          </button>

          <button
            onClick={() => onOpenNote(q.id)}
            title="Note (N)"
            style={{
              background: noteText ? 'var(--pg)' : 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 6,
              color: noteText ? 'var(--primary)' : 'var(--muted)'
            }}
          >
            <I.Note />
          </button>

          <button
            onClick={() => onToggleFav(q.id)}
            title="Favorite (F)"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6 }}
          >
            <I.Star f={isFav} />
          </button>

          <button
            onClick={() => onTogglePin(q.id)}
            title="Pin (P)"
            style={{
              background: isPinned ? 'var(--yg)' : 'none',
              border: isPinned ? '1px solid var(--yellow)' : '1px solid transparent',
              cursor: 'pointer',
              padding: '3px 6px',
              borderRadius: 6,
              color: isPinned ? 'var(--yellow)' : 'var(--muted)'
            }}
          >
            <I.Pin />
          </button>

          <span className="id-badge">{q.id}</span>
          <div style={{ color: 'var(--muted)', padding: '2px 4px' }}>
            {isCollapsed ? <I.Cd /> : <I.Cu />}
          </div>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div style={{ borderTop: '1px solid var(--border)', padding: compact ? '8px 13px 12px' : '12px 16px 16px' }} className="afi">
          {/* Options */}
          {showOpts && q.options && q.options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
              {q.options.map((opt, i) => {
                const char = String.fromCharCode(65 + i);
                const isCorrect = q.answerKey && char.toUpperCase() === q.answerKey.toUpperCase();
                return (
                  <div key={i} className={`opt-row ${showAns && isCorrect ? 'correct' : ''}`} style={{ fontSize: compact ? 12 : 13 }}>
                    <span style={{ fontWeight: 700, minWidth: 18, fontFamily: 'var(--mono)', fontSize: 11 }}>{char}.</span>
                    <span style={{ flex: 1, lineHeight: 1.5 }}>{hl(opt, searchQ)}</span>
                    {showAns && isCorrect && <I.Check />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer text */}
          {showAns && q.answerText && (!showOpts || !q.options || q.options.length === 0) && (
            <div
              style={{
                background: 'var(--gg)',
                border: '1px solid var(--green)',
                borderRadius: 8,
                color: 'var(--green)',
                padding: '7px 12px',
                fontSize: compact ? 12 : 13,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                marginBottom: 8
              }}
            >
              <I.Check />
              <span>
                <b>Answer:</b> {q.answerKey ? q.answerKey + ' — ' : ''}{hl(q.answerText, searchQ)}
              </span>
            </div>
          )}

          {/* Explanation */}
          {showExp && q.explanation && (
            <div
              style={{
                borderLeft: '3px solid var(--primary)',
                paddingLeft: 10,
                marginBottom: 8,
                fontSize: compact ? 11 : 12,
                color: 'var(--muted)',
                lineHeight: 1.6
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2, color: 'var(--primary)' }}>
                Explanation
              </div>
              {hl(q.explanation, searchQ)}
            </div>
          )}

          {/* Tags & meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {displaySettings.showTags && (q.tag || customTag) && (() => {
              const tagVal = customTag || q.tag;
              return (
                <span className="tag-chip" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
                  <span
                    onClick={e => { e.stopPropagation(); onJumpTag && onJumpTag(tagVal); }}
                    title={`Filter by tag: ${tagVal}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 9px', cursor: 'pointer' }}
                  >
                    <I.Tag />{tagVal}
                  </span>
                  <span
                    onClick={e => { e.stopPropagation(); onOpenTag(q.id); }}
                    title="Edit tag"
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 7px 3px 4px', borderLeft: '1px solid var(--border2)', color: 'var(--muted)', fontSize: 10, cursor: 'pointer', opacity: 0.7 }}
                  >
                    ✎
                  </span>
                </span>
              );
            })()}

            {!q.tag && !customTag && (
              <button
                onClick={e => { e.stopPropagation(); onOpenTag(q.id); }}
                className="tag-chip"
                style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 10 }}
              >
                + tag
              </button>
            )}

            {/* SR info */}
            {srCard && srCard.lastReviewed && (
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                SR: {srCard.repetitions}× {srCard.interval}d
              </span>
            )}

            {/* Collections */}
            {collections.map(c => (
              <span key={c.id} className="coll-badge" style={{ color: c.color, borderColor: c.color, background: c.color + '18' }}>
                <I.Folder />{c.name}
              </span>
            ))}
          </div>

          {/* Note preview */}
          {noteText && (
            <div
              style={{
                marginTop: 8,
                padding: '5px 10px',
                background: 'var(--card2)',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: 'var(--muted)',
                borderLeft: '2px solid var(--yellow)',
                cursor: 'pointer'
              }}
              onClick={() => onOpenNote(q.id)}
            >
              📝 {noteText.length > 90 ? noteText.slice(0, 90) + '…' : noteText}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
