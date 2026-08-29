const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
// ═══════════════════════════════════════════════════════════════════════
// CollectionsModal.jsx — Collection manager with smart query builder
// ═══════════════════════════════════════════════════════════════════════

// ── COLLECTIONS MODAL ───────────────────────────────────────────────────

// ── COLLECTION ROW ──────────────────────────────────────────────────────
function CollectionRow({ c, idx, isActive, onSelect, onDelete, onRename, onRecolor, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(c.name);
  const inputRef = useRef(null);

  const commitEdit = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== c.name) onRename(trimmed);
    else setDraftName(c.name);
    setEditing(false);
  };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  return (
    <div
      style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 8px', borderRadius:8, cursor:'pointer',
        background: isActive ? 'var(--card2)' : 'transparent',
        border: isActive ? '1px solid var(--border2)' : '1px solid transparent',
        transition:'background .12s' }}
      onClick={() => { if (!editing) onSelect(); }}
    >
      {/* Color swatch — click to recolor */}
      <input type="color" value={c.color}
        onChange={e => onRecolor(e.target.value)}
        onClick={e => e.stopPropagation()}
        title="Click to change color"
        style={{ width:14, height:14, border:'none', borderRadius:'50%', cursor:'pointer', padding:0,
          flexShrink:0, outline:'none', background:'transparent' }}/>

      {/* Name — double-click to edit */}
      {editing ? (
        <input ref={inputRef}
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if(e.key==='Enter') commitEdit(); if(e.key==='Escape'){setDraftName(c.name);setEditing(false);} }}
          onClick={e => e.stopPropagation()}
          style={{ flex:1, fontSize:12, background:'var(--card)', border:'1px solid var(--primary)',
            borderRadius:4, padding:'1px 5px', color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}/>
      ) : (
        <span
          onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
          style={{ flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
          title={`Double-click to rename: ${c.name}`}>{c.name}</span>
      )}

      <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--mono)', flexShrink:0 }}>{c.qIds.length}</span>

      {/* Reorder buttons */}
      <div style={{ display:'flex', flexDirection:'column', gap:0, flexShrink:0 }}>
        <button onClick={e=>{e.stopPropagation();onMoveUp();}}
          disabled={isFirst}
          title="Move up"
          style={{ background:'none', border:'none', cursor:isFirst?'not-allowed':'pointer', color:'var(--muted)', padding:0, lineHeight:1, fontSize:9, opacity:isFirst?0.2:0.7 }}>▲</button>
        <button onClick={e=>{e.stopPropagation();onMoveDown();}}
          disabled={isLast}
          title="Move down"
          style={{ background:'none', border:'none', cursor:isLast?'not-allowed':'pointer', color:'var(--muted)', padding:0, lineHeight:1, fontSize:9, opacity:isLast?0.2:0.7 }}>▼</button>
      </div>

      {/* Delete */}
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Delete collection"
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:0, display:'flex', flexShrink:0 }}><I.X s={11}/></button>
    </div>
  );
}


