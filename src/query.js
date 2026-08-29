// ═══════════════════════════════════════════════════════
// query.js — Smart collection query resolver
//
// Query syntax:
//   1-50          → ID range
//   5,12,44       → ID list
//   fever         → keyword search (question + options + answer + explanation + tag)
//   q:fever       → question field only
//   ans:B         → answer key or answer text
//   tag:malaria   → tag field
//   lesson:inf    → lesson field
//   exp:text      → explanation field
//   keyword IN 1-50  → keyword within a range scope
//   A & B         → AND (intersection)
//   A ; B         → OR (union)
// ═══════════════════════════════════════════════════════

/**
 * Resolve a single atomic query segment (no ; or &).
 * Returns a Set of matching question IDs.
 *
 * @param {string}   q         - Atomic query string
 * @param {object[]} questions - Full question array
 * @returns {Set<string>}
 */
function resolveAtom(q, questions) {
  const matched = new Set();
  if (!q) return matched;

  // ── Field-specific: q:text, ans:text, exp:text, tag:text, lesson:text ──
  const fieldM = q.match(/^(q|question|ans|answer|exp|explanation|tag|lesson|options?):(.+)$/i);
  if (fieldM) {
    const field = fieldM[1].toLowerCase();
    const term  = fieldM[2].trim().toLowerCase();
    questions.forEach(qq => {
      let hay = '';
      if (field === 'q' || field === 'question')      hay = qq.question || '';
      else if (field === 'ans' || field === 'answer') hay = [qq.answerKey, qq.answerText].filter(Boolean).join(' ');
      else if (field === 'exp' || field === 'explanation') hay = qq.explanation || '';
      else if (field === 'tag')                        hay = [qq.tag].filter(Boolean).join(' ');
      else if (field === 'lesson')                     hay = qq.lesson || '';
      else if (field === 'option' || field === 'options') hay = (qq.options || []).join(' ');
      if (hay.toLowerCase().includes(term)) matched.add(qq.id);
    });
    return matched;
  }

  // ── "keyword IN range"  e.g. "fever IN 1-50" or "malaria IN 20,30,45" ──
  const inM = q.match(/^(.+?)\s+IN\s+(.+)$/i);
  if (inM) {
    const keyPart   = inM[1].trim();
    const scopePart = inM[2].trim();
    const scope     = resolveAtom(scopePart, questions);
    const kw        = keyPart.toLowerCase();
    questions.forEach(qq => {
      if (!scope.has(qq.id)) return;
      const hay = [qq.question, qq.answerText, qq.explanation, qq.tag, ...(qq.options || [])]
        .filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(kw)) matched.add(qq.id);
    });
    return matched;
  }

  // ── Range: "1-30" ──
  const rangeM = q.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeM) {
    const lo = parseInt(rangeM[1]), hi = parseInt(rangeM[2]);
    questions.forEach(qq => {
      const n = parseInt(qNum(qq.id));
      if (n >= lo && n <= hi) matched.add(qq.id);
    });
    return matched;
  }

  // ── ID list: "44, 45, 100" ──
  if (/^[\d\s,]+$/.test(q)) {
    const ids = q.split(/[\s,]+/).map(Number).filter(Boolean);
    questions.forEach(qq => {
      const n = parseInt(qNum(qq.id));
      if (ids.includes(n)) matched.add(qq.id);
    });
    return matched;
  }

  // ── Keyword / full-text search ──
  const lo = q.toLowerCase();
  questions.forEach(qq => {
    const hay = [qq.question, qq.answerText, qq.explanation, qq.tag, ...(qq.options || [])]
      .filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(lo)) matched.add(qq.id);
  });
  return matched;
}

/**
 * Resolve a full query string supporting ; (OR) and & (AND).
 *
 * @param {string}   query     - Full query string
 * @param {object[]} questions - Full question array
 * @returns {Set<string>}
 */
function resolveQuery(query, questions) {
  const q = query.trim();
  if (!q) return new Set();
  const matched = new Set();

  // Union (OR): semicolon separates parts
  if (q.includes(';')) {
    for (const part of q.split(';')) {
      for (const id of resolveQuery(part.trim(), questions)) matched.add(id);
    }
    return matched;
  }

  // Intersection (AND): & separates parts
  if (q.includes('&')) {
    const parts = q.split('&').map(p => p.trim()).filter(Boolean);
    let result = null;
    for (const part of parts) {
      const s = resolveAtom(part, questions);
      if (result === null) { result = s; }
      else { for (const id of [...result]) { if (!s.has(id)) result.delete(id); } }
    }
    return result || new Set();
  }

  return resolveAtom(q, questions);
}
