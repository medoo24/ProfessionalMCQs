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
function NarrationMode({ questions, displaySettings, onClose }) {
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [voices, setVoices] = useState([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [readOptions, setReadOptions] = useState(true);
  const [readAnswer, setReadAnswer] = useState(true);
  const [readExplanation, setReadExplanation] = useState(true);
  const uttRef = useRef(null);
  const synth = window.speechSynthesis;

  useEffect(() => {
    const load = () => {
      const v = synth.getVoices().filter(v => v.lang.startsWith('en'));
      setVoices(v);
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => { synth.cancel(); synth.removeEventListener('voiceschanged', load); };
  }, []);

  const q = questions[idx];

  const buildScript = (q) => {
    let parts = [`Question ${idx + 1} of ${questions.length}. ${q.question}`];
    if (readOptions && q.options?.length) {
      parts.push('Options:');
      q.options.forEach((o, i) => parts.push(`${['A','B','C','D','E'][i]}. ${o}`));
    }
    if (readAnswer && displaySettings.showAnswer) {
      const ans = q.answerKey ? `${q.answerKey}. ${q.answerText || ''}` : (q.answerText || '');
      if (ans.trim()) parts.push(`Answer: ${ans}`);
    }
    if (readExplanation && displaySettings.showExplanation && q.explanation) {
      parts.push(`Explanation: ${q.explanation}`);
    }
    return parts.join('. ');
  };

  const speak = (text) => {
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.pitch = pitch;
    if (voices[voiceIdx]) utt.voice = voices[voiceIdx];
    utt.onstart  = () => setSpeaking(true);
    utt.onend    = () => {
      setSpeaking(false);
      if (autoAdvance && idx < questions.length - 1) {
        setTimeout(() => setIdx(i => i + 1), 800);
      }
    };
    utt.onerror  = () => setSpeaking(false);
    uttRef.current = utt;
    synth.speak(utt);
  };

  useEffect(() => {
    if (!q) return;
    setShowAnswer(false);
    speak(buildScript(q));
    return () => synth.cancel();
  }, [idx, rate, pitch, voiceIdx, readOptions, readAnswer, readExplanation]);

  const togglePause = () => {
    if (synth.paused) { synth.resume(); setPaused(false); }
    else              { synth.pause();  setPaused(true);  }
  };

  const go = (n) => { synth.cancel(); setIdx(i => Math.max(0, Math.min(questions.length-1, i+n))); };

  useEffect(() => {
    const fn = e => {
      if (e.key === 'Escape')      onClose();
      if (e.key === ' ')           { e.preventDefault(); togglePause(); }
      if (e.key === 'ArrowRight')  go(+1);
      if (e.key === 'ArrowLeft')   go(-1);
      if (e.key === 'r' || e.key==='R') speak(buildScript(q));
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [idx, rate, pitch, voiceIdx, paused, readOptions, readAnswer, readExplanation]);

  if (!q) return null;

  const pct = questions.length > 1 ? (idx / (questions.length - 1)) * 100 : 100;
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
      <div className="narr-card" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:800, fontSize:16, display:'flex', alignItems:'center', gap:8 }}>
            <span className={speaking && !paused ? 'narr-speaking' : ''}>🔊</span>
            Narration Mode
          </div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)', marginBottom:5 }}>
            <span>Q{idx+1} of {questions.length}</span>
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
          <button className="btn" style={{ alignSelf:'flex-start', fontSize:12 }} onClick={() => setShowAnswer(true)}>
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
          <button className="btn" onClick={()=>go(-1)} disabled={idx===0} title="Previous (←)">◀</button>
          <button className="btn primary" onClick={togglePause} style={{ minWidth:90 }}>
            {paused ? '▶ Resume' : speaking ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="btn" onClick={()=>go(+1)} disabled={idx===questions.length-1} title="Next (→)">▶</button>
          <button className="btn" onClick={()=>speak(buildScript(q))} title="Repeat (R)">↺ Repeat</button>
          <div style={{ flex:1 }}/>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer', color:'var(--muted)' }}>
            <input type="checkbox" checked={autoAdvance} onChange={e=>setAutoAdvance(e.target.checked)} style={{accentColor:'var(--primary)'}}/>
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
                <select value={voiceIdx} onChange={e=>setVoiceIdx(+e.target.value)}
                  style={{ flex:1, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border2)',
                    background:'var(--card2)', color:'var(--text)', fontSize:12 }}>
                  {voices.map((v,i) => <option key={i} value={i}>{v.name}</option>)}
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
                    }} style={{accentColor:'var(--primary)'}}/>
                  {label}
                </label>
              ))}
            </div>
          </div>
        </details>

        <div style={{ fontSize:10, color:'var(--muted)', textAlign:'center' }}>
          Space = pause · ← → = navigate · R = repeat · Esc = close
        </div>
      </div>
    </div>
  );
}