// ── QUERY ENTRY ROW ─────────────────────────────────────────────────────
function QueryEntryRow({ entry, questions, onRerun, onDelete, onEdit, onLoadToInput }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const modeColors = { add:'var(--green)', replace:'var(--primary)', remove:'var(--red)' };
  const modeLabels = { add:'+add', replace:'↺replace', remove:'−remove' };
  const matched = resolveQuery(entry.text, questions);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== entry.text) onEdit(t);
    else setDraft(entry.text);
    setEditing(false);
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px',
      background:'var(--card)', border:'1px solid var(--border)', borderRadius:7,
      transition:'border-color .12s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border2)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
    >
      {/* Mode badge */}
      <span style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4,
        color: modeColors[entry.mode], border:`1px solid ${modeColors[entry.mode]}`,
        flexShrink:0, fontFamily:'var(--mono)' }}>
        {modeLabels[entry.mode]}
      </span>

      {/* Editable query text */}
      {editing ? (
        <input ref={inputRef} value={draft}
          onChange={e=>setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape'){setDraft(entry.text);setEditing(false);} }}
          style={{ flex:1, background:'var(--card2)', border:'1px solid var(--primary)', borderRadius:4,
            outline:'none', fontFamily:'var(--mono)', fontSize:12, color:'var(--text)', padding:'2px 6px' }}/>
      ) : (
        <span
          onDoubleClick={()=>{setDraft(entry.text);setEditing(true);}}
          title="Double-click to edit"
          style={{ flex:1, fontFamily:'var(--mono)', fontSize:12, color:'var(--text)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'text' }}>
          {entry.text}
        </span>
      )}

      {/* Match count */}
      <span style={{ fontSize:10, color:'var(--muted)', flexShrink:0, fontFamily:'var(--mono)' }}>
        {matched.size}q
      </span>

      {/* Action buttons */}
      <button onClick={onLoadToInput} title="Load into query input"
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:11, padding:'0 2px', flexShrink:0 }}>
        ✎
      </button>
      <button onClick={onRerun} title="Re-run this query"
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary)', fontSize:11, padding:'0 2px', flexShrink:0 }}>
        ▶
      </button>
      <button onClick={onDelete} title="Delete this query"
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:11, padding:'0 2px', flexShrink:0 }}>
        ✕
      </button>
    </div>
  );
}

