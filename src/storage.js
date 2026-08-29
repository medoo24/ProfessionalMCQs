// ═══════════════════════════════════════════════════════
// storage.js — Data persistence (localStorage + Firestore cloud sync)
// Uses Firebase Compat SDK (firebase.firestore() global)
// ═══════════════════════════════════════════════════════

// ── localStorage helpers ──────────────────────────────

function save(k, v, fk) {
  try { localStorage.setItem(SK + (fk ? fk + '__' : '') + k, JSON.stringify(v)); } catch {}
}

function load(k, fb, fk) {
  try {
    const r = localStorage.getItem(SK + (fk ? fk + '__' : '') + k);
    return r != null ? JSON.parse(r) : fb;
  } catch { return fb; }
}

function clearFileData(fk) {
  const prefix = SK + fk + '__';
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
}

function clearAllQnaData() {
  Object.keys(localStorage).filter(k => k.startsWith(SK)).forEach(k => localStorage.removeItem(k));
}

// ── Firestore cloud sync (compat SDK) ────────────────

const CLOUD_PER_FILE_KEYS = ['favs','done','pins','notes','ctags','sr','wrong','collectionSets'];
const CLOUD_GLOBAL_KEYS   = ['sessions','theme','display','compact','tvHistory','streak','activeFile'];

function _getDb() {
  try { return typeof firebase !== 'undefined' ? firebase.firestore() : null; } catch { return null; }
}

function serializeForCloud(fk) {
  const perFile = {};
  CLOUD_PER_FILE_KEYS.forEach(k => { perFile[k] = load(k, null, fk); });
  const global = {};
  CLOUD_GLOBAL_KEYS.forEach(k => { global[k] = load(k, null); });
  return { perFile, global, fileKey: fk, updatedAt: Date.now() };
}

async function pushToCloud(uid, fk) {
  if (!uid || !fk) return;
  const db = _getDb(); if (!db) return;
  try {
    const data = serializeForCloud(fk);
    await db.collection('users').doc(uid).collection('data').doc(fk).set(data, { merge: true });
  } catch (e) { console.warn('[QnA] Cloud push failed:', e.message); }
}

async function pullFromCloud(uid, fk) {
  if (!uid || !fk) return false;
  const db = _getDb(); if (!db) return false;
  try {
    const snap = await db.collection('users').doc(uid).collection('data').doc(fk).get();
    if (!snap.exists) return false;
    const data = snap.data();
    if (data.perFile) Object.entries(data.perFile).forEach(([k, v]) => { if (v != null) save(k, v, data.fileKey || fk); });
    if (data.global)  Object.entries(data.global).forEach(([k, v])  => { if (v != null) save(k, v); });
    return true;
  } catch (e) { console.warn('[QnA] Cloud pull failed:', e.message); return false; }
}

async function mergeAnonymousToCloud(uid, fk) {
  if (!uid || !fk) return;
  const db = _getDb(); if (!db) return;
  try {
    const ref = db.collection('users').doc(uid).collection('data').doc(fk);
    const cloudSnap = await ref.get();
    const localData = serializeForCloud(fk);
    if (!cloudSnap.exists) { await ref.set(localData); return; }
    const cloud = cloudSnap.data();
    const merged = { ...localData };
    ['done','favs','pins'].forEach(k => {
      merged.perFile[k] = Array.from(new Set([...(localData.perFile[k]||[]), ...(cloud.perFile?.[k]||[])]));
    });
    ['notes','ctags','sr'].forEach(k => {
      merged.perFile[k] = { ...(cloud.perFile?.[k]||{}), ...(localData.perFile[k]||{}) };
    });
    await ref.set(merged, { merge: true });
  } catch (e) { console.warn('[QnA] Anon merge failed:', e.message); }
}
