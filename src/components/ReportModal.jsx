// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ReportModal.jsx — Study stats report (streak heatmap, lesson breakdown, tags)
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════ REPORT ═══════════════════════════════
function ReportModal({ questions, favIds, completedIds, notes, srData, weakIds, sessions, streak, onClose }) {
  const total = questions.length, done = completedIds.size;
  const pct = total>0?Math.round((done/total)*100):0;
  const due = questions.filter(q=>isDue(srData[q.id])).length;
  const weak = weakIds.size;
  const noted = Object.values(notes).filter(n=>n&&n.trim()).length;

  const lessonMap = {};
  questions.forEach(q=>{
    if(!lessonMap[q.lesson]) lessonMap[q.lesson]={total:0,done:0};
    lessonMap[q.lesson].total++;
    if(completedIds.has(q.id)) lessonMap[q.lesson].done++;
  });
  const lessons = Object.entries(lessonMap).sort((a,b)=>b[1].total-a[1].total);

  const tagMap = {};
  questions.forEach(q=>{ if(q.tag){if(!tagMap[q.tag])tagMap[q.tag]=0; tagMap[q.tag]++;} });
  const tags = Object.entries(tagMap).sort((a,b)=>b[1]-a[1]).slice(0,12);

  const totalSessionSec = sessions.reduce((a,s)=>a+(s.duration||0),0);
  const avgSession = sessions.length>0?Math.round(totalSessionSec/sessions.length):0;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:700}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:17}}>📊 Study Report</div>
          <button className="btn ghost" onClick={onClose}><I.X s={15}/></button>
        </div>

        {/* Stats grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8,marginBottom:20}}>
          {[
            [total,'Total','var(--text)'],[done,'Done','var(--green)'],[total-done,'Unsolved','var(--yellow)'],
            [due,'SR Due','var(--purple)'],[weak,'Weak','var(--red)'],[favIds.size,'Favorites','var(--yellow)'],
            [noted,'Notes','var(--primary)'],[streak,'Day Streak','var(--yellow)'],[sessions.length,'Sessions','var(--muted)']
          ].map(([n,l,c])=>(
            <div key={l} className="stat-card" style={{alignItems:'center'}}>
              <div className="stat-num" style={{color:c}}>{n}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{marginBottom:8,display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)'}}>
          <span>Overall Progress</span><span style={{fontFamily:'var(--mono)'}}>{pct}%</span>
        </div>
        <div className="pb" style={{marginBottom:20}}>
          <div className="pb-fill" style={{width:`${pct}%`,background:pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--primary)'}}/>
        </div>

        {/* Session time */}
        {sessions.length>0 && (
          <div style={{marginBottom:20,display:'flex',gap:12,flexWrap:'wrap'}}>
            <span style={{fontSize:13,color:'var(--muted)'}}><I.Clock/> Total study time: <b style={{color:'var(--text)'}}>{Math.floor(totalSessionSec/3600)}h {Math.floor((totalSessionSec%3600)/60)}m</b></span>
            <span style={{fontSize:13,color:'var(--muted)'}}>Avg session: <b style={{color:'var(--text)'}}>{Math.floor(avgSession/60)}m {avgSession%60}s</b></span>
          </div>
        )}

        {/* Lesson breakdown */}
        {lessons.length>0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--muted)',marginBottom:8}}>Lesson Breakdown</div>
            <div style={{maxHeight:200,overflowY:'auto'}}>
              <table className="rt">
                <thead><tr><th>Lesson</th><th>Total</th><th>Done</th><th style={{width:120}}>Progress</th></tr></thead>
                <tbody>{lessons.map(([l,d])=>{
                  const p=Math.round((d.done/d.total)*100);
                  return (
                    <tr key={l}>
                      <td style={{fontSize:12,maxWidth:200}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={l}>{l.length>40?l.slice(0,40)+'…':l}</div></td>
                      <td style={{fontFamily:'var(--mono)',fontSize:12,textAlign:'center'}}>{d.total}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:12,textAlign:'center',color:'var(--green)'}}>{d.done}</td>
                      <td><div style={{display:'flex',alignItems:'center',gap:6}}><div className="pb" style={{flex:1}}><div className="pb-fill" style={{width:`${p}%`,background:p===100?'var(--green)':'var(--primary)'}}/></div><span style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--muted)',minWidth:28}}>{p}%</span></div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length>0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--muted)',marginBottom:8}}>Top Tags</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {tags.map(([tag,count])=>(
                <span key={tag} className="tag-chip"><I.Tag/>{tag} <span style={{fontFamily:'var(--mono)',color:'var(--primary)'}}>×{count}</span></span>
              ))}
            </div>
          </div>
        )}

        <button className="btn" onClick={()=>{
          let t=`QnA Hub Report\n${'='.repeat(40)}\n\nTotal: ${total}\nDone: ${done} (${pct}%)\nSR Due: ${due}\nWeak: ${weak}\nStreak: ${streak} days\n\nLessons:\n`;
          lessons.forEach(([l,d])=>t+=`  ${l}: ${d.done}/${d.total}\n`);
          navigator.clipboard?.writeText(t).then(()=>alert('Copied!'));
        }}><I.Copy/> Copy Report</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════ NOTE MODAL ═══════════════════════════════