function CollectionsModal({ questions, collections, setName, systemSets, onSave, onClose, pinnedIds, favIds, completedIds, wrongIds, srData, weakIds }) {
  const [colls, setColls] = useState(() => {
    const c = JSON.parse(JSON.stringify(collections));
    return c.map(col => ({ ...col, queries: col.queries || [] }));
  });
  const [editedSetName, setEditedSetName] = useState(setName||'My Collections');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#5b8dee');
  const [active, setActive] = useState(null);
  // Per-collection query input state
  const [queryInputs, setQueryInputs] = useState({}); // {collId: string}
  const [queryPreviews, setQueryPreviews] = useState({}); // {collId: Set<id>}

  // Auto-save whenever colls or set name changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    onSave(colls, editedSetName, /*silent=*/true);
  }, [colls, editedSetName]);

  const activeCol = colls.find(c => c.id === active);

  const add = () => {
    if (!newName.trim()) return;
    const id = Date.now().toString();
    setColls(prev => [...prev, { id, name: newName.trim(), color: newColor, qIds: [], queries: [] }]);
    setNewName(''); setActive(id);
  };
  const del = (id) => { setColls(prev => prev.filter(c => c.id !== id)); if (active === id) setActive(null); };
  const toggleQ = (collId, qId) => {
    setColls(prev => prev.map(c => c.id !== collId ? c : {
      ...c, qIds: c.qIds.includes(qId) ? c.qIds.filter(x => x !== qId) : [...c.qIds, qId]
    }));
  };

  // Live query preview
  const handleQueryInput = (collId, val) => {
    setQueryInputs(prev => ({ ...prev, [collId]: val }));
    const matched = resolveQuery(val, questions);
    setQueryPreviews(prev => ({ ...prev, [collId]: matched }));
  };

  // Save a query entry to the collection's history
  const saveQueryEntry = (collId, text, mode) => {
    setColls(prev => prev.map(c => {
      if (c.id !== collId) return c;
      // dedupe: remove previous identical text entry, then push new one
      const filtered = (c.queries||[]).filter(q => q.text !== text);
      return { ...c, queries: [...filtered, { text, mode, ts: Date.now() }] };
    }));
  };

  const applyQuery = (collId) => {
    const text = queryInputs[collId] || '';
    const matched = queryPreviews[collId] || resolveQuery(text, questions);
    setColls(prev => prev.map(c => c.id !== collId ? c : {
      ...c, qIds: Array.from(new Set([...c.qIds, ...matched]))
    }));
    saveQueryEntry(collId, text.trim(), 'add');
    setQueryInputs(prev => ({ ...prev, [collId]: '' }));
    setQueryPreviews(prev => ({ ...prev, [collId]: new Set() }));
  };

  const replaceQuery = (collId) => {
    const text = queryInputs[collId] || '';
    const matched = queryPreviews[collId] || resolveQuery(text, questions);
    setColls(prev => prev.map(c => c.id !== collId ? c : { ...c, qIds: Array.from(matched) }));
    saveQueryEntry(collId, text.trim(), 'replace');
    setQueryInputs(prev => ({ ...prev, [collId]: '' }));
    setQueryPreviews(prev => ({ ...prev, [collId]: new Set() }));
  };

  const removeQuery = (collId) => {
    const text = queryInputs[collId] || '';
    const matched = queryPreviews[collId] || resolveQuery(text, questions);
    setColls(prev => prev.map(c => c.id !== collId ? c : {
      ...c, qIds: c.qIds.filter(id => !matched.has(id))
    }));
    saveQueryEntry(collId, text.trim(), 'remove');
    setQueryInputs(prev => ({ ...prev, [collId]: '' }));
    setQueryPreviews(prev => ({ ...prev, [collId]: new Set() }));
  };

  // Re-run a saved query entry
  const rerunEntry = (collId, entry) => {
    const matched = resolveQuery(entry.text, questions);
    setColls(prev => prev.map(c => {
      if (c.id !== collId) return c;
      if (entry.mode === 'replace') return { ...c, qIds: Array.from(matched) };
      if (entry.mode === 'remove')  return { ...c, qIds: c.qIds.filter(id => !matched.has(id)) };
      return { ...c, qIds: Array.from(new Set([...c.qIds, ...matched])) };
    }));
  };

  // Delete a saved query entry
  const deleteEntry = (collId, ts) => {
    setColls(prev => prev.map(c => c.id !== collId ? c : {
      ...c, queries: (c.queries||[]).filter(q => q.ts !== ts)
    }));
  };

  // Edit a saved query entry text
  const editEntry = (collId, ts, newText) => {
    setColls(prev => prev.map(c => c.id !== collId ? c : {
      ...c, queries: (c.queries||[]).map(q => q.ts === ts ? { ...q, text: newText } : q)
    }));
  };

  const PRESETS = [
    { name:'Wrong Answers',   color:'#f06058', icon:'⚡', desc:'Questions answered wrong ≥3×',
      query:'', fn:()=>Array.from(wrongIds) },
    { name:'Favourites',      color:'#f5a623', icon:'★', desc:'Starred questions',
      query:'', fn:()=>Array.from(favIds) },
    { name:'Completed',       color:'#3ecf8e', icon:'✓', desc:'Marked done',
      query:'', fn:()=>Array.from(completedIds) },
    { name:'Unsolved',        color:'#5b8dee', icon:'○', desc:'Not yet done',
      query:'', fn:()=>questions.filter(q=>!completedIds.has(q.id)).map(q=>q.id) },
    { name:'Has Explanation', color:'#a78bfa', icon:'📖', desc:'Questions with explanation text',
      query:'exp:.', fn:()=>questions.filter(q=>q.explanation&&q.explanation.trim()).map(q=>q.id) },
    { name:'MCQ Only',        color:'#38bdf8', icon:'☑', desc:'Questions with options (MCQ)',
      query:'', fn:()=>questions.filter(q=>q.options&&q.options.length>0).map(q=>q.id) },
    { name:'First Half',      color:'#fb923c', icon:'①', desc:`Questions 1–${Math.floor(questions.length/2)}`,
      query:`1-${Math.floor(questions.length/2)}`, fn:()=>questions.slice(0,Math.floor(questions.length/2)).map(q=>q.id) },
    { name:'Second Half',     color:'#e879f9', icon:'②', desc:`Questions ${Math.floor(questions.length/2)+1}–${questions.length}`,
      query:`${Math.floor(questions.length/2)+1}-${questions.length}`, fn:()=>questions.slice(Math.floor(questions.length/2)).map(q=>q.id) },
  ];

  const [activeTab2, setActiveTab2] = useState('mine'); // 'mine' | 'system'
  const qInput = (active && queryInputs[active]) || '';
  const qPreview = (active && queryPreviews[active]) || new Set();
  const previewCount = qPreview.size;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width:'95vw' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:17, display:'flex', gap:8, alignItems:'center' }}>
            <I.Folder/>
            <input value={editedSetName} onChange={e=>setEditedSetName(e.target.value)}
              style={{background:'transparent',border:'none',outline:'none',fontWeight:800,fontSize:17,
                color:'var(--text)',fontFamily:'var(--font)',borderBottom:'1px dashed var(--border2)',
                paddingBottom:1,minWidth:60,maxWidth:180}}
              title="Set name — click to rename"/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn primary" onClick={() => onSave(colls, editedSetName)}>Save All</button>
            <button className="btn ghost" onClick={onClose}><I.X s={15}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, marginBottom:14, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
          {[
            { id:'mine',    label:`My Collections (${colls.length})` },
            { id:'system',  label:`System (${(systemSets||[]).reduce((s,ss)=>s+ss.colls.length,0)})` },
            { id:'presets', label:'Presets & Defaults' },
          ].map(t => (
            <button key={t.id} onClick={()=>{ setActiveTab2(t.id); if(t.id!=='mine') setActive(null); }}
              style={{ padding:'6px 14px', fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                borderBottom: activeTab2===t.id ? '2px solid var(--primary)' : '2px solid transparent',
                background:'none', color: activeTab2===t.id ? 'var(--primary)' : 'var(--muted)',
                transition:'color .15s', marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: MY COLLECTIONS ── */}
        {activeTab2 === 'mine' && (<>
          {/* New collection row */}
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input className="input" placeholder="New collection name…" value={newName}
              onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==='Enter' && add()} style={{ flex:1 }}/>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              style={{ width:36, height:36, border:'none', borderRadius:6, cursor:'pointer', padding:2 }}/>
            <button className="btn primary" onClick={add}>+ New</button>
          </div>

          {/* Body: list + editor */}
          <div style={{ display:'flex', gap:12, minHeight:400 }}>
            {/* Left: collection list */}
            <div style={{ width:200, borderRight:'1px solid var(--border)', paddingRight:10, flexShrink:0, display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
              {colls.length === 0 && (
                <div style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'30px 0' }}>No collections yet.<br/>Create one above or<br/>clone from Presets tab.</div>
              )}
              {colls.map((c, idx) => (
                <CollectionRow
                  key={c.id} c={c} idx={idx}
                  isActive={active===c.id}
                  onSelect={()=>setActive(c.id)}
                  onDelete={()=>del(c.id)}
                  onRename={(name)=>setColls(prev=>prev.map(x=>x.id!==c.id?x:{...x,name}))}
                  onRecolor={(color)=>setColls(prev=>prev.map(x=>x.id!==c.id?x:{...x,color}))}
                  onMoveUp={()=>setColls(prev=>{const a=[...prev];if(idx===0)return a;[a[idx-1],a[idx]]=[a[idx],a[idx-1]];return a;})}
                  onMoveDown={()=>setColls(prev=>{const a=[...prev];if(idx===a.length-1)return a;[a[idx],a[idx+1]]=[a[idx+1],a[idx]];return a;})}
                  isFirst={idx===0} isLast={idx===colls.length-1}
                />
              ))}
            </div>

            {/* Right: editor panel */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>
              {!active && (
                <div style={{ fontSize:13, color:'var(--muted)', textAlign:'center', paddingTop:60 }}>
                  ← Select or create a collection to edit it
                </div>
              )}
              {active && activeCol && (<>
                {/* Saved Queries */}
                {(activeCol.queries||[]).length > 0 && (
                  <div style={{ background:'var(--card2)', border:'1px solid var(--border2)', borderRadius:10, padding:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)', marginBottom:7 }}>
                      Saved Queries ({activeCol.queries.length})
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {(activeCol.queries||[]).map(entry => (
                        <QueryEntryRow key={entry.ts} entry={entry} questions={questions}
                          onRerun={()=>rerunEntry(active, entry)}
                          onDelete={()=>deleteEntry(active, entry.ts)}
                          onEdit={(newText)=>editEntry(active, entry.ts, newText)}
                          onLoadToInput={()=>handleQueryInput(active, entry.text)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart Query Input */}
                <div style={{ background:'var(--card2)', border:'1px solid var(--border2)', borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)', marginBottom:6 }}>
                    Smart Query
                  </div>
                  <input className="input"
                    placeholder='e.g. 1-80  |  5,12,44  |  fever IN 1-50  |  tag:malaria  |  lesson:cardio'
                    value={qInput}
                    onChange={e => handleQueryInput(active, e.target.value)}
                    onKeyDown={e => e.key==='Enter' && qInput.trim() && applyQuery(active)}
                    style={{ marginBottom:8 }}
                  />
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                    {[['1-50','ID range'],['fever IN 1-50','keyword in range'],['q:fever','question field'],
                      ['tag:malaria','tag'],['lesson:inf','lesson'],['ans:B','answer key'],
                      ['A & B','AND'],['A ; B','OR']].map(([ex,tip]) => (
                      <button key={ex} onClick={() => handleQueryInput(active, ex)}
                        style={{ padding:'2px 8px', borderRadius:5, fontSize:10, fontFamily:'var(--mono)', fontWeight:600,
                          background:'var(--card)', border:'1px solid var(--border2)', color:'var(--muted)', cursor:'pointer', whiteSpace:'nowrap' }}
                        title={tip}>{ex}</button>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.7, marginBottom:6, borderTop:'1px solid var(--border)', paddingTop:6 }}>
                    <span style={{ fontWeight:700, color:'var(--primary)' }}>Syntax: </span>
                    <code style={{fontFamily:'var(--mono)',color:'var(--text)'}}>fever IN 1-50</code> · <code style={{fontFamily:'var(--mono)',color:'var(--text)'}}>A &amp; B</code> AND · <code style={{fontFamily:'var(--mono)',color:'var(--text)'}}>A ; B</code> OR · <code style={{fontFamily:'var(--mono)',color:'var(--text)'}}>q: ans: tag: lesson:</code> fields
                  </div>
                  {qInput.trim() && (
                    <div style={{ fontSize:12, color: previewCount>0?'var(--green)':'var(--red)', marginBottom:8, fontWeight:600 }}>
                      {previewCount>0 ? `✓ Matches ${previewCount} question${previewCount!==1?'s':''}` : '✗ No matches'}
                    </div>
                  )}
                  {previewCount > 0 && (
                    <div style={{ maxHeight:70, overflowY:'auto', marginBottom:8, display:'flex', flexDirection:'column', gap:3 }}>
                      {Array.from(qPreview).slice(0,8).map(qid => {
                        const qq = questions.find(x => x.id === qid);
                        return qq ? (
                          <div key={qid} style={{ fontSize:11, color:'var(--muted)', display:'flex', gap:6 }}>
                            <span style={{ fontFamily:'var(--mono)', color:'var(--primary)', flexShrink:0 }}>#{qNum(qid)}</span>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{qq.question.slice(0,65)}{qq.question.length>65?'…':''}</span>
                          </div>
                        ) : null;
                      })}
                      {previewCount > 8 && <div style={{ fontSize:11, color:'var(--muted)' }}>…and {previewCount-8} more</div>}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn primary" style={{ fontSize:12, flex:1 }}
                      onClick={() => applyQuery(active)} disabled={!qInput.trim() || previewCount===0}>
                      + Add
                    </button>
                    <button className="btn" style={{ fontSize:12, flex:1 }}
                      onClick={() => replaceQuery(active)} disabled={!qInput.trim() || previewCount===0}>
                      ↺ Replace
                    </button>
                    <button className="btn" style={{ fontSize:12, flex:1, color:'var(--red)', borderColor:'var(--red)' }}
                      onClick={() => removeQuery(active)} disabled={!qInput.trim() || previewCount===0}>
                      − Remove
                    </button>
                  </div>
                </div>

                {/* Manual checkbox list */}
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)' }}>
                  Or pick manually ({activeCol.qIds.length} selected)
                  {activeCol.qIds.length > 0 && (
                    <button onClick={() => setColls(prev => prev.map(c => c.id!==active?c:{...c,qIds:[]}))}
                      style={{ marginLeft:10, fontSize:10, color:'var(--red)', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>
                      Clear all
                    </button>
                  )}
                </div>
                <div style={{ flex:1, overflowY:'auto', maxHeight:180 }}>
                  {questions.map(q => {
                    const checked = activeCol.qIds.includes(q.id);
                    const isPreview = qPreview.has(q.id);
                    return (
                      <label key={q.id}
                        style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'5px 8px', cursor:'pointer',
                          borderRadius:6, background: isPreview ? `${activeCol.color}18` : 'transparent',
                          border: isPreview ? `1px solid ${activeCol.color}44` : '1px solid transparent' }}
                        className="dd-item">
                        <input type="checkbox" checked={checked} onChange={() => toggleQ(active, q.id)}
                          style={{ marginTop:2, accentColor:activeCol.color }}/>
                        <span style={{ fontSize:12, lineHeight:1.5, flex:1 }}>
                          <span style={{ fontFamily:'var(--mono)', color:'var(--muted)', fontSize:10 }}>#{qNum(q.id)}</span>
                          {' '}{q.question.slice(0,75)}{q.question.length>75?'…':''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>)}
            </div>
          </div>
        </>)}

        {/* ── TAB: SYSTEM COLLECTIONS ── */}
        {activeTab2 === 'system' && (
          <div style={{ minHeight:420, overflowY:'auto' }}>
            {(!systemSets||systemSets.length===0) ? (
              <div style={{ textAlign:'center', padding:60, color:'var(--muted)', fontSize:13 }}>
                No system collections available yet.<br/>Load a question file first.
              </div>
            ) : systemSets.map(sset => (
              <div key={sset.id} style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em',
                  color:'var(--primary)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  {sset.name}
                  <span style={{ fontWeight:400, fontSize:10, color:'var(--muted)' }}>({sset.colls.length} collections · auto-generated)</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {sset.colls.map(c => {
                    const already = colls.some(x => x.name === c.name);
                    return (
                      <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                        background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{c.name}</span>
                        <span style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)' }}>{c.qIds.length} q</span>
                        <button className="btn" style={{ fontSize:11, padding:'3px 10px', opacity: already?.7:1 }}
                          title={already ? 'Already cloned to My Collections' : 'Clone into My Collections'}
                          onClick={() => {
                            if (already) return;
                            const id = Date.now().toString();
                            const cloned = { id, name:c.name, color:c.color, qIds:[...c.qIds],
                              queries:[{ text:`lesson:${c.name}`, mode:'add', ts:Date.now() }] };
                            setColls(prev=>[...prev, cloned]);
                            setActive(id);
                            setActiveTab2('mine');
                          }}>
                          {already ? '✓ Cloned' : '→ Clone'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: PRESETS ── */}
        {activeTab2 === 'presets' && (
          <div style={{ minHeight:420, overflowY:'auto' }}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14, lineHeight:1.6 }}>
              One-click collection templates based on your current progress. Clicking creates a new collection in <strong>My Collections</strong> and switches to it.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {PRESETS.map(p => {
                const ids = p.fn();
                const already = colls.some(x => x.name === p.name);
                return (
                  <div key={p.name} style={{ padding:'12px 14px', borderRadius:10,
                    background:'var(--card2)', border:`1px solid var(--border2)`,
                    display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>{p.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{p.desc}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color: p.color }}>{ids.length}</span>
                        <span style={{ fontSize:9, color:'var(--muted)' }}>questions</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn primary" style={{ flex:1, fontSize:11 }}
                        disabled={ids.length===0}
                        onClick={() => {
                          const id = Date.now().toString();
                          const entry = p.query ? [{ text:p.query, mode:'add', ts:Date.now() }] : [];
                          setColls(prev=>[...prev, { id, name:p.name, color:p.color, qIds:ids, queries:entry }]);
                          setActive(id); setActiveTab2('mine');
                        }}>
                        {ids.length===0 ? 'No matches' : already ? '+ Duplicate' : '+ Create'}
                      </button>
                      {already && (
                        <button className="btn" style={{ fontSize:11, padding:'4px 10px' }}
                          title="Refresh existing collection with latest data"
                          onClick={() => {
                            setColls(prev=>prev.map(c=>c.name!==p.name?c:{...c, qIds:ids}));
                            setActiveTab2('mine');
                          }}>
                          ↺ Refresh
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
