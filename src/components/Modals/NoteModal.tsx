// ═══════════════════════════════════════════════════════
// NoteModal.tsx — Question note editor modal
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';

export interface NoteModalProps {
  qId: string;
  question: string;
  noteText: string;
  onSave: (qId: string, text: string) => void;
  onClose: () => void;
}

export function NoteModal({ qId, question, noteText, onSave, onClose }: NoteModalProps) {
  const [text, setText] = useState(noteText || '');

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>📝 Note — Q{qId}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
          {question}
        </div>
        <textarea
          className="note-area"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add notes, mnemonics, reminders..."
          rows={6}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={() => {
              onSave(qId, text);
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
