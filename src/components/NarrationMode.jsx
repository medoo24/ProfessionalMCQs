const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
// ═══════════════════════════════════════════════════════════════════════
// NarrationMode.jsx — Text-to-speech narration mode
// Also includes: LessonFilterPanel, TagFilterPanel helper components
// ═══════════════════════════════════════════════════════════════════════

function LessonFilterPanel({ availableLessons, selectedLessons, onToggle, onClear }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(), 50); }, []);
  const filtered = q.trim() ? availableLessons.filter(l=>l.toLowerCase().includes(q.toLowerCase())) : availableLessons;
  return (
    <div className="dropdown" style={{width:300,padding:0,overflow:'hidden'}}>
      <div style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:6}}>
        <I.Search/>
        <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search lessons…"
          style={{flex:1,background:'none',border:'none',outline:'none',fontSize:13,color:'var(--text)',fontFamily:'var(--font)'}}/>
        {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:0,lineHeight:1}}><I.X s={12}/></button>}
      </div>
      {selectedLessons.size>0&&(
        <div className="dd-item" onClick={onClear} style={{color:'var(--red)',fontWeight:700,borderBottom:'1px solid var(--border)',fontSize:12}}>✕ Clear all ({selectedLessons.size})</div>
      )}
      <div style={{maxHeight:280,overflowY:'auto'}}>
        {filtered.length===0&&<div style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>No matches</div>}
        {filtered.map(l=>(
          <div key={l} className="dd-item" onClick={()=>onToggle(l)}
            style={{background:selectedLessons.has(l)?'var(--pg)':undefined}}>
            <input type="checkbox" checked={selectedLessons.has(l)} onChange={()=>{}} style={{accentColor:'var(--primary)',flexShrink:0}}/>
            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              color:selectedLessons.has(l)?'var(--primary)':undefined}} title={l}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagFilterPanel({ allTags, restTags, selectedTags, onToggle, onClear, questions, customTags, floatMode }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(), 50); }, []);

  const tagCounts = useMemo(()=>{
    const m = {};
    questions.forEach(q=>{
      const t = customTags[q.id]||q.tag;
      if (t&&t.trim()) m[t.trim()]=(m[t.trim()]||0)+1;
    });
    if (restTags&&restTags.length>0)
      m['__REST__'] = restTags.reduce((acc,t)=>acc+(m[t]||0),0);
    return m;
  },[questions,customTags,restTags]);

  const filtered = useMemo(()=>{
    if (!q.trim()) return allTags;
    const lo = q.toLowerCase();
    return allTags.filter(t => t==='__REST__' ? 'rest'.includes(lo) : t.toLowerCase().includes(lo));
  },[allTags, q]);

  return (
    <div style={{
      position: floatMode ? 'fixed' : 'absolute',
      top: floatMode ? 112 : 'calc(100% + 6px)',
      left: floatMode ? 'unset' : 0,
      width:300,
      background:'var(--card)',border:'1px solid var(--border2)',borderRadius:'var(--r)',
      boxShadow:'var(--shadowl)',zIndex:200,animation:'fadeUp .15s ease-out',
      overflow:'hidden'
    }}>
      {/* Search */}
      <div style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:6}}>
        <I.Search/>
        <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search tags…"
          style={{flex:1,background:'none',border:'none',outline:'none',fontSize:13,color:'var(--text)',fontFamily:'var(--font)'}}/>
        {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:0,lineHeight:1}}><I.X s={12}/></button>}
      </div>
      {/* Clear all */}
      {selectedTags.size>0&&(
        <div className="dd-item" onClick={onClear} style={{color:'var(--red)',fontWeight:700,borderBottom:'1px solid var(--border)',fontSize:12}}>✕ Clear all ({selectedTags.size})</div>
      )}
      {/* Scrollable list */}
      <div style={{maxHeight:280,overflowY:'auto'}}>
        {filtered.length===0&&<div style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>No matches</div>}
        {filtered.map(t=>{
          const active = selectedTags.has(t);
          const cnt = tagCounts[t]||0;
          const isRest = t==='__REST__';
          const label = isRest ? `Rest (${restTags?.length||0} misc)` : t;
          return (
            <div key={t} className="dd-item" onClick={()=>onToggle(t)}
              title={isRest ? `Tags >40 chars with 1 question:\n${(restTags||[]).slice(0,8).join('\n')}${restTags?.length>8?'\n…':''}` : t}
              style={{background: active ? 'var(--pg)' : undefined}}>
              <input type="checkbox" checked={active} onChange={()=>{}}
                style={{accentColor:'var(--primary)',flexShrink:0}}/>
              <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                color: active ? 'var(--primary)' : undefined,
                fontStyle: isRest ? 'italic' : undefined}}>
                {label}
              </span>
              <span style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)',flexShrink:0}}>{cnt}</span>
            </div>
          );
        })}

        {/* Rest info row */}
        {restTags&&restTags.length>0&&(
          <div style={{padding:'6px 14px',fontSize:10,color:'var(--muted)',
            borderTop:'1px solid var(--border)',lineHeight:1.5}}>
            <b>Rest</b> = {restTags.length} tag{restTags.length>1?'s':''} &gt;40 chars with 1 question
          </div>
        )}
      </div>
    </div>
  );
}
// ── NARRATION MODE ──────────────────────────────────────────────────────
function scoreVoice(v) {
  const name = (v.name || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase();

  const isUK = lang.includes('gb') || lang.includes('uk') || name.includes('uk') || name.includes('united kingdom') || name.includes('british') || name.includes('great britain');
  const isUS = lang.includes('us') || name.includes('us') || name.includes('united states');
  const isFemale = name.includes('female') || name.includes('woman') || name.includes('girl') || name.includes('zira') || name.includes('samantha') || name.includes('victoria') || name.includes('karen') || name.includes('aria') || name.includes('jenny') || name.includes('sonia') || name.includes('ava') || name.includes('emma') || name === 'google us english' || name.includes('google us english') || name.includes('google uk english female');
  const isMale = name.includes('male') || name.includes('man') || name.includes('guy') || name.includes('boy') || name.includes('david') || name.includes('george') || name.includes('mark') || name.includes('google uk english male');
  const isGoogle = name.includes('google');
  const isRoboticDesktop = name.includes('desktop') || (name.includes('microsoft') && !name.includes('natural') && !name.includes('online'));

  // 1. Female UK (Google UK English Female first, then other UK female)
  if (isGoogle && (name.includes('google uk english female') || (isUK && isFemale && !isMale))) return 2000;
  if (isUK && isFemale && !isRoboticDesktop) return 1900;
  if (isUK && !isMale && !isRoboticDesktop) return 1850;

  // 2. Male UK (Google UK English Male first, then other UK male)
  if (isGoogle && (name.includes('google uk english male') || (isUK && isMale))) return 1800;
  if (isUK && isMale && !isRoboticDesktop) return 1700;
  if (isUK && !isRoboticDesktop) return 1650;

  // 3. Female US (Google US English first, then other US female)
  if (isGoogle && (name.includes('google us english') || (isUS && isFemale))) return 1600;
  if (isGoogle && isUS && !isMale) return 1550;
  if (isUS && isFemale && !isRoboticDesktop) return 1500;
  if (isFemale && !isRoboticDesktop) return 1400;

  // 4. Other Google English voices
  if (isGoogle && lang.startsWith('en')) return 1300;
  if (isGoogle) return 1200;

  // 5. Natural / Online English voices
  if (name.includes('natural') || name.includes('online')) return 1000;

  // Deprioritize awful desktop SAPI voices
  if (isRoboticDesktop) return -500;

  // Other English
  if (lang.startsWith('en')) return 500;

  return 0;
}

function NarrationMode({ questions, displaySettings, favIds = new Set(), completedIds = new Set(), onToggleFav, onToggleDone, onClose }) {
  // Freeze question deck on open so marking done never shifts or removes questions mid-narration
  const [deck] = useState(() => (questions && questions.length > 0 ? [...questions] : []));
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRateState] = useState(() => parseFloat(localStorage.getItem('pmcq_narr_rate')) || 1.0);
  const [pitch, setPitchState] = useState(() => parseFloat(localStorage.getItem('pmcq_narr_pitch')) || 1.0);
  const [voices, setVoices] = useState([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [autoAdvance, setAutoAdvanceState] = useState(() => {
    const saved = localStorage.getItem('pmcq_narr_autoadvance');
    return saved !== null ? saved === 'true' : true;
  });
  const [readOptions, setReadOptions] = useState(true);
  const [readAnswer, setReadAnswer] = useState(true);
  const [readExplanation, setReadExplanation] = useState(true);
  const [localFavs, setLocalFavs] = useState(() => new Set(favIds));
  const [localDone, setLocalDone] = useState(() => new Set(completedIds));
  const [actionFlash, setActionFlash] = useState(null); // {text, color}
  const uttRef = useRef(null);
  const synth = window.speechSynthesis;

  useEffect(() => { setLocalFavs(new Set(favIds)); }, [favIds]);
  useEffect(() => { setLocalDone(new Set(completedIds)); }, [completedIds]);

  const setRate = (v) => {
    setRateState(v);
    try { localStorage.setItem('pmcq_narr_rate', String(v)); } catch(e) {}
  };

  const setPitch = (v) => {
    setPitchState(v);
    try { localStorage.setItem('pmcq_narr_pitch', String(v)); } catch(e) {}
  };

  const setAutoAdvance = (v) => {
    setAutoAdvanceState(v);
    try { localStorage.setItem('pmcq_narr_autoadvance', String(v)); } catch(e) {}
  };

  const flash = (text, color='#3ecf8e') => {
    setActionFlash({ text, color });
    setTimeout(() => setActionFlash(null), 1200);
  };

  useEffect(() => {
    const load = () => {
      const all = synth.getVoices() || [];
      if (all.length === 0) return;
      const en = all.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
      const list = (en.length > 0 ? en : all).slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));

      setVoices(list);

      const saved = localStorage.getItem('pmcq_narr_voice');
      let targetIdx = 0;
      if (saved) {
        const found = list.findIndex(v => v.name === saved);
        if (found !== -1) targetIdx = found;
      }
      setVoiceIdx(targetIdx);
    };

    load();
    synth.addEventListener('voiceschanged', load);
    return () => {
      synth.cancel();
      synth.removeEventListener('voiceschanged', load);
    };
  }, []);

  const q = deck[idx];

  const toggleFav = () => {
    if (!q) return;
    if (onToggleFav) onToggleFav(q.id);
    const nextIsFav = !localFavs.has(q.id);
    setLocalFavs(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
    flash(nextIsFav ? '★ Added to Fav' : '★ Removed from Fav', '#f5a623');
  };

  const toggleDone = () => {
    if (!q) return;
    if (onToggleDone) onToggleDone(q.id);
    const nextIsDone = !localDone.has(q.id);
    setLocalDone(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
    flash(nextIsDone ? '✓ Marked Done' : '○ Marked Unsolved', '#3ecf8e');
  };

  const copyQuestion = () => {
    if (!q) return;
    let txt = `Q: ${q.question}\n\n`;
    if (q.options?.length) {
      txt += q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n') + '\n\n';
    }
    if (q.answerKey || q.answerText) {
      txt += `Answer: ${q.answerKey ? q.answerKey + ' — ' : ''}${q.answerText || ''}\n`;
    }
    if (q.explanation) {
      txt += `Explanation: ${q.explanation}\n`;
    }
    const clip = txt.trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(clip).then(() => {
        flash('📋 Copied to Clipboard', 'var(--primary)');
      }).catch(() => fallbackCopy(clip));
    } else {
      fallbackCopy(clip);
    }
  };

  const fallbackCopy = (clip) => {
    const ta = document.createElement('textarea');
    ta.value = clip;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      flash('📋 Copied to Clipboard', 'var(--primary)');
    } catch(e) {}
    document.body.removeChild(ta);
  };

  const buildScript = (q) => {
    let parts = [`Question ${idx + 1} of ${deck.length}. ${q.question}`];
    if (readOptions && q.options?.length) {
      parts.push('Options:');
      q.options.forEach((o, i) => parts.push(`${['A','B','C','D','E'][i]}. ${o}`));
    }
    if (readAnswer) {
      const ans = q.answerKey ? `${q.answerKey}. ${q.answerText || ''}` : (q.answerText || '');
      if (ans.trim()) parts.push(`Answer: ${ans}`);
    }
    if (readExplanation && q.explanation) {
      parts.push(`Explanation: ${q.explanation}`);
    }
    return parts.join('. ');
  };

  const speak = (text) => {
    synth.cancel();
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.pitch = pitch;
    if (voices[voiceIdx]) {
      utt.voice = voices[voiceIdx];
      utt.lang = voices[voiceIdx].lang || 'en-US';
    }
    utt.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };
    utt.onend = () => {
      setSpeaking(false);
      if (autoAdvance && idx < deck.length - 1) {
        setTimeout(() => setIdx(i => i + 1), 800);
      }
    };
    utt.onerror = () => setSpeaking(false);
    uttRef.current = utt;
    synth.speak(utt);
  };

  useEffect(() => {
    if (!q || voices.length === 0) return;
    setShowAnswer(false);
    if (!paused) {
      speak(buildScript(q));
    } else {
      synth.cancel();
      setSpeaking(false);
    }
    return () => synth.cancel();
  }, [idx, rate, pitch, voiceIdx, readOptions, readAnswer, readExplanation, voices]);

  const togglePause = () => {
    if (speaking && !paused) {
      synth.cancel();
      setSpeaking(false);
      setPaused(true);
    } else {
      setPaused(false);
      speak(buildScript(q));
    }
  };

  const handleRepeat = () => {
    setPaused(false);
    speak(buildScript(q));
  };

  const go = (n) => {
    synth.cancel();
    setSpeaking(false);
    setIdx(i => Math.max(0, Math.min(deck.length - 1, i + n)));
  };

  useEffect(() => {
    const fn = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') onClose();
        return;
      }
      if (e.key === 'Escape')              { onClose(); return; }
      if (e.key === ' ')                   { e.preventDefault(); togglePause(); return; }
      if (e.key === 'ArrowRight')          { e.preventDefault(); go(+1); return; }
      if (e.key === 'ArrowLeft')           { e.preventDefault(); go(-1); return; }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFav(); return; }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); toggleDone(); return; }
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); copyQuestion(); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); handleRepeat(); return; }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [idx, rate, pitch, voiceIdx, paused, readOptions, readAnswer, readExplanation, voices, q, localFavs, localDone, speaking, deck]);

  if (!q) return null;

  const isFav  = localFavs.has(q.id);
  const isDone = localDone.has(q.id);
  const pct = deck.length > 1 ? (idx / (deck.length - 1)) * 100 : 100;
  const isCorrect = (letter) => q.answerKey && q.answerKey.toUpperCase() === letter;

  const Slider = ({ label, val, min, max, step, onChange }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
      <span style={{ color:'var(--muted)', minWidth:44 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex:1, accentColor:'var(--primary)' }}/>
      <span style={{ color:'var(--text)', fontFamily:'var(--mono)', minWidth:28 }}>{val.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="narr-overlay" onClick={onClose}>
      <div className="narr-card" onClick={e=>e.stopPropagation()} style={{ position:'relative' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ fontWeight:800, fontSize:16, display:'flex', alignItems:'center', gap:8 }}>
            <span className={speaking && !paused ? 'narr-speaking' : ''}>🔊</span>
            Narration Mode
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button className="btn" onClick={copyQuestion} title="Copy Question (C)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}
              style={{ fontSize:12, padding:'4px 10px', borderRadius:8, display:'flex', alignItems:'center', gap:4, fontWeight:700 }}>
              <span>📋</span> Copy
            </button>
            <button className="btn" onClick={toggleFav} title="Toggle Favourite (F)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}
              style={{
                fontSize:12, padding:'4px 10px', borderRadius:8, display:'flex', alignItems:'center', gap:4, fontWeight:700,
                color: isFav ? '#f5a623' : 'var(--muted)',
                borderColor: isFav ? 'rgba(245,166,35,.5)' : 'var(--border2)',
                background: isFav ? 'rgba(245,166,35,.15)' : 'var(--card2)'
              }}>
              <span>{isFav ? '★' : '☆'}</span> Fav
            </button>
            <button className="btn" onClick={toggleDone} title="Toggle Done (D)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}
              style={{
                fontSize:12, padding:'4px 10px', borderRadius:8, display:'flex', alignItems:'center', gap:4, fontWeight:700,
                color: isDone ? '#3ecf8e' : 'var(--muted)',
                borderColor: isDone ? 'rgba(62,207,142,.5)' : 'var(--border2)',
                background: isDone ? 'rgba(62,207,142,.15)' : 'var(--card2)'
              }}>
              <span>{isDone ? '✓' : '○'}</span> Done
            </button>
            <button className="btn ghost" onClick={onClose} style={{ padding:'4px 8px' }} tabIndex="-1">✕</button>
          </div>
        </div>

        {/* Action Flash notification */}
        {actionFlash && (
          <div style={{
            position:'absolute', top:'45%', left:'50%', transform:'translate(-50%,-50%)',
            fontSize:22, fontWeight:800, color:actionFlash.color,
            background:'rgba(0,0,0,.85)', padding:'12px 28px', borderRadius:14,
            border:`2px solid ${actionFlash.color}55`, boxShadow:'0 8px 32px rgba(0,0,0,.5)',
            pointerEvents:'none', animation:'fadeUp .15s ease-out', whiteSpace:'nowrap', zIndex:200
          }}>
            {actionFlash.text}
          </div>
        )}

        {/* Progress */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)', marginBottom:5 }}>
            <span>Q{idx+1} of {deck.length}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="narr-progress"><div className="narr-progress-fill" style={{ width:`${pct}%` }}/></div>
        </div>

        {/* Question */}
        <div className="narr-q">{q.question}</div>

        {/* Options */}
        {q.options?.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {q.options.map((opt, oi) => {
              const letter = String.fromCharCode(65+oi);
              return (
                <div key={oi} className={`narr-opt ${showAnswer && isCorrect(letter) ? 'correct' : ''}`}>
                  <span style={{ fontWeight:700, minWidth:20 }}>{letter})</span>
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        {/* Reveal answer */}
        {!showAnswer ? (
          <button className="btn" style={{ alignSelf:'flex-start', fontSize:12 }} onClick={() => setShowAnswer(true)} tabIndex="-1" onFocus={e=>e.currentTarget.blur()}>
            Show Answer
          </button>
        ) : (
          <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--gg)', border:'1px solid var(--green)',
            color:'var(--green)', fontSize:13, fontWeight:600 }}>
            ✓ {q.answerKey ? `${q.answerKey} — ` : ''}{q.answerText}
            {q.explanation && <div style={{ marginTop:6, fontWeight:400, fontSize:12, color:'var(--text)' }}>{q.explanation}</div>}
          </div>
        )}

        {/* Controls */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <button className="btn" onClick={()=>go(-1)} disabled={idx===0} title="Previous (←)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}>◀</button>
          <button className="btn primary" onClick={togglePause} style={{ minWidth:95 }} tabIndex="-1" onFocus={e=>e.currentTarget.blur()}>
            {paused ? '▶ Resume' : speaking ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="btn" onClick={()=>go(+1)} disabled={idx===deck.length-1} title="Next (→)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}>▶</button>
          <button className="btn" onClick={handleRepeat} title="Repeat (R)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}>↺ Repeat</button>

          <div style={{ width:1, height:20, background:'var(--border2)', margin:'0 2px' }}/>

          <button className="btn" onClick={copyQuestion} title="Copy Question (C)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}
            style={{ fontWeight:700 }}>
            📋 Copy
          </button>
          <button className="btn" onClick={toggleFav} title="Toggle Favourite (F)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}
            style={{
              color: isFav ? '#f5a623' : 'var(--muted)',
              borderColor: isFav ? 'rgba(245,166,35,.5)' : 'var(--border2)',
              background: isFav ? 'rgba(245,166,35,.15)' : 'transparent',
              fontWeight: 700
            }}>
            {isFav ? '★' : '☆'} Fav
          </button>
          <button className="btn" onClick={toggleDone} title="Toggle Done (D)" tabIndex="-1" onFocus={e=>e.currentTarget.blur()}
            style={{
              color: isDone ? '#3ecf8e' : 'var(--muted)',
              borderColor: isDone ? 'rgba(62,207,142,.5)' : 'var(--border2)',
              background: isDone ? 'rgba(62,207,142,.15)' : 'transparent',
              fontWeight: 700
            }}>
            {isDone ? '✓' : '○'} Done
          </button>

          <div style={{ flex:1 }}/>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer', color:'var(--muted)' }}>
            <input type="checkbox" checked={autoAdvance} onChange={e=>setAutoAdvance(e.target.checked)} style={{accentColor:'var(--primary)'}} tabIndex="-1"/>
            Auto-advance
          </label>
        </div>

        {/* Settings accordion */}
        <details style={{ fontSize:12 }}>
          <summary style={{ cursor:'pointer', color:'var(--muted)', fontWeight:600, listStyle:'none', display:'flex', alignItems:'center', gap:6 }}>
            ⚙ Voice Settings
          </summary>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:12 }}>
            {voices.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:'var(--muted)', minWidth:44, fontSize:12 }}>Voice</span>
                <select value={voiceIdx} onChange={e => {
                    const nextIdx = +e.target.value;
                    setVoiceIdx(nextIdx);
                    if (voices[nextIdx]) {
                      try { localStorage.setItem('pmcq_narr_voice', voices[nextIdx].name); } catch(err) {}
                    }
                  }}
                  style={{ flex:1, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border2)',
                    background:'var(--card2)', color:'var(--text)', fontSize:12 }}>
                  {voices.map((v,i) => <option key={i} value={i}>{v.name} {v.lang ? `(${v.lang})` : ''}</option>)}
                </select>
              </div>
            )}
            <Slider label="Speed"  val={rate}  min={0.5} max={2.0} step={0.1} onChange={setRate}/>
            <Slider label="Pitch"  val={pitch} min={0.5} max={2.0} step={0.1} onChange={setPitch}/>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4 }}>
              {[['readOptions','Read options'],['readAnswer','Read answer'],['readExplanation','Read explanation']].map(([k,label])=>(
                <label key={k} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', color:'var(--muted)' }}>
                  <input type="checkbox" checked={k==='readOptions'?readOptions:k==='readAnswer'?readAnswer:readExplanation}
                    onChange={e => {
                      if (k==='readOptions') setReadOptions(e.target.checked);
                      else if (k==='readAnswer') setReadAnswer(e.target.checked);
                      else setReadExplanation(e.target.checked);
                    }} style={{accentColor:'var(--primary)'}} tabIndex="-1"/>
                  {label}
                </label>
              ))}
            </div>
          </div>
        </details>

        <div style={{ fontSize:10, color:'var(--muted)', textAlign:'center' }}>
          Space = play/pause · ← → = navigate · F = fav · D = done · C = copy · R = repeat · Esc = close
        </div>
      </div>
    </div>
  );
}
