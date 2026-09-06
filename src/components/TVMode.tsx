import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Question, Collection, TVConfig, TVHistoryEntry, TVSession } from '../types';
import { qNum } from '../parser';

// ── KNOWLEDGE MAP ───────────────────────────────────────────────────────
export interface KnowledgeMapProps {
  questions: Question[];
  completedIds: Set<string | number>;
  favIds: Set<string | number>;
  weakIds: Set<string | number>;
  customTags: Record<string, string>;
  onClose: () => void;
}

interface NodeData {
  name: string;
  total: number;
  done: number;
  fav: number;
  weak: number;
}

export function KnowledgeMap({ questions, completedIds, favIds, weakIds, customTags, onClose }: KnowledgeMapProps) {
  const [view, setView] = useState<'lessons' | 'tags'>('lessons');
  const [sortBy, setSortBy] = useState<'completion' | 'count' | 'name' | 'weak'>('completion');
  const [hovered, setHovered] = useState<string | null>(null);

  const lessonData = useMemo(() => {
    const map: Record<string, NodeData> = {};
    questions.forEach(q => {
      const l = q.lesson || 'General';
      if (!map[l]) map[l] = { name: l, total: 0, done: 0, fav: 0, weak: 0 };
      map[l].total++;
      if (completedIds.has(q.id)) map[l].done++;
      if (favIds.has(q.id)) map[l].fav++;
      if (weakIds.has(q.id)) map[l].weak++;
    });
    return Object.values(map);
  }, [questions, completedIds, favIds, weakIds]);

  const tagData = useMemo(() => {
    const map: Record<string, NodeData> = {};
    questions.forEach(q => {
      const raw = customTags[q.id] || q.tag || '';
      const tags = raw.split(/[,;|]+/).map(t => t.trim()).filter(Boolean);
      (tags.length ? tags : ['(no tag)']).forEach(tag => {
        if (!map[tag]) map[tag] = { name: tag, total: 0, done: 0, fav: 0, weak: 0 };
        map[tag].total++;
        if (completedIds.has(q.id)) map[tag].done++;
        if (favIds.has(q.id)) map[tag].fav++;
        if (weakIds.has(q.id)) map[tag].weak++;
      });
    });
    return Object.values(map);
  }, [questions, completedIds, favIds, weakIds, customTags]);

  const data = view === 'lessons' ? lessonData : tagData;

  const sorted = useMemo(() => {
    const d = [...data];
    if (sortBy === 'completion') d.sort((a, b) => (b.done / b.total) - (a.done / a.total));
    else if (sortBy === 'count') d.sort((a, b) => b.total - a.total);
    else if (sortBy === 'name') d.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'weak') d.sort((a, b) => b.weak - a.weak);
    return d;
  }, [data, sortBy]);

  // Compute node sizes: min 80px, max 180px based on question count
  const maxCount = Math.max(...sorted.map(d => d.total), 1);
  const nodeSize = (count: number) => Math.round(80 + (count / maxCount) * 100);

  // Color based on completion pct
  const nodeColor = (item: NodeData) => {
    const pct = item.total > 0 ? item.done / item.total : 0;
    if (pct >= 0.9) return { bg: 'rgba(62,207,142,.22)', border: 'var(--green)', text: 'var(--green)', glow: 'rgba(62,207,142,.4)' };
    if (pct >= 0.6) return { bg: 'rgba(91,141,238,.2)', border: 'var(--primary)', text: 'var(--primary)', glow: 'rgba(91,141,238,.35)' };
    if (pct >= 0.3) return { bg: 'rgba(245,166,35,.18)', border: 'var(--yellow)', text: 'var(--yellow)', glow: 'rgba(245,166,35,.3)' };
    return { bg: 'rgba(240,96,88,.15)', border: 'var(--red)', text: 'var(--red)', glow: 'rgba(240,96,88,.25)' };
  };

  const totals = { total: questions.length, done: completedIds.size, fav: favIds.size, weak: weakIds.size };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="kmap-overlay" onClick={onClose}>
      <div className="kmap-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>🗺️ Knowledge Map</div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 24px 0', flexShrink: 0, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', val: totals.total, color: 'var(--text)' },
            { label: 'Done', val: `${totals.done} (${Math.round(totals.done / Math.max(totals.total, 1) * 100)}%)`, color: 'var(--green)' },
            { label: 'Fav', val: totals.fav, color: 'var(--yellow)' },
            { label: 'Weak', val: totals.weak, color: 'var(--red)' },
            { label: view === 'lessons' ? 'Lessons' : 'Tags', val: sorted.length, color: 'var(--primary)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 2
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 24px', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['lessons', 'tags'] as const).map(id => (
              <button key={id} onClick={() => setView(id)}
                style={{
                  padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${view === id ? 'var(--primary)' : 'var(--border2)'}`,
                  background: view === id ? 'var(--pg)' : 'var(--card2)',
                  color: view === id ? 'var(--primary)' : 'var(--muted)'
                }}>
                {id === 'lessons' ? 'By Lesson' : 'By Tag'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>Sort:</div>
          {[
            ['completion', '% Done'],
            ['count', 'Count'],
            ['weak', 'Weak'],
            ['name', 'A–Z']
          ].map(([id, label]) => (
            <button key={id} onClick={() => setSortBy(id as typeof sortBy)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${sortBy === id ? 'var(--primary)' : 'var(--border2)'}`,
                background: sortBy === id ? 'var(--pg)' : 'transparent',
                color: sortBy === id ? 'var(--primary)' : 'var(--muted)'
              }}>
              {label}
            </button>
          ))}

          {/* Legend */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {[
              ['var(--green)', '≥90%'],
              ['var(--primary)', '60–89%'],
              ['var(--yellow)', '30–59%'],
              ['var(--red)', '<30%']
            ].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 99, background: c }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Bubble grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', alignItems: 'flex-end' }}>
            {sorted.map(item => {
              const size = nodeSize(item.total);
              const color = nodeColor(item);
              const pct = item.total > 0 ? Math.round(item.done / item.total * 100) : 0;
              const isHov = hovered === item.name;
              return (
                <div key={item.name}
                  className="kmap-node"
                  style={{
                    width: size, height: size, background: color.bg, borderColor: color.border,
                    boxShadow: isHov ? `0 0 24px ${color.glow}, 0 8px 32px rgba(0,0,0,.3)` : '0 2px 12px rgba(0,0,0,.2)'
                  }}
                  onMouseEnter={() => setHovered(item.name)}
                  onMouseLeave={() => setHovered(null)}
                  title={`${item.name}\n${item.done}/${item.total} done · ${item.weak} weak · ${item.fav} fav`}>

                  {/* Completion arc */}
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none"
                      stroke={color.border} strokeWidth={3} strokeOpacity={.2} />
                    <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none"
                      stroke={color.border} strokeWidth={3} strokeOpacity={.7}
                      strokeDasharray={`${2 * Math.PI * (size / 2 - 4)}`}
                      strokeDashoffset={`${2 * Math.PI * (size / 2 - 4) * (1 - pct / 100)}`}
                      strokeLinecap="round"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }} />
                  </svg>

                  {/* Label */}
                  <div style={{
                    position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', padding: 8, textAlign: 'center', gap: 2
                  }}>
                    <div style={{
                      fontSize: Math.max(9, Math.min(13, size / 10)), fontWeight: 700, color: color.text,
                      lineHeight: 1.2, wordBreak: 'break-word', maxWidth: '90%'
                    }}>
                      {item.name.length > 20 ? item.name.slice(0, 18) + '…' : item.name}
                    </div>
                    <div style={{ fontSize: Math.max(10, Math.min(16, size / 8)), fontWeight: 800, color: 'var(--text)' }}>
                      {pct}%
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1.2 }}>
                      {item.done}/{item.total}
                      {item.weak > 0 && <span style={{ color: 'var(--red)' }}> · ⚡{item.weak}</span>}
                      {item.fav > 0 && <span style={{ color: 'var(--yellow)' }}> · ★{item.fav}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TV LAUNCHER ─────────────────────────────────────────────────────────
export interface TVLauncherProps {
  questions: Question[];
  collections: Collection[];
  availableLessons: string[];
  allTags: { tags: string[] } | string[];
  completedIds: Set<string | number>;
  favIds: Set<string | number>;
  weakIds: Set<string | number>;
  tvHistory: TVHistoryEntry[];
  onSaveHistory: (entry: TVHistoryEntry) => void;
  onDeleteHistory: (id: string) => void;
  onRenameHistory: (id: string, name: string) => void;
  onStart: (session: TVSession) => void;
  onClose: () => void;
}

export function TVLauncher({
  questions, collections, availableLessons, allTags, completedIds, favIds, weakIds,
  tvHistory, onSaveHistory, onDeleteHistory, onRenameHistory, onStart, onClose
}: TVLauncherProps) {

  const defaultConfig: TVConfig = {
    name: 'TV Session',
    lessons: [],
    tags: [],
    qFilter: 'all',
    searchWord: '',
    collectionId: null,
    randomize: true,
    maxQs: 0,
    showQuestion: true,
    showOptions: true,
    showAnswer: true,
    showExplanation: true,
    questionTime: 8,
    optionsTime: 5,
    answerTime: 6,
    explanationTime: 5,
    loop: false,
  };

  const [cfg, setCfg] = useState<TVConfig>(defaultConfig);
  const [tab, setTab] = useState<'settings' | 'history'>('settings');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const set = <K extends keyof TVConfig>(k: K, v: TVConfig[K]) => setCfg(p => ({ ...p, [k]: v }));

  const tagsList = useMemo(() => {
    if (Array.isArray(allTags)) return allTags;
    if (allTags && Array.isArray(allTags.tags)) return allTags.tags;
    return [];
  }, [allTags]);

  const pool = useMemo(() => {
    let qs = [...questions];
    if (cfg.collectionId) {
      const col = collections.find(c => c.id === cfg.collectionId);
      if (col) qs = qs.filter(q => col.qIds.includes(q.id));
    }
    if (cfg.lessons.length > 0) qs = qs.filter(q => cfg.lessons.includes(q.lesson || ''));
    if (cfg.tags.length > 0) qs = qs.filter(q => {
      const t = q.tag || '';
      return cfg.tags.some(tag => t.includes(tag));
    });
    if (cfg.searchWord.trim()) {
      const lo = cfg.searchWord.trim().toLowerCase();
      qs = qs.filter(q => [q.question, ...(q.options || []), q.answerText || '', q.explanation || ''].join(' ').toLowerCase().includes(lo));
    }
    if (cfg.qFilter === 'unsolved') qs = qs.filter(q => !completedIds.has(q.id));
    else if (cfg.qFilter === 'done') qs = qs.filter(q => completedIds.has(q.id));
    else if (cfg.qFilter === 'fav') qs = qs.filter(q => favIds.has(q.id));
    else if (cfg.qFilter === 'weak') qs = qs.filter(q => weakIds.has(q.id));
    if (cfg.randomize) qs = [...qs].sort(() => Math.random() - 0.5);
    if (cfg.maxQs > 0) qs = qs.slice(0, cfg.maxQs);
    return qs;
  }, [questions, collections, completedIds, favIds, weakIds, cfg]);

  const totalSeconds = useMemo(() => {
    let perQ = 0;
    if (cfg.showQuestion) perQ += cfg.questionTime;
    if (cfg.showOptions) perQ += cfg.optionsTime;
    if (cfg.showAnswer) perQ += cfg.answerTime;
    if (cfg.showExplanation) perQ += cfg.explanationTime;
    return pool.length * perQ;
  }, [pool, cfg]);

  const fmt = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), sec = s % 60;
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  };

  const handleStart = () => {
    if (!pool.length) return;
    const entry: TVHistoryEntry = { id: Date.now().toString(), name: cfg.name || 'TV Session', config: cfg, ts: Date.now() };
    onSaveHistory(entry);
    onStart({ questions: pool, config: cfg });
  };

  const loadHistory = (h: TVHistoryEntry) => {
    setCfg({ ...defaultConfig, ...h.config });
    setTab('settings');
  };

  const TagChip = ({ tag }: { tag: string }) => (
    <button onClick={() => set('tags', cfg.tags.includes(tag) ? cfg.tags.filter(t => t !== tag) : [...cfg.tags, tag])}
      style={{
        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
        border: `1px solid ${cfg.tags.includes(tag) ? 'var(--primary)' : 'var(--border2)'}`,
        background: cfg.tags.includes(tag) ? 'var(--pg)' : 'var(--card2)',
        color: cfg.tags.includes(tag) ? 'var(--primary)' : 'var(--muted)'
      }}>
      {tag}
    </button>
  );

  const TimeInput = ({ label, val, k }: { label: string; val: number; k: keyof TVConfig }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
      <input type="number" min={2} max={120} value={val} onChange={e => set(k, Math.max(2, parseInt(e.target.value) || 2) as any)}
        style={{
          width: 56, textAlign: 'center', padding: '5px 4px', borderRadius: 6, border: '1px solid var(--border2)',
          background: 'var(--card2)', color: 'var(--text)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)'
        }} />
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>sec</span>
    </div>
  );

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            📺
            <input value={cfg.name} onChange={e => set('name', e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none', fontWeight: 800, fontSize: 17,
                color: 'var(--text)', fontFamily: 'var(--font)', borderBottom: '1px dashed var(--border2)',
                paddingBottom: 1, minWidth: 60, maxWidth: 220
              }}
              placeholder="Session name…" />
          </div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {[
            ['settings', '⚙ Settings'],
            ['history', `🕒 History (${tvHistory.length})`]
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'none',
                borderBottom: tab === id ? '2px solid var(--primary)' : '2px solid transparent',
                color: tab === id ? 'var(--primary)' : 'var(--muted)', marginBottom: -1
              }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Question filter */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 7 }}>Question Filter</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {[
                  ['all', 'All'],
                  ['unsolved', '○ Unsolved'],
                  ['done', '✓ Done'],
                  ['fav', '★ Fav'],
                  ['weak', '⚡ Weak']
                ].map(([id, label]) => (
                  <button key={id} onClick={() => set('qFilter', id)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${cfg.qFilter === id ? 'var(--primary)' : 'var(--border2)'}`,
                      background: cfg.qFilter === id ? 'var(--pg)' : 'var(--card2)',
                      color: cfg.qFilter === id ? 'var(--primary)' : 'var(--muted)'
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <input className="input" placeholder="Search word filter…" value={cfg.searchWord}
                onChange={e => set('searchWord', e.target.value)} style={{ marginBottom: 6 }} />
            </div>

            {/* Lessons */}
            {availableLessons.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 7 }}>
                  Lessons <span style={{ fontWeight: 400, textTransform: 'none' }}>(empty = all)</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxHeight: 80, overflowY: 'auto' }}>
                  {availableLessons.filter(l => l && l !== 'General').map(l => (
                    <button key={l} onClick={() => set('lessons', cfg.lessons.includes(l) ? cfg.lessons.filter(x => x !== l) : [...cfg.lessons, l])}
                      style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${cfg.lessons.includes(l) ? 'var(--green)' : 'var(--border2)'}`,
                        background: cfg.lessons.includes(l) ? 'var(--gg)' : 'var(--card2)',
                        color: cfg.lessons.includes(l) ? 'var(--green)' : 'var(--muted)'
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tagsList.filter(t => t !== '__REST__').length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 7 }}>
                  Tags <span style={{ fontWeight: 400, textTransform: 'none' }}>(empty = all)</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxHeight: 70, overflowY: 'auto' }}>
                  {tagsList.filter(t => t !== '__REST__').map(t => <TagChip key={t} tag={t} />)}
                </div>
              </div>
            )}

            {/* What to show per slide */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 7 }}>Show Per Slide</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  ['showQuestion', '❓ Question'],
                  ['showOptions', '☑ Options'],
                  ['showAnswer', '✓ Answer'],
                  ['showExplanation', '📖 Explanation']
                ].map(([k, label]) => (
                  <label key={k} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${cfg[k as keyof TVConfig] ? 'var(--primary)' : 'var(--border2)'}`,
                    background: cfg[k as keyof TVConfig] ? 'var(--pg)' : 'var(--card2)', fontSize: 12, fontWeight: 600,
                    color: cfg[k as keyof TVConfig] ? 'var(--primary)' : 'var(--muted)'
                  }}>
                    <input type="checkbox" checked={Boolean(cfg[k as keyof TVConfig])} onChange={e => set(k as keyof TVConfig, e.target.checked as any)} style={{ accentColor: 'var(--primary)' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Timing */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 10 }}>
                Slide Duration (seconds)
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {cfg.showQuestion && <TimeInput label="Question" val={cfg.questionTime} k="questionTime" />}
                {cfg.showOptions && <TimeInput label="Options" val={cfg.optionsTime} k="optionsTime" />}
                {cfg.showAnswer && <TimeInput label="Answer" val={cfg.answerTime} k="answerTime" />}
                {cfg.showExplanation && <TimeInput label="Explanation" val={cfg.explanationTime} k="explanationTime" />}
              </div>
            </div>

            {/* Misc */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
                <input type="checkbox" checked={cfg.randomize} onChange={e => set('randomize', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                Randomize order
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
                <input type="checkbox" checked={cfg.loop} onChange={e => set('loop', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                Loop
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Max Qs:</span>
                <input type="number" min={0} value={cfg.maxQs} onChange={e => set('maxQs', Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: 60, textAlign: 'center', padding: '4px', borderRadius: 6, border: '1px solid var(--border2)',
                    background: 'var(--card2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)'
                  }} />
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>(0=all)</span>
              </div>
            </div>

            {/* Summary + Start */}
            <div style={{
              background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {pool.length > 0 ? <><span style={{ color: 'var(--primary)', fontSize: 20 }}>{pool.length}</span> questions</> : <span style={{ color: 'var(--red)' }}>No questions match</span>}
                </div>
                {pool.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    Total runtime ~<strong style={{ color: 'var(--text)' }}>{fmt(totalSeconds)}</strong>
                  </div>
                )}
              </div>
              <button className="btn primary" style={{ fontSize: 14, padding: '9px 24px' }}
                onClick={handleStart} disabled={pool.length === 0}>
                ▶ Start TV
              </button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ minHeight: 300 }}>
            {tvHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontSize: 13 }}>
                No history yet. Run a TV session to save settings here.
              </div>
            ) : tvHistory.map(h => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6
              }}>
                {editingId === h.id ? (
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onBlur={() => { onRenameHistory(h.id, editName.trim() || h.name); setEditingId(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { onRenameHistory(h.id, editName.trim() || h.name); setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
                    style={{
                      flex: 1, background: 'var(--card)', border: '1px solid var(--primary)', borderRadius: 5,
                      padding: '3px 8px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none'
                    }} />
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(h.ts).toLocaleString()} ·{' '}
                      {h.config?.qFilter || 'all'} · {h.config?.lessons?.length > 0 ? h.config.lessons.slice(0, 2).join(', ') : 'all lessons'}
                    </div>
                  </div>
                )}
                <button className="tv-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setEditingId(h.id); setEditName(h.name); }} title="Rename">✎</button>
                <button className="btn primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => loadHistory(h)}>Load</button>
                <button className="btn" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => onDeleteHistory(h.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TV PLAYER ───────────────────────────────────────────────────────────
export interface TVPlayerProps {
  session: TVSession;
  favIds: Set<string | number>;
  completedIds: Set<string | number>;
  onToggleFav: (id: string | number) => void;
  onToggleDone: (id: string | number) => void;
  onClose: () => void;
}

interface Phase {
  type: 'question' | 'options' | 'answer' | 'explanation';
  dur: number;
}

export function TVPlayer({ session, favIds, completedIds, onToggleFav, onToggleDone, onClose }: TVPlayerProps) {
  const { questions: deck, config: cfg } = session;

  const buildPhases = (q: Question, c: TVConfig): Phase[] => {
    const phases: Phase[] = [];
    if (c.showQuestion) phases.push({ type: 'question', dur: c.questionTime });
    if (c.showOptions && q.options && q.options.length > 0) phases.push({ type: 'options', dur: c.optionsTime });
    if (c.showAnswer) phases.push({ type: 'answer', dur: c.answerTime });
    if (c.showExplanation && q.explanation) phases.push({ type: 'explanation', dur: c.explanationTime });
    if (phases.length === 0) phases.push({ type: 'question', dur: c.questionTime || 8 });
    return phases;
  };

  const [qIdx, setQIdx] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [fontSize, setFontSize] = useState(100); // percentage, 60–180
  const [localFavs, setLocalFavs] = useState(() => new Set(favIds));
  const [localDone, setLocalDone] = useState(() => new Set(completedIds));
  const [actionFlash, setActionFlash] = useState<{ text: string; color: string } | null>(null);
  const slideRef = useRef<HTMLDivElement | null>(null);

  const q = deck[qIdx];
  const phases = useMemo(() => q ? buildPhases(q, cfg) : [], [q, cfg]);
  const phase = phases[phaseIdx];

  const advance = () => {
    if (phaseIdx + 1 < phases.length) { setPhaseIdx(p => p + 1); }
    else if (qIdx + 1 < deck.length) { setQIdx(i => i + 1); setPhaseIdx(0); }
    else if (cfg.loop) { setQIdx(0); setPhaseIdx(0); }
    else { setDone(true); }
  };

  const retreat = () => {
    if (phaseIdx > 0) { setPhaseIdx(p => p - 1); }
    else if (qIdx > 0) { setQIdx(i => i - 1); setPhaseIdx(0); }
  };

  // Reset slide scroll + timer on phase/q change
  useEffect(() => {
    if (!phase) return;
    setTimeLeft(phase.dur);
    setAnimKey(k => k + 1);
    if (slideRef.current) slideRef.current.scrollTop = 0;
  }, [qIdx, phaseIdx, phase]);

  // Countdown
  useEffect(() => {
    if (paused || done || timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) advance();
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => (tl !== null ? tl - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, paused, done]);

  const flash = (text: string, color = '#3ecf8e') => {
    setActionFlash({ text, color });
    setTimeout(() => setActionFlash(null), 1200);
  };

  const changeFontSize = (delta: number) => setFontSize(s => Math.min(180, Math.max(60, s + delta)));

  const toggleFav = () => {
    if (!q) return;
    onToggleFav(q.id);
    setLocalFavs(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
    flash(localFavs.has(q.id) ? '★ Removed from Fav' : '★ Added to Fav', '#f5a623');
  };

  const toggleDone = () => {
    if (!q) return;
    onToggleDone(q.id);
    setLocalDone(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
    flash(localDone.has(q.id) ? '○ Marked Unsolved' : '✓ Marked Done', '#3ecf8e');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); return; }
      if (e.key === 'ArrowRight' || e.key === 'l') { advance(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'h') { retreat(); return; }
      if (e.key === 'ArrowUp' || e.key === '=') { e.preventDefault(); changeFontSize(+10); return; }
      if (e.key === 'ArrowDown' || e.key === '-') { e.preventDefault(); changeFontSize(-10); return; }
      if (e.key === '0') { setFontSize(100); return; }
      if (e.key === 'f' || e.key === 'F') { toggleFav(); return; }
      if (e.key === 'd' || e.key === 'D') { toggleDone(); return; }
      if (e.key === 'PageDown' || e.key === 'j') {
        if (slideRef.current) slideRef.current.scrollTop += 120;
      }
      if (e.key === 'PageUp' || e.key === 'k') {
        if (slideRef.current) slideRef.current.scrollTop -= 120;
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [phaseIdx, qIdx, phases, deck, cfg, localFavs, localDone, onClose]);

  if (!q) return null;

  const totalPhases = deck.reduce((s, qq) => s + buildPhases(qq, cfg).length, 0);
  const donePhases = deck.slice(0, qIdx).reduce((s, qq) => s + buildPhases(qq, cfg).length, 0) + phaseIdx;
  const overallPct = totalPhases > 0 ? (donePhases / totalPhases) * 100 : 0;
  const phasePct = phase && timeLeft !== null ? ((phase.dur - timeLeft) / phase.dur) * 100 : 0;

  const phaseLabels: Record<Phase['type'], string> = {
    question: 'Question',
    options: 'Options',
    answer: 'Answer',
    explanation: 'Explanation'
  };

  const bgGradients: Record<Phase['type'], string> = {
    question: 'radial-gradient(ellipse at 60% 40%, #0d1a3a 0%, #050a14 70%)',
    options: 'radial-gradient(ellipse at 40% 60%, #0a1a2a 0%, #050a14 70%)',
    answer: 'radial-gradient(ellipse at 50% 30%, #0a2a1a 0%, #050a14 70%)',
    explanation: 'radial-gradient(ellipse at 50% 70%, #1a0a2a 0%, #050a14 70%)',
  };

  const isFav = localFavs.has(q.id);
  const isDone = localDone.has(q.id);
  const scale = fontSize / 100;

  if (done) return (
    <div className="tv-overlay" style={{ alignItems: 'center', justifyContent: 'center', background: '#050a14' }}>
      <div style={{ textAlign: 'center', color: '#fff', padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎬</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>That's a wrap!</div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,.5)', marginBottom: 32 }}>{deck.length} questions covered</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="tv-btn primary" onClick={() => { setQIdx(0); setPhaseIdx(0); setDone(false); }}>↺ Replay</button>
          <button className="tv-btn" onClick={onClose}>✕ Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="tv-overlay">
      {/* Overall progress bar */}
      <div className="tv-progress-bar">
        <div className="tv-progress-fill" style={{ width: `${overallPct}%`, transition: 'width .5s linear' }} />
      </div>

      {/* Slide — scrollable */}
      <div ref={slideRef} className="tv-slide"
        style={{ background: bgGradients[phase?.type] || bgGradients.question, overflowY: 'auto' }}
        key={animKey}>

        {/* Phase label top-center */}
        <div className="tv-phase-label">{phaseLabels[phase?.type] || ''}</div>

        {/* Status badges top-right */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', gap: 8 }}>
          {isDone && <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
            background: 'rgba(62,207,142,.25)', color: '#3ecf8e', border: '1px solid #3ecf8e44'
          }}>✓ Done</span>}
          {isFav && <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
            background: 'rgba(245,166,35,.25)', color: '#f5a623', border: '1px solid #f5a62344'
          }}>★ Fav</span>}
        </div>

        {/* Action flash overlay */}
        {actionFlash && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            fontSize: 28, fontWeight: 800, color: actionFlash.color,
            background: 'rgba(0,0,0,.7)', padding: '14px 32px', borderRadius: 14,
            border: `2px solid ${actionFlash.color}44`, pointerEvents: 'none',
            animation: 'tvFadeIn .15s ease-out', whiteSpace: 'nowrap', zIndex: 10
          }}>
            {actionFlash.text}
          </div>
        )}

        {/* Content wrapper with font scale */}
        <div style={{
          width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0, paddingBottom: 20
        }}>

          {/* Q number + lesson */}
          <div className="tv-lesson" style={{ fontSize: `${13 * scale}px` }}>
            Q{qNum(q.id)}{q.lesson && q.lesson !== 'General' ? ` · ${q.lesson}` : ''}
          </div>

          {/* Question text */}
          <div className="tv-q-text tv-anim" style={{ fontSize: `${Math.round(32 * scale)}px` }} key={`q-${qIdx}`}>
            {q.question}
          </div>

          {/* Options */}
          {(phase?.type === 'options' || phase?.type === 'answer' || phase?.type === 'explanation') &&
            q.options && q.options.length > 0 && (
              <div style={{ marginTop: 20, width: '100%' }} className="tv-anim">
                {q.options.map((opt, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  const isCorrect = q.answerKey && q.answerKey.toUpperCase() === letter;
                  const showReveal = phase?.type === 'answer' || phase?.type === 'explanation';
                  return (
                    <div key={oi} className={`tv-option ${showReveal ? (isCorrect ? 'reveal-correct' : 'reveal-wrong') : ''}`}
                      style={{ fontSize: `${Math.round(17 * scale)}px`, marginBottom: `${8 * scale}px` }}>
                      <span style={{ fontWeight: 800, minWidth: `${28 * scale}px`, fontSize: 'inherit', flexShrink: 0 }}>{letter})</span>
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}

          {/* Answer box (no options) */}
          {(phase?.type === 'answer' || phase?.type === 'explanation') && (!q.options || !q.options.length) && (
            <div className="tv-answer-box tv-anim" style={{ fontSize: `${Math.round(20 * scale)}px`, marginTop: 20 }}>
              ✓ {q.answerKey ? `${q.answerKey} — ` : ''}{q.answerText}
            </div>
          )}

          {/* Explanation */}
          {phase?.type === 'explanation' && q.explanation && (
            <div className="tv-explanation tv-anim" style={{ fontSize: `${Math.round(15 * scale)}px`, marginTop: 10 }}>
              {q.explanation}
            </div>
          )}
        </div>

        {/* Timer arc — bottom left */}
        <div style={{ position: 'sticky', bottom: 12, left: 28, alignSelf: 'flex-start', marginTop: 'auto', flexShrink: 0 }}>
          <svg width={44} height={44} viewBox="0 0 44 44">
            <circle cx={22} cy={22} r={18} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={3} />
            <circle cx={22} cy={22} r={18} fill="none" stroke="var(--primary)" strokeWidth={3}
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - phasePct / 100)}`}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '22px 22px', transition: 'stroke-dashoffset 1s linear' }} />
            <text x={22} y={27} textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize={12} fontFamily="monospace" fontWeight={700}>
              {timeLeft}
            </text>
          </svg>
        </div>

        <div className="tv-slide-num">{qIdx + 1} / {deck.length}</div>
      </div>

      {/* Phase progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '7px 0', background: 'rgba(0,0,0,.4)', flexShrink: 0 }}>
        {phases.map((ph, i) => (
          <div key={i} onClick={() => { setPhaseIdx(i); setTimeLeft(phases[i].dur); }}
            title={phaseLabels[ph.type]}
            style={{
              width: i === phaseIdx ? 24 : 8, height: 8, borderRadius: 4, transition: 'all .3s', cursor: 'pointer',
              background: i < phaseIdx ? 'var(--green)' : i === phaseIdx ? 'var(--primary)' : 'rgba(255,255,255,.2)'
            }} />
        ))}
      </div>

      {/* Controls bar */}
      <div className="tv-controls" style={{ gap: 6 }}>
        {/* Nav */}
        <button className="tv-btn" onClick={retreat} title="Previous phase (← / h)">◀</button>
        <button className="tv-btn primary" onClick={() => setPaused(p => !p)} title="Play/Pause (Space)" style={{ minWidth: 76 }}>
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>
        <button className="tv-btn" onClick={advance} title="Next phase (→ / l)">▶</button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)', margin: '0 4px' }} />

        {/* Fav / Done */}
        <button className="tv-btn" onClick={toggleFav} title="Toggle Favourite (F)"
          style={{
            color: isFav ? '#f5a623' : 'rgba(255,255,255,.5)',
            borderColor: isFav ? '#f5a62366' : 'rgba(255,255,255,.15)',
            background: isFav ? 'rgba(245,166,35,.15)' : undefined
          }}>
          {isFav ? '★' : '☆'} Fav
        </button>
        <button className="tv-btn" onClick={toggleDone} title="Toggle Done (D)"
          style={{
            color: isDone ? '#3ecf8e' : 'rgba(255,255,255,.5)',
            borderColor: isDone ? '#3ecf8e66' : 'rgba(255,255,255,.15)',
            background: isDone ? 'rgba(62,207,142,.15)' : undefined
          }}>
          {isDone ? '✓' : '○'} Done
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)', margin: '0 4px' }} />

        {/* Font size */}
        <button className="tv-btn" onClick={() => changeFontSize(-10)} title="Smaller font (↓ / -)">A−</button>
        <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, fontFamily: 'var(--mono)', minWidth: 36, textAlign: 'center' }}>
          {fontSize}%
        </span>
        <button className="tv-btn" onClick={() => changeFontSize(+10)} title="Larger font (↑ / =)">A+</button>
        <button className="tv-btn" onClick={() => setFontSize(100)} title="Reset font size (0)"
          style={{ fontSize: 10, padding: '6px 8px', color: 'rgba(255,255,255,.35)' }}>reset</button>

        <div style={{ flex: 1 }} />

        {/* Phase + time info */}
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, fontFamily: 'var(--mono)' }}>
          {phaseLabels[phase?.type]} · {timeLeft}s
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)', margin: '0 4px' }} />
        <button className="tv-btn" onClick={onClose} title="Exit (Esc)" style={{ color: 'rgba(255,255,255,.4)' }}>✕ Exit</button>
      </div>
    </div>
  );
}
