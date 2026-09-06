// ═══════════════════════════════════════════════════════════════════════
// firebase.ts — Firebase App initialization + Auth + Firestore
// Uses Firebase Compat SDK v10
// ═══════════════════════════════════════════════════════════════════════

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyATJTqv2BM1da1PmJCR6KcSVFrTj0skIko",
  authDomain:        "mcqs-on-page.firebaseapp.com",
  projectId:         "mcqs-on-page",
  storageBucket:     "mcqs-on-page.firebasestorage.app",
  messagingSenderId: "150876967793",
  appId:             "1:150876967793:web:5cf7834f790f5f22d15cd0"
};

// true = Firebase config is set and auth will be required
export const FIREBASE_CONFIGURED = true;

// Expose on window so optional scripts can access it if needed
if (typeof window !== 'undefined') {
  (window as any).FIREBASE_CONFIGURED = FIREBASE_CONFIGURED;
}

// Internal references
let _auth: firebase.auth.Auth | null = null;
let _db: firebase.firestore.Firestore | null = null;
let _googleProvider: firebase.auth.GoogleAuthProvider | null = null;

/**
 * Initialize Firebase using compat SDK.
 * Called once at app startup from App.
 */
export function initFirebase(): void {
  if (!FIREBASE_CONFIGURED) {
    console.info('[QnA] Firebase not configured — local-only mode. See FIREBASE_SETUP.md.');
    return;
  }
  try {
    // Only init once
    if (firebase.apps && firebase.apps.length > 0) {
      _auth = firebase.auth();
      _db = firebase.firestore();
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    _auth = firebase.auth();
    _db   = firebase.firestore();
    _googleProvider = new firebase.auth.GoogleAuthProvider();
    _googleProvider.addScope('email');
    _googleProvider.addScope('profile');

    // Explicitly set local auth persistence
    _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

    // Enable offline persistence
    _db.enablePersistence({ synchronizeTabs: true }).catch((err: any) => {
      if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
        console.warn('[QnA] Persistence error:', err.code);
      }
    });

    console.info('[QnA] Firebase initialized (mcqs-on-page)');
  } catch (e: any) {
    console.error('[QnA] Firebase init failed:', e?.message || e);
  }
}

export interface CachedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export function getCachedUser(): CachedUser | null {
  try {
    const raw = localStorage.getItem('qna_cached_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: any | null): void {
  try {
    if (user) {
      localStorage.setItem('qna_cached_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: !!user.isAnonymous
      }));
    } else {
      localStorage.removeItem('qna_cached_user');
    }
  } catch {}
}

export function getDb(): firebase.firestore.Firestore | null {
  if (!_db && firebase.apps && firebase.apps.length > 0) {
    _db = firebase.firestore();
  }
  return _db;
}

// ── Auth helpers ──────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<firebase.auth.UserCredential> {
  if (!_auth || !_googleProvider) throw new Error('Firebase not ready');
  return _auth.signInWithPopup(_googleProvider);
}

export async function signInWithEmail(email: string, password: string): Promise<firebase.auth.UserCredential> {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.signInWithEmailAndPassword(email, password);
}

export async function signUpWithEmail(email: string, password: string): Promise<firebase.auth.UserCredential> {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.createUserWithEmailAndPassword(email, password);
}

export async function signInAnonymously(): Promise<firebase.auth.UserCredential> {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.signInAnonymously();
}

export async function signOutUser(): Promise<void> {
  if (!_auth) return;
  return _auth.signOut();
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.sendPasswordResetEmail(email);
}

export function onAuthChange(callback: (user: firebase.User | null) => void): () => void {
  if (!_auth) {
    callback(null);
    return () => {};
  }
  return _auth.onAuthStateChanged(callback);
}

export function isFirebaseReady(): boolean {
  return FIREBASE_CONFIGURED && _auth !== null;
}
