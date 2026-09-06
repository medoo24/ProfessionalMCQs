// ═══════════════════════════════════════════════════════
// ThemePicker.tsx — Theme selection dropdown
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { THEMES, LIVE_PREVIEW, STATIC_PREVIEW } from '../config';
import { I } from './Icons';

export interface ThemePickerProps {
  theme: string;
  setTheme: (t: string | ((prev: string) => string)) => void;
}

export function ThemePicker({ theme, setTheme }: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const cur = THEMES.find(t => t.id === theme) || THEMES[0];
  const staticThemes = THEMES.filter(t => !t.live);
  const liveThemes   = THEMES.filter(t => t.live);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn"
        onClick={() => setOpen(v => !v)}
        style={{ gap: 6, padding: '5px 10px', fontSize: 12 }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: '50%',
            flexShrink: 0,
            background: cur.live ? LIVE_PREVIEW[cur.id] : STATIC_PREVIEW[cur.id],
            border: '1px solid var(--border2)',
            ...(cur.live ? { animation: 'aurora-wave 3s ease infinite', backgroundSize: '300% 300%' } : {})
          }}
        />
        {cur.icon} {cur.label.split(' ').slice(1).join(' ')}
        <I.Cd />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--card)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--r)',
            boxShadow: 'var(--shadowl)',
            zIndex: 500,
            overflowY: 'auto',
            maxHeight: '80vh',
            minWidth: 190,
            animation: 'fadeUp .15s ease-out'
          }}
        >
          {/* Static themes */}
          <div
            style={{
              padding: '6px 10px 3px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.07em'
            }}
          >
            Themes
          </div>
          {staticThemes.map(t => (
            <div
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: theme === t.id ? 700 : 400,
                background: theme === t.id ? 'var(--pg)' : 'transparent',
                color: theme === t.id ? 'var(--primary)' : 'var(--text)',
                transition: 'background .1s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme === t.id ? 'var(--pg)' : 'var(--card2)')}
              onMouseLeave={e => (e.currentTarget.style.background = theme === t.id ? 'var(--pg)' : 'transparent')}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: STATIC_PREVIEW[t.id],
                  border: '1px solid var(--border2)',
                  flexShrink: 0
                }}
              />
              {t.label}
              {theme === t.id && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
            </div>
          ))}

          {/* Live themes */}
          <div
            style={{
              padding: '8px 10px 3px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              borderTop: '1px solid var(--border)',
              marginTop: 4
            }}
          >
            ✦ Live Animated
          </div>
          {liveThemes.map(t => (
            <div
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: theme === t.id ? 700 : 400,
                background: theme === t.id ? 'var(--pg)' : 'transparent',
                color: theme === t.id ? 'var(--primary)' : 'var(--text)',
                transition: 'background .1s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme === t.id ? 'var(--pg)' : 'var(--card2)')}
              onMouseLeave={e => (e.currentTarget.style.background = theme === t.id ? 'var(--pg)' : 'transparent')}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: LIVE_PREVIEW[t.id],
                  border: '1px solid var(--border2)',
                  backgroundSize: '300% 300%',
                  animation: 'aurora-wave 3s ease infinite'
                }}
              />
              {t.label}
              {theme === t.id && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
