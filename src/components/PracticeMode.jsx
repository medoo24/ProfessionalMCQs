const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
// ═══════════════════════════════════════════════════════════════════════
// PracticeMode.jsx — Practice and Exam mode (timed quiz with SR rating)
// ═══════════════════════════════════════════════════════════════════════

// ── PRACTICE / EXAM MODE ────────────────────────────────────────────────
function PracticeMode({ questions, mode, onClose, onRateSR, weakIds, onAddWrong, onMarkDone, onMarkWeak }) {
  const isExam = mode === 'exam';
  const isWrongReview = mode === 'wrong';
  const [deck] = useState(() => [...questions].sort(() => Math.random()-0.5));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState({ correct:0, wrong:0, skipped:0 });
  const [done, setDone] = useState(false);
  const [examAnswers, setExamAnswers] = useState({}); // for exam: {qId: selected}
  const [examDone, setExamDone] = useState(false);
  // Timer
  const [timeLeft, setTimeLeft] = useState(isExam ? deck.length * 90 : 90); // exam: 90s/q total; practice: 90s/q
  const [timerActive, setTimerActive] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);
  const timerRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = setInterval(() => setSessionTime(t => t+1), 1000);
    return () => clearInterval(sessionRef.current);
  }, []);

  const [timerExpired, setTimerExpired] = useState(false);

  useEffect(() => {
    if (!timerActive || done || examDone) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimerExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, idx, done, examDone]);

  // Handle timer expiry outside the setTimeLeft updater to avoid stale closures
  useEffect(() => {
    if (!timerExpired) return;
    setTimerExpired(false);
    if (isExam) setExamDone(true);
    else skip();
  }, [timerExpired]);

  const q = deck[idx];

  const answer = (char) => {
    if (isExam) {
      setExamAnswers(prev => ({...prev, [q.id]: char}));
      return;
    }
    if (selected) return;
    setSelected(char); setShown(true);
    const correct = char === q.answerKey?.toUpperCase();
    setScore(s => ({...s, correct:s.correct+(correct?1:0), wrong:s.wrong+(correct?0:1)}));
    if (correct) { onMarkDone(q.id); }
    else { onAddWrong(q.id); onMarkWeak(q.id); }
    clearInterval(timerRef.current);
  };

  const revealAnswer = () => {
    setShown(true);
    clearInterval(timerRef.current);
  };

  const rate = (quality) => {
    onRateSR(q.id, quality);
    next();
  };

  const next = () => {
    if (idx+1 >= deck.length) { setDone(true); return; }
    setIdx(i=>i+1); setSelected(null); setShown(false);
    setTimeLeft(isExam ? timeLeft : 90);
    setTimerActive(true);
  };
  const skip = () => { setScore(s=>({...s,skipped:s.skipped+1})); next(); };

  const submitExam = () => { setExamDone(true); clearInterval(timerRef.current); };

  // ── Practice / Exam keyboard shortcuts ──
  useEffect(() => {
    if (done || examDone) return;
    const onKey = e => {
      // Don't hijack text inputs
      const tag = document.activeElement?.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA') return;

      // A–E → select answer option
      const letterMatch = e.key.match(/^[a-eA-E]$/);
      if (letterMatch) {
        const char = e.key.toUpperCase();
        const optIndex = char.charCodeAt(0) - 65; // 0-4
        if (q && q.options && optIndex < q.options.length) {
          answer(char);
        }
        return;
      }

      // Right arrow / Enter → next question (exam: always; practice: only after answered/shown)
      if (e.key==='ArrowRight' || (e.key==='Enter' && (isExam || shown))) {
        e.preventDefault();
        if (isExam) {
          if (idx+1 >= deck.length) submitExam();
          else next();
        } else if (shown) {
          // In practice mode after answer shown, Enter/Right = "Good" SR rating
          rate(2);
        }
        return;
      }

      // Left arrow → go to previous question (exam only — practice is linear)
      if (e.key==='ArrowLeft' && isExam) {
        e.preventDefault();
        if (idx > 0) {
          setIdx(i=>i-1); setSelected(null); setShown(false);
          setTimerActive(true);
        }
        return;
      }

      // Space → reveal answer (practice mode, no options / not yet shown)
      if (e.key===' ' && !isExam && !shown) {
        e.preventDefault();
        if (!q.options || q.options.length===0) revealAnswer();
        else if (!selected) skip();
        return;
      }

      // Escape → close
      if (e.key==='Escape') { onClose(); return; }

      // 1–4 → SR rating (practice, after answer shown)
      if (!isExam && shown) {
        if (e.key==='1') { rate(0); return; }
        if (e.key==='2') { rate(1); return; }
        if (e.key==='3') { rate(2); return; }
        if (e.key==='4') { rate(3); return; }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, idx, selected, shown, done, examDone, isExam]);

  // Exam results — apply done/weak on first render
  const examApplied = useRef(false);
  if (examDone && !examApplied.current) {
    examApplied.current = true;
    deck.forEach(q => {
      const isCorrect = examAnswers[q.id]?.toUpperCase() === q.answerKey?.toUpperCase();
      if (isCorrect) onMarkDone(q.id);
      else if (examAnswers[q.id]) { onAddWrong(q.id); onMarkWeak(q.id); }
    });
  }

  if (examDone) {
    let correct=0;
    deck.forEach(q => { if(examAnswers[q.id]?.toUpperCase()===q.answerKey?.toUpperCase()) correct++; });
    const pct = Math.round((correct/deck.length)*100);
    return (
      <div className="modal-bg">
        <div className="modal" style={{textAlign:'center',maxWidth:520}}>
          <div style={{fontSize:40,marginBottom:8}}>{pct>=80?'🎉':pct>=60?'👍':'💪'}</div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Exam Complete</div>
          <div style={{color:'var(--muted)',marginBottom:20}}>{deck.length} questions · {Math.floor(sessionTime/60)}:{String(sessionTime%60).padStart(2,'0')} elapsed</div>
          <div style={{fontSize:40,fontWeight:800,color:pct>=80?'var(--green)':pct>=60?'var(--yellow)':'var(--red)',marginBottom:20}}>{pct}%</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
            <div className="stat-card" style={{alignItems:'center'}}><div className="stat-num" style={{color:'var(--green)'}}>{correct}</div><div className="stat-label">Correct ✓ Done</div></div>
            <div className="stat-card" style={{alignItems:'center'}}><div className="stat-num" style={{color:'var(--red)'}}>{deck.length-correct}</div><div className="stat-label">Wrong ⚡ Weak</div></div>
            <div className="stat-card" style={{alignItems:'center'}}><div className="stat-num">{Object.keys(examAnswers).length}</div><div className="stat-label">Answered</div></div>
          </div>
          {/* Detailed results */}
          <div style={{maxHeight:220,overflowY:'auto',textAlign:'left',marginBottom:16}}>
            {deck.map((q,i) => {
              const sel = examAnswers[q.id]; const correct2 = sel?.toUpperCase()===q.answerKey?.toUpperCase();
              return (
                <div key={q.id} style={{padding:'6px 10px',borderRadius:6,marginBottom:4,background:correct2?'var(--gg)':'var(--rg)',border:`1px solid ${correct2?'var(--green)':'var(--red)'}`,fontSize:12,display:'flex',gap:8,alignItems:'flex-start'}}>
                  <span style={{fontFamily:'var(--mono)',flexShrink:0,fontWeight:700,color:correct2?'var(--green)':'var(--red)'}}>{correct2?'✓':'✗'}</span>
                  <span style={{flex:1,lineHeight:1.4}}>{q.question.slice(0,60)}{q.question.length>60?'…':''}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,flexShrink:0,color:correct2?'var(--green)':'var(--red)'}}>{sel||'—'} / {q.answerKey}</span>
                </div>
              );
            })}
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>✓ Correct → marked <b>Done</b> &nbsp;·&nbsp; ✗ Wrong → marked <b>Weak</b></div>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <button className="btn" onClick={onClose}>Exit</button>
          </div>
        </div>
      </div>
    );
  }

  // Practice done screen
  if (done) {
    const total = score.correct+score.wrong+score.skipped;
    const pct = Math.round((score.correct/Math.max(1,total))*100);
    return (
      <div className="modal-bg">
        <div className="modal" style={{textAlign:'center',maxWidth:480}}>
          <div style={{fontSize:40,marginBottom:8}}>{pct>=80?'🎉':pct>=50?'👍':'💪'}</div>
          <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Session Complete!</div>
          <div style={{color:'var(--muted)',marginBottom:20}}>{Math.floor(sessionTime/60)}m {sessionTime%60}s studied</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            <div className="stat-card" style={{alignItems:'center'}}><div className="stat-num" style={{color:'var(--green)'}}>{score.correct}</div><div className="stat-label">Correct</div></div>
            <div className="stat-card" style={{alignItems:'center'}}><div className="stat-num" style={{color:'var(--red)'}}>{score.wrong}</div><div className="stat-label">Wrong</div></div>
            <div className="stat-card" style={{alignItems:'center'}}><div className="stat-num" style={{color:'var(--muted)'}}>{score.skipped}</div><div className="stat-label">Skipped</div></div>
          </div>
          <div style={{fontSize:36,fontWeight:800,color:pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--red)',marginBottom:16}}>{pct}%</div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:16}}>✓ Correct answers → marked <b style={{color:'var(--green)'}}>Done</b> &nbsp;·&nbsp; ✗ Wrong answers → marked <b style={{color:'var(--red)'}}>Weak</b></div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  // Exam in progress
  if (isExam) {
    const answered = Object.keys(examAnswers).length;
    return (
      <div className="modal-bg">
        <div className="modal" style={{maxWidth:640}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14}}>📝 Exam — Q{idx+1}/{deck.length}</div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:13,color:timeLeft<60?'var(--red)':'var(--muted)'}}>{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
              <span style={{fontSize:12,color:'var(--muted)'}}>{answered}/{deck.length} answered</span>
              <button className="btn primary" onClick={submitExam}>Submit</button>
              <button className="btn ghost" onClick={onClose}><I.X s={15}/></button>
            </div>
          </div>
          <div className="pb" style={{marginBottom:16}}><div className="pb-fill" style={{width:`${((idx)/deck.length)*100}%`,background:'var(--primary)'}}/></div>
          <div style={{fontSize:15,fontWeight:500,lineHeight:1.6,marginBottom:16}}>{q.question}</div>
          {q.options && q.options.length>0 && (
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {q.options.map((opt,i) => {
                const char=String.fromCharCode(65+i);
                const sel=examAnswers[q.id]===char;
                return (
                  <button key={i} className="quiz-btn" onClick={()=>answer(char)} style={{borderColor:sel?'var(--primary)':'var(--border2)',background:sel?'var(--pg)':'var(--card2)',color:sel?'var(--primary)':'var(--text)'}}>
                    <span style={{fontFamily:'var(--mono)',fontWeight:700,marginRight:8}}>{char}.</span>{opt}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <button className="btn" onClick={()=>{setIdx(i=>Math.max(0,i-1));setSelected(null);setShown(false);}}>← Back</button>
            <span style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)'}}>A–E answer &nbsp;·&nbsp; ← → navigate &nbsp;·&nbsp; Esc close</span>
            <button className="btn primary" onClick={()=>{ if(idx+1>=deck.length)submitExam(); else {setIdx(i=>i+1);setSelected(null);setShown(false);} }}>{idx+1>=deck.length?'Submit':'Next →'}</button>
          </div>
        </div>
      </div>
    );
  }

  // Practice in progress
  const timerPct = (timeLeft/90)*100;
  const circumference = 2*Math.PI*20;
  const dashOffset = circumference*(1-timerPct/100);

  return (
    <div className="modal-bg">
      <div className="modal" style={{maxWidth:600}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:14}}>
            {isWrongReview?'❌ Wrong Review':'🧠 Practice'} — {idx+1}/{deck.length}
            {weakIds.has(q.id) && <span style={{marginLeft:8}} className="tag-chip weak">Weak Spot</span>}
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>✓ {score.correct}</span>
            <span style={{fontSize:12,color:'var(--red)',fontWeight:600}}>✗ {score.wrong}</span>
            {/* Circular timer */}
            <svg width="44" height="44" style={{flexShrink:0}}>
              <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border2)" strokeWidth="3"/>
              <circle cx="22" cy="22" r="20" fill="none" stroke={timeLeft<20?'var(--red)':timeLeft<45?'var(--yellow)':'var(--primary)'}
                strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" style={{transform:'rotate(-90deg)',transformOrigin:'22px 22px',transition:'stroke-dashoffset .5s'}}/>
              <text x="22" y="27" textAnchor="middle" fontSize="12" fontFamily="var(--mono)" fill="var(--text)">{timeLeft}</text>
            </svg>
            <button className="btn ghost" onClick={onClose} style={{padding:'4px 8px'}}><I.X s={15}/></button>
          </div>
        </div>

        <div className="pb" style={{marginBottom:16}}><div className="pb-fill" style={{width:`${(idx/deck.length)*100}%`,background:'var(--primary)'}}/></div>
        <div style={{fontSize:15,fontWeight:500,lineHeight:1.6,marginBottom:16}}>{q.question}</div>

        {q.options && q.options.length>0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
            {q.options.map((opt,i) => {
              const char=String.fromCharCode(65+i);
              const isCorrect=q.answerKey&&char===q.answerKey;
              const isSel=isExam?(examAnswers[q.id]===char):(selected===char);
              let cls='';
              if(!isExam&&shown&&isCorrect) cls='correct';
              else if(!isExam&&shown&&isSel&&!isCorrect) cls='wrong';
              else if(isExam&&isSel) cls=''; // highlight exam selection without revealing answer
              const isDisabled=!isExam&&!!selected;
              return <button key={i} className={`quiz-btn ${cls}`}
                style={isExam&&isSel?{borderColor:'var(--primary)',background:'var(--pg)',color:'var(--primary)'}:{}}
                onClick={()=>answer(char)} disabled={isDisabled}>
                <span style={{fontFamily:'var(--mono)',fontWeight:700,marginRight:8}}>{char}.</span>{opt}
              </button>;
            })}
          </div>
        ) : (
          !shown && <button className="btn primary" style={{marginBottom:16}} onClick={revealAnswer}>Reveal Answer</button>
        )}

        {shown && (
          <>
            {(!q.options||q.options.length===0) && (
              <div style={{padding:'10px 14px',background:'var(--gg)',border:'1px solid var(--green)',borderRadius:8,color:'var(--green)',marginBottom:12,fontSize:13}}>
                <b>Answer:</b> {q.answerKey?q.answerKey+' — ':''}{q.answerText}
              </div>
            )}
            {q.explanation && (
              <div style={{borderLeft:'3px solid var(--primary)',paddingLeft:12,fontSize:12,color:'var(--muted)',marginBottom:14,lineHeight:1.6}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'var(--primary)',marginBottom:2}}>Explanation</div>
                {q.explanation}
              </div>
            )}
            {/* Confidence / SR rating */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--muted)',marginBottom:6,letterSpacing:'.08em'}}>How well did you know this?</div>
              <div style={{display:'flex',gap:6}}>
                <button className="conf-btn again" onClick={()=>rate(0)} title="Shortcut: 1">Again<br/><span style={{fontSize:10,opacity:.7}}>(&lt;1d)</span></button>
                <button className="conf-btn hard" onClick={()=>rate(1)} title="Shortcut: 2">Hard<br/><span style={{fontSize:10,opacity:.7}}>(~1d)</span></button>
                <button className="conf-btn good" onClick={()=>rate(2)} title="Shortcut: 3">Good<br/><span style={{fontSize:10,opacity:.7}}>(6d)</span></button>
                <button className="conf-btn easy" onClick={()=>rate(3)} title="Shortcut: 4">Easy<br/><span style={{fontSize:10,opacity:.7}}>({q.id&&'+'}long)</span></button>
              </div>
            </div>
          </>
        )}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:8}}>
          <span style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)'}}>
            {shown ? '1–4 rate · → / Enter next' : 'A–E answer · Space skip · Esc close'}
          </span>
          <div style={{display:'flex',gap:8}}>
            {!isExam && !shown && q.options && q.options.length>0 && (
              <button className="btn" onClick={skip}>Skip</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
