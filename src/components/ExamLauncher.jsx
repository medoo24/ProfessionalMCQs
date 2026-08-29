const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
// ═══════════════════════════════════════════════════════════════════════
// ExamLauncher.jsx — Exam mode configuration and scope selector
// ═══════════════════════════════════════════════════════════════════════

function ExamLauncher({ questions, collections, completedIds, wrongCounts, onStart, onClose }) {
  const [excludeSolved, setExcludeSolved] = useState(true);
  const [scopeMode, setScopeMode] = useState('all'); // 'all' | 'collection' | 'weak'
  const [selectedCollId, setSelectedCollId] = useState(collections[0]?.id || null);
  const [maxQs, setMaxQs] = useState(40);
  const [randomize, setRandomize] = useState(true);

  const weakIds = new Set(
    Object.entries(wrongCounts).filter(([,c])=>c>=3).map(([id])=>parseInt(id))
  );

  // Build candidate pool based on options
  const pool = useMemo(() => {
    let qs = questions.filter(q => q.options && q.options.length > 0);

    // Scope filter
    if (scopeMode === 'collection' && selectedCollId) {
      const col = collections.find(c => c.id === selectedCollId);
      if (col) qs = qs.filter(q => col.qIds.includes(q.id));
    } else if (scopeMode === 'weak') {
      qs = qs.filter(q => weakIds.has(q.id));
    }

    // Exclude solved
    if (excludeSolved) qs = qs.filter(q => !completedIds.has(q.id));

    return qs;
  }, [questions, collections, completedIds, excludeSolved, scopeMode, selectedCollId]);

  const finalPool = useMemo(() => {
    let qs = [...pool];
    if (randomize) qs = qs.sort(() => Math.random() - 0.5);
    return qs.slice(0, Math.max(1, maxQs));
  }, [pool, randomize, maxQs]);

  const allSolved = pool.length === 0 && excludeSolved;
  const noQuestions = pool.length === 0;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:17}}>📝 Exam Settings</div>
          <button className="btn ghost" onClick={onClose} style={{padding:"4px 8px"}}>✕</button>
        </div>

        {/* Scope */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--muted)",marginBottom:8}}>Question Scope</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[
              {id:"all", label:"All questions", icon:"📚"},
              {id:"weak", label:"Weak spots only (wrong ≥3×)", icon:"⚡"},
              {id:"collection", label:"Specific collection", icon:"📁"},
            ].map(opt => (
              <label key={opt.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:`1px solid ${scopeMode===opt.id?"var(--primary)":"var(--border2)"}`,background:scopeMode===opt.id?"var(--pg)":"var(--card2)",cursor:"pointer",transition:"all .15s"}}>
                <input type="radio" name="scope" checked={scopeMode===opt.id} onChange={()=>setScopeMode(opt.id)} style={{accentColor:"var(--primary)"}}/>
                <span style={{fontSize:14}}>{opt.icon}</span>
                <span style={{fontSize:13,fontWeight:scopeMode===opt.id?600:400}}>{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Collection picker */}
          {scopeMode==="collection" && collections.length > 0 && (
            <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
              {collections.map(c => (
                <button key={c.id} onClick={()=>setSelectedCollId(c.id)}
                  style={{padding:"5px 10px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",
                    border:`1px solid ${selectedCollId===c.id?c.color:"var(--border2)"}`,
                    background:selectedCollId===c.id?c.color+"22":"var(--card2)",
                    color:selectedCollId===c.id?c.color:"var(--muted)"}}>
                  {c.name} <span style={{opacity:.6,fontSize:10}}>({c.qIds.length})</span>
                </button>
              ))}
            </div>
          )}
          {scopeMode==="collection" && collections.length === 0 && (
            <div style={{marginTop:8,fontSize:12,color:"var(--red)"}}>No collections yet — create one first.</div>
          )}
        </div>

        {/* Exclude solved */}
        <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"1px solid var(--border2)",background:"var(--card2)",cursor:"pointer",marginBottom:16}}>
          <input type="checkbox" checked={excludeSolved} onChange={e=>setExcludeSolved(e.target.checked)} style={{accentColor:"var(--primary)",width:16,height:16}}/>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>Exclude already-solved questions</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>
              {completedIds.size > 0
                ? `${completedIds.size} question${completedIds.size!==1?"s":""} marked Done globally`
                : "No questions marked Done yet"}
            </div>
          </div>
        </label>

        {/* Random + count */}
        <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center"}}>
          <label style={{display:"flex",alignItems:"center",gap:8,flex:1,padding:"9px 12px",borderRadius:8,border:"1px solid var(--border2)",background:"var(--card2)",cursor:"pointer"}}>
            <input type="checkbox" checked={randomize} onChange={e=>setRandomize(e.target.checked)} style={{accentColor:"var(--primary)"}}/>
            <span style={{fontSize:13,fontWeight:600}}>Randomize order</span>
          </label>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"1px solid var(--border2)",background:"var(--card2)"}}>
            <span style={{fontSize:12,color:"var(--muted)",whiteSpace:"nowrap"}}>Max Qs:</span>
            <input type="number" value={maxQs} min={5} max={200} step={5}
              onChange={e=>setMaxQs(Math.max(5,Math.min(200,parseInt(e.target.value)||40)))}
              style={{width:56,background:"transparent",border:"none",outline:"none",fontFamily:"var(--mono)",fontSize:13,color:"var(--text)",fontWeight:700,textAlign:"center"}}/>
          </div>
        </div>

        {/* Preview count */}
        <div style={{padding:"10px 14px",borderRadius:8,border:"1px solid var(--border2)",background:"var(--card2)",marginBottom:16,fontSize:13}}>
          {allSolved ? (
            <span style={{color:"var(--green)",fontWeight:700}}>
              🎉 All questions in this scope are already solved! Uncheck "Exclude solved" to retry them.
            </span>
          ) : noQuestions ? (
            <span style={{color:"var(--red)",fontWeight:700}}>⚠ No questions available with these settings.</span>
          ) : (
            <span>
              <b style={{color:"var(--primary)",fontFamily:"var(--mono)",fontSize:15}}>{Math.min(finalPool.length, maxQs)}</b>
              <span style={{color:"var(--muted)"}}> question{finalPool.length!==1?"s":""} will be in this exam
              {pool.length > maxQs ? ` (${pool.length} available, capped at ${maxQs})` : ""}
              </span>
            </span>
          )}
        </div>

        <div style={{display:"flex",gap:10}}>
          <button className="btn" onClick={onClose} style={{flex:1}}>Cancel</button>
          <button className="btn primary" style={{flex:2}} disabled={noQuestions}
            onClick={()=>onStart(finalPool)}>
            Start Exam ({Math.min(finalPool.length, maxQs)} Qs) →
          </button>
        </div>
      </div>
    </div>
  );
}
