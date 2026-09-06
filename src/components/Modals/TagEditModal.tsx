// ═══════════════════════════════════════════════════════
// TagEditModal.tsx — Question tag editor modal
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';

export interface TagEditModalProps {
  qId: string;
  question: string;
  currentTag: string;
  onSave: (qId: string, tag: string) => void;
  onClose: () => void;
}

export function TagEditModal({ qId, question, currentTag, onSave, onClose }: TagEditModalProps) {
  const [tag, setTag] = useState(currentTag || '');

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>🏷 Edit Tag — Q{qId}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>
          {question.slice(0, 80)}
          {question.length > 80 ? '…' : ''}
        </div>
        <input
          className="input"
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="Tag name..."
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSave(qId, tag);
              onClose();
            }
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <button
            className="btn"
            onClick={() => {
              onSave(qId, '');
              onClose();
            }}
          >
            Clear
          </button>
          <button
            className="btn primary"
            onClick={() => {
              onSave(qId, tag);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