function NoteModal({ qId, question, noteText, onSave, onClose }) {
  const [text, setText] = useState(noteText||'');
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
        <div style={{fontWeight:700,marginBottom:6,fontSize:14}}>📝 Note — Q{qId}</div>
        <div style={{color:'var(--muted)',fontSize:12,marginBottom:10,lineHeight:1.5}}>{question}</div>
        <textarea className="note-area" value={text} onChange={e=>setText(e.target.value)} placeholder="Add notes, mnemonics, reminders..." rows={6} autoFocus/>
        <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={()=>{onSave(qId,text);onClose();}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════ TAG EDITOR MODAL ═══════════════════════════════
function TagEditModal({ qId, question, currentTag, onSave, onClose }) {
  const [tag, setTag] = useState(currentTag||'');
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
        <div style={{fontWeight:700,marginBottom:8,fontSize:14}}>🏷 Edit Tag — Q{qId}</div>
        <div style={{color:'var(--muted)',fontSize:12,marginBottom:12}}>{question.slice(0,80)}{question.length>80?'…':''}</div>
        <input className="input" value={tag} onChange={e=>setTag(e.target.value)} placeholder="Tag name..." autoFocus onKeyDown={e=>e.key==='Enter'&&(onSave(qId,tag),onClose())}/>
        <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
          <button className="btn" onClick={()=>{onSave(qId,'');onClose();}}>Clear</button>
          <button className="btn primary" onClick={()=>{onSave(qId,tag);onClose();}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════ STREAK HEATMAP ═══════════════════════════════
function StreakHeatmap({ sessions }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const days = [];
  for (let i=89; i>=0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    days.push(d.toDateString());
  }
  const sessionDays = new Set(sessions.map(s=>new Date(s.date).toDateString()));
  const weeks = [];
  for (let i=0; i<days.length; i+=7) weeks.push(days.slice(i,i+7));

  return (
    <div style={{display:'flex',gap:3}}>
      {weeks.map((week,wi)=>(
        <div key={wi} style={{display:'flex',flexDirection:'column',gap:3}}>
          {week.map(day=>{
            const active=sessionDays.has(day);
            const isToday=day===today.toDateString();
            return (
              <div key={day} title={day} className="heat-cell" style={{
                background:active?'var(--green)':'var(--card2)',
                border:isToday?'1px solid var(--primary)':'1px solid transparent',
                opacity:active?1:0.5
              }}/>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════ QUESTION CARD ═══════════════════════════════
const QuestionCard = memo(function QuestionCard({
  q, isCollapsed, isFav, isDone, isPinned, isWeak, srCard, isDue: due,
  displaySettings, searchQ, onToggleCollapse, onToggleFav, onToggleDone,
  onOpenNote, noteText, onOpenTag, customTag, compact, onTogglePin, collections,
  focused, onFocusClick, localAnsOverride, onToggleLocalAns,
  localOptOverride, onToggleLocalOpt, localExpOverride, onToggleLocalExp,
  bulkMode, isBulkSelected, onToggleBulk, onJumpTag,
}) {
  const showAns  = localAnsOverride !== undefined ? localAnsOverride : displaySettings.showAnswer;
  const showOpts = localOptOverride  !== undefined ? localOptOverride : displaySettings.showOptions;
  const showExp  = localExpOverride  !== undefined ? localExpOverride : displaySettings.showExplanation;

  const [copied, setCopied] = useState(false);

  const copyCard = () => {
    let t = `Q${qNum(q.id)}: ${q.question}\n`;
    if (showOpts && q.options && q.options.length>0)
      q.options.forEach((o,i) => { t += `  ${String.fromCharCode(65+i)}) ${o}\n`; });
    if (showAns) t += `  ✓ ${q.answerKey?q.answerKey+' — ':''}${q.answerText}\n`;
    if (showExp && q.explanation) t += `  📖 ${q.explanation}\n`;
    navigator.clipboard?.writeText(t.trim()).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false), 1400);
    });
  };

  return (
    <div
      id={`q-${q.id}`}
      className={`q-card afu ${isDone?'done':''} ${isPinned&&!isDone?'pinned':''} ${isWeak&&!isDone&&!isPinned?'weak-card':''} ${isBulkSelected?'bulk-sel':''}`}
      style={{marginBottom:compact?6:12,outline:focused&&!bulkMode?'2px solid var(--primary)':'none',outlineOffset:2,cursor:bulkMode?'pointer':undefined}}
      onClick={bulkMode ? (e=>{e.stopPropagation();onToggleBulk(q.id);}) : onFocusClick}
    >
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,padding:compact?'10px 13px':'14px 16px',cursor:'pointer'}} onClick={()=>onToggleCollapse(q.id)}>
        <div style={{display:'flex',alignItems:'flex-start',gap:8,flex:1}}>
          {bulkMode && (
            <input type="checkbox" checked={!!isBulkSelected}
              onChange={e=>{e.stopPropagation();onToggleBulk(q.id);}}
              onClick={e=>e.stopPropagation()}
              style={{marginTop:3,width:15,height:15,flexShrink:0,accentColor:'var(--primary)',cursor:'pointer'}}/>
          )}
          <button onClick={e=>{e.stopPropagation();onToggleDone(q.id);}} style={{marginTop:2,flexShrink:0,background:'none',border:'none',cursor:'pointer',padding:0}} title="Mark done (D)">
            {isDone?<I.CheckCircle size={17}/>:<I.Circle size={17}/>}
          </button>
          <div style={{flex:1}}>
            {q.lesson&&q.lesson!=='General'&&<div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:3}}>{q.lesson.length>55?q.lesson.slice(0,55)+'…':q.lesson}</div>}
            <div style={{fontSize:compact?13:14,fontWeight:500,lineHeight:1.55,textDecoration:isDone?'line-through':'none',opacity:isDone?.7:1}}>
              {hl(q.question, searchQ)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
          {/* SR indicator */}
          {due && <span className="tag-chip due" title="Due for review"><I.Zap/>Due</span>}
          {isWeak && <span className="tag-chip weak" title="Weak spot — answered wrong ≥3x">⚡</span>}
          {/* Options per-card toggle */}
          {q.options&&q.options.length>0&&(
            <button onClick={()=>onToggleLocalOpt(q.id)}
              title={`Options: ${localOptOverride===undefined?'global':localOptOverride?'shown':'hidden'}`}
              style={{padding:'3px 7px',borderRadius:6,border:`1px solid ${localOptOverride===true?'var(--primary)':localOptOverride===false?'var(--red)':'var(--border2)'}`,background:localOptOverride===true?'var(--pg)':localOptOverride===false?'var(--rg)':'var(--card2)',color:localOptOverride===true?'var(--primary)':localOptOverride===false?'var(--red)':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:'var(--mono)',fontWeight:700}}>
              {localOptOverride===false?<I.EyeOff/>:<I.Eye/>}{!compact&&<span style={{marginLeft:3}}>Opts</span>}
            </button>
          )}
          {/* Explanation per-card toggle */}
          {q.explanation&&(
            <button onClick={()=>onToggleLocalExp(q.id)}
              title={`Explanation: ${localExpOverride===undefined?'global':localExpOverride?'shown':'hidden'}`}
              style={{padding:'3px 7px',borderRadius:6,border:`1px solid ${localExpOverride===true?'var(--purple)':localExpOverride===false?'var(--red)':'var(--border2)'}`,background:localExpOverride===true?'var(--pug)':localExpOverride===false?'var(--rg)':'var(--card2)',color:localExpOverride===true?'var(--purple)':localExpOverride===false?'var(--red)':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:'var(--mono)',fontWeight:700}}>
              {localExpOverride===false?<I.EyeOff/>:<I.Eye/>}{!compact&&<span style={{marginLeft:3}}>Exp</span>}
            </button>
          )}
          {/* Answer per-card toggle */}
          <button onClick={()=>onToggleLocalAns(q.id)}
            title={`Answer: ${localAnsOverride===undefined?'global':localAnsOverride?'shown':'hidden'} (A)`}
            style={{padding:'3px 7px',borderRadius:6,border:`1px solid ${localAnsOverride===true?'var(--green)':localAnsOverride===false?'var(--red)':'var(--border2)'}`,background:localAnsOverride===true?'var(--gg)':localAnsOverride===false?'var(--rg)':'var(--card2)',color:localAnsOverride===true?'var(--green)':localAnsOverride===false?'var(--red)':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:'var(--mono)',fontWeight:700}}>
            {localAnsOverride===false?<I.EyeOff/>:<I.Eye/>}{!compact&&<span style={{marginLeft:3}}>{localAnsOverride===true?'✓':localAnsOverride===false?'✗':'Ans'}</span>}
          </button>
          {/* Copy card */}
          <button onClick={copyCard} title="Copy question to clipboard"
            style={{padding:'3px 6px',borderRadius:6,border:`1px solid ${copied?'var(--green)':'var(--border2)'}`,background:copied?'var(--gg)':'var(--card2)',color:copied?'var(--green)':'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',gap:3,lineHeight:1,transition:'background .2s,border-color .2s,color .2s',animation:copied?'copyPop .35s ease-out':'none',position:'relative',minWidth:28,justifyContent:'center'}}>
            {copied ? <span style={{fontSize:11,fontWeight:800,animation:'fadeCheck 1.4s ease-out forwards'}}>✓</span> : <I.Copy/>}
          </button>
          <button onClick={()=>onOpenNote(q.id)} title="Note (N)" style={{background:noteText?'var(--pg)':'none',border:'none',cursor:'pointer',padding:'4px 6px',borderRadius:6,color:noteText?'var(--primary)':'var(--muted)'}}><I.Note/></button>
          <button onClick={()=>onToggleFav(q.id)} title="Favorite (F)" style={{background:'none',border:'none',cursor:'pointer',padding:'4px 6px',borderRadius:6}}><I.Star f={isFav}/></button>
          <button onClick={()=>onTogglePin(q.id)} title="Pin (P)" style={{background:isPinned?'var(--yg)':'none',border:isPinned?'1px solid var(--yellow)':'1px solid transparent',cursor:'pointer',padding:'3px 6px',borderRadius:6,color:isPinned?'var(--yellow)':'var(--muted)'}}><I.Pin/></button>
          <span className="id-badge">{q.id}</span>
          <div style={{color:'var(--muted)',padding:'2px 4px'}}>{isCollapsed?<I.Cd/>:<I.Cu/>}</div>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div style={{borderTop:'1px solid var(--border)',padding:compact?'8px 13px 12px':'12px 16px 16px'}} className="afi">
          {/* Options */}
          {showOpts&&q.options&&q.options.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:8}}>
              {q.options.map((opt,i)=>{
                const char=String.fromCharCode(65+i);
                const isCorrect=q.answerKey&&char===q.answerKey;
                return (
                  <div key={i} className={`opt-row ${showAns&&isCorrect?'correct':''}`} style={{fontSize:compact?12:13}}>
                    <span style={{fontWeight:700,minWidth:18,fontFamily:'var(--mono)',fontSize:11}}>{char}.</span>
                    <span style={{flex:1,lineHeight:1.5}}>{hl(opt,searchQ)}</span>
                    {showAns&&isCorrect&&<I.Check/>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer text */}
          {showAns&&q.answerText&&(!showOpts||!q.options||q.options.length===0)&&(
            <div style={{background:'var(--gg)',border:'1px solid var(--green)',borderRadius:8,color:'var(--green)',padding:'7px 12px',fontSize:compact?12:13,display:'flex',gap:8,alignItems:'flex-start',marginBottom:8}}>
              <I.Check/><span><b>Answer:</b> {q.answerKey?q.answerKey+' — ':''}{hl(q.answerText,searchQ)}</span>
            </div>
          )}

          {/* Explanation */}
          {showExp&&q.explanation&&(
            <div style={{borderLeft:'3px solid var(--primary)',paddingLeft:10,marginBottom:8,fontSize:compact?11:12,color:'var(--muted)',lineHeight:1.6}}>
              <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:2,color:'var(--primary)'}}>Explanation</div>
              {hl(q.explanation,searchQ)}
            </div>
          )}

          {/* Tags & meta row */}
          <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>
            {displaySettings.showTags&&(q.tag||customTag)&&(()=>{
              const tagVal = customTag||q.tag;
              return (
                <span className="tag-chip" style={{cursor:'pointer',padding:0,overflow:'hidden'}}>
                  <span
                    onClick={e=>{e.stopPropagation();onJumpTag&&onJumpTag(tagVal);}}
                    title={`Filter by tag: ${tagVal}`}
                    style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 6px 3px 9px',cursor:'pointer'}}>
                    <I.Tag/>{tagVal}
                  </span>
                  <span
                    onClick={e=>{e.stopPropagation();onOpenTag(q.id);}}
                    title="Edit tag"
                    style={{display:'inline-flex',alignItems:'center',padding:'3px 7px 3px 4px',borderLeft:'1px solid var(--border2)',color:'var(--muted)',fontSize:10,cursor:'pointer',opacity:.7}}
                  >✎</span>
                </span>
              );
            })()}
            {!q.tag&&!customTag&&(
              <button onClick={e=>{e.stopPropagation();onOpenTag(q.id);}} className="tag-chip" style={{cursor:'pointer',color:'var(--muted)',fontSize:10}}>+ tag</button>
            )}
            {/* SR info */}
            {srCard&&srCard.lastReviewed&&(
              <span style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)'}}>
                SR: {srCard.repetitions}×{' '}{srCard.interval}d
              </span>
            )}
            {/* Collections */}
            {collections.map(c=>(
              <span key={c.id} className="coll-badge" style={{color:c.color,borderColor:c.color,background:c.color+'18'}}><I.Folder/>{c.name}</span>
            ))}
          </div>

          {/* Note preview */}
          {noteText&&(
            <div style={{marginTop:8,padding:'5px 10px',background:'var(--card2)',borderRadius:6,fontSize:11,fontFamily:'var(--mono)',color:'var(--muted)',borderLeft:'2px solid var(--yellow)',cursor:'pointer'}} onClick={()=>onOpenNote(q.id)}>
              📝 {noteText.length>90?noteText.slice(0,90)+'…':noteText}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
