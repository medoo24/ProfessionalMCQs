const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
// ═══════════════════════════════════════════════════════════════════════
// ShortcutsPanel.jsx — Keyboard shortcuts reference panel
// ═══════════════════════════════════════════════════════════════════════

function ShortcutsPanel({ onClose }) {
  const groups = [
    { title: 'Navigation', items: [
      ['J / ↓', 'Next question'], ['K / ↑', 'Previous question'],
      ['G G', 'Jump to top'], ['Shift+G', 'Jump to bottom'],
      ['Ctrl+F', 'Focus search'], ['Escape', 'Close modal / clear search'],
    ]},
    { title: 'Current Question', items: [
      ['Space', 'Expand / collapse current'],
      ['F', 'Toggle favorite'], ['D', 'Mark done / undone'],
      ['P', 'Pin / unpin question'], ['N', 'Open note editor'],
      ['C', 'Copy focused question to clipboard'],
      ['Opts', 'Per-card options (cycles: global → show → hide)'],
      ['Exp', 'Per-card explanation show/hide'],
      ['Ans', 'Per-card answer show/hide'],
      ['Copy', 'Copy question to clipboard (✓ animation)'],
    ]},
    { title: 'Practice Mode', items: [
      ['A B C D E', 'Select answer option'],
      ['Space', 'Skip question'],
      ['→ / Enter', 'Next question (after answering)'],
      ['1 2 3 4', 'Rate recall: Again / Hard / Good / Easy'],
      ['Esc', 'Close practice'],
    ]},
    { title: 'Exam Mode', items: [
      ['A B C D E', 'Select answer option'],
      ['← →', 'Navigate previous / next question'],
      ['Enter / →', 'Next question'],
      ['Esc', 'Close exam'],
    ]},
    { title: 'Global', items: [
      ['Ctrl+K', 'Show keyboard shortcuts'],
      ['Ctrl+R', 'Open report'],
      ['Ctrl+P', 'Start practice mode'],
      ['Ctrl+E', 'Open exam launcher (with options)'],
      ['A', 'Reveal/hide ALL answers (clears per-card overrides)'],
      ['Ctrl+Z', 'Undo last Done/Weak action (while toast is visible)'],
      ['Ctrl+/', 'Toggle compact mode'],
      ['T', 'Cycle theme'],
    ]},
  ];
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:17,display:'flex',alignItems:'center',gap:8}}><I.Keyboard/> Keyboard Shortcuts</div>
          <button className="btn ghost" onClick={onClose} style={{padding:'4px 8px'}}><I.X s={15}/></button>
        </div>
        {groups.map(g => (
          <div key={g.title} style={{marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--muted)',marginBottom:8}}>{g.title}</div>
            {g.items.map(([key, desc]) => (
              <div key={key} className="sk-row">
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {key.split(' ').map((k,i) => <span key={i} className="kbd">{k}</span>)}
                </div>
                <span style={{fontSize:13,color:'var(--muted)'}}>{desc}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
