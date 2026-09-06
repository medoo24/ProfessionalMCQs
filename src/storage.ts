// ═══════════════════════════════════════════════════════
// storage.ts — Data persistence (localStorage + Firestore cloud sync)
// ═══════════════════════════════════════════════════════

import { SK } from './config';
import { getDb } from './firebase';

// ── localStorage helpers ──────────────────────────────

export function save(k: string, v: any, fk?: string): void {
  try {
    localStorage.setItem(SK + (fk ? fk + '__' : '') + k, JSON.stringify(v));
  } catch {}
}

export function load<T>(k: string, fb: T, fk?: string): T {
  try {
    const r = localStorage.getItem(SK + (fk ? fk + '__' : '') + k);
    return r != null ? JSON.parse(r) : fb;
  } catch {
    return fb;
  }
}

export function clearFileData(fk: string): void {
  const prefix = SK + fk + '__';
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
}

export function clearAllQnaData(): void {
  Object.keys(localStorage).filter(k => k.startsWith(SK)).forEach(k => localStorage.removeItem(k));
}

// ── Firestore cloud sync ─────────────────────────────

export const CLOUD_PER_FILE_KEYS = ['favs', 'done', 'pins', 'notes', 'ctags', 'sr', 'wrong', 'collectionSets'];
export const CLOUD_GLOBAL_KEYS   = ['sessions', 'theme', 'display', 'compact', 'tvHistory', 'streak', 'activeFile'];

export function serializeForCloud(fk: string) {
  const perFile: Record<string, any> = {};
  CLOUD_PER_FILE_KEYS.forEach(k => { perFile[k] = load(k, null, fk); });
  const global: Record<string, any> = {};
  CLOUD_GLOBAL_KEYS.forEach(k => { global[k] = load(k, null); });
  return { perFile, global, fileKey: fk, updatedAt: Date.now() };
}

export interface CloudSyncResult {
  success: boolean;
  mergedData?: {
    favs: string[];
    done: string[];
    pins: string[];
    notes: Record<string, string>;
    ctags: Record<string, string>;
    sr: Record<string, any>;
    wrong: Record<string, number>;
    collectionSets?: any[];
  };
}

/**
 * Smart bidirectional sync between Firestore cloud and device localStorage.
 * Combines progress from both devices (e.g. laptop and phone) without data loss.
 */
export async function syncWithCloud(uid: string, fk: string): Promise<CloudSyncResult> {
  if (!uid || !fk) return { success: false };
  const db = getDb();
  if (!db) return { success: false };

  try {
    const ref = db.collection('users').doc(uid).collection('data').doc(fk);
    const snap = await ref.get();
    const localData = serializeForCloud(fk);

    if (!snap.exists) {
      // Nothing in cloud yet, push local if there is any actual user data
      const hasLocalData =
        (localData.perFile.done && localData.perFile.done.length > 0) ||
        (localData.perFile.favs && localData.perFile.favs.length > 0) ||
        (localData.perFile.notes && Object.keys(localData.perFile.notes).length > 0);
      if (hasLocalData) {
        await ref.set(localData);
      }
      return { success: true };
    }

    const cloud = snap.data() as any;
    const cloudPerFile = cloud?.perFile || {};
    const localPerFile = localData?.perFile || {};

    // 1. Union merge arrays (done, favs, pins)
    const mergedDone = Array.from(
      new Set([...(cloudPerFile.done || []), ...(localPerFile.done || [])])
    );
    const mergedFavs = Array.from(
      new Set([...(cloudPerFile.favs || []), ...(localPerFile.favs || [])])
    );
    const mergedPins = Array.from(
      new Set([...(cloudPerFile.pins || []), ...(localPerFile.pins || [])])
    );

    // 2. Merge dictionaries (notes, ctags)
    const mergedNotes = { ...(cloudPerFile.notes || {}), ...(localPerFile.notes || {}) };
    const mergedTags = { ...(cloudPerFile.ctags || {}), ...(localPerFile.ctags || {}) };

    // 3. Merge Spaced Repetition (keep card with higher reps or newer due date)
    const mergedSr: Record<string, any> = { ...(cloudPerFile.sr || {}) };
    if (localPerFile.sr) {
      Object.entries(localPerFile.sr).forEach(([qId, localCard]: [string, any]) => {
        const cloudCard = mergedSr[qId];
        if (!cloudCard || (localCard.reps || 0) >= (cloudCard.reps || 0)) {
          mergedSr[qId] = localCard;
        }
      });
    }

    // 4. Merge wrong counts (take highest count)
    const mergedWrong: Record<string, number> = { ...(cloudPerFile.wrong || {}) };
    if (localPerFile.wrong) {
      Object.entries(localPerFile.wrong).forEach(([qId, count]) => {
        mergedWrong[qId] = Math.max(mergedWrong[qId] || 0, (count as number) || 0);
      });
    }

    // 5. Merge collection sets
    const cloudSets = cloudPerFile.collectionSets || [];
    const localSets = localPerFile.collectionSets || [];
    const mergedCollectionSets = localSets.length > 0 ? localSets : cloudSets;

    const mergedData = {
      favs: mergedFavs,
      done: mergedDone,
      pins: mergedPins,
      notes: mergedNotes,
      ctags: mergedTags,
      sr: mergedSr,
      wrong: mergedWrong,
      collectionSets: mergedCollectionSets,
    };

    // Save merged results to localStorage
    save('done', mergedDone, fk);
    save('favs', mergedFavs, fk);
    save('pins', mergedPins, fk);
    save('notes', mergedNotes, fk);
    save('ctags', mergedTags, fk);
    save('sr', mergedSr, fk);
    save('wrong', mergedWrong, fk);
    if (mergedCollectionSets.length) save('collectionSets', mergedCollectionSets, fk);

    // Merge global keys (streak, sessions)
    if (cloud.global) {
      if (cloud.global.streak && cloud.global.streak > (localData.global.streak || 0)) {
        save('streak', cloud.global.streak);
      }
      if (cloud.global.sessions && Array.isArray(cloud.global.sessions)) {
        const localSessions = load<any[]>('sessions', []);
        const sMap = new Map();
        [...localSessions, ...cloud.global.sessions].forEach(s => {
          if (s && s.id) sMap.set(s.id, s);
        });
        save('sessions', Array.from(sMap.values()));
      }
    }

    // Push unified merged data back to Firestore
    const unifiedPayload = {
      fileKey: fk,
      perFile: mergedData,
      global: {
        ...localData.global,
        ...(cloud.global || {}),
        streak: Math.max(localData.global.streak || 0, cloud.global?.streak || 0),
      },
      updatedAt: Date.now(),
    };
    await ref.set(unifiedPayload, { merge: true });

    return { success: true, mergedData };
  } catch (e: any) {
    console.warn('[QnA] Cloud sync failed:', e?.message || e);
    return { success: false };
  }
}

export async function pushToCloud(uid: string, fk: string): Promise<void> {
  // Delegate to syncWithCloud to prevent accidental destructive overwrites
  await syncWithCloud(uid, fk);
}

export async function pullFromCloud(uid: string, fk: string): Promise<boolean> {
  const res = await syncWithCloud(uid, fk);
  return res.success;
}

export async function mergeAnonymousToCloud(uid: string, fk: string): Promise<void> {
  await syncWithCloud(uid, fk);
}
