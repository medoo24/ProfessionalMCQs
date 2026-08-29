// ═══════════════════════════════════════════════════════════════════════
// firebase.js — Firebase App initialization + Auth + Firestore
// Uses Firebase Compat SDK v10 (firebase.* globals)
// See FIREBASE_SETUP.md for setup instructions.
// ═══════════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyATJTqv2BM1da1PmJCR6KcSVFrTj0skIko",
  authDomain:        "mcqs-on-page.firebaseapp.com",
  projectId:         "mcqs-on-page",
  storageBucket:     "mcqs-on-page.firebasestorage.app",
  messagingSenderId: "150876967793",
  appId:             "1:150876967793:web:5cf7834f790f5f22d15cd0"
};

// true = Firebase config is set and auth will be required
const FIREBASE_CONFIGURED = true;
// Expose on window so all script scopes can see it
window.FIREBASE_CONFIGURED = FIREBASE_CONFIGURED;

// Internal references
let _auth = null;
let _db   = null;
let _googleProvider = null;

/**
 * Initialize Firebase using compat SDK.
 * Called once at app startup from App.jsx.
 */
function initFirebase() {
  if (!FIREBASE_CONFIGURED || typeof firebase === 'undefined') {
    console.info('[QnA] Firebase not configured — local-only mode. See FIREBASE_SETUP.md.');
    return;
  }
  try {
    // Only init once
    if (firebase.apps && firebase.apps.length) return;
    firebase.initializeApp(FIREBASE_CONFIG);
    _auth = firebase.auth();
    _db   = firebase.firestore();
    _googleProvider = new firebase.auth.GoogleAuthProvider();
    _googleProvider.addScope('email');
    _googleProvider.addScope('profile');

    // Enable offline persistence
    _db.enablePersistence({ synchronizeTabs: true }).catch(err => {
      if (err.code !== 'failed-precondition' && err.code !== 'unimplemented')
        console.warn('[QnA] Persistence error:', err.code);
    });

    console.info('[QnA] Firebase initialized (mcqs-on-page)');
  } catch (e) {
    console.error('[QnA] Firebase init failed:', e.message);
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────

async function signInWithGoogle() {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.signInWithPopup(_googleProvider);
}

async function signInWithEmail(email, password) {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.signInWithEmailAndPassword(email, password);
}

async function signUpWithEmail(email, password) {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.createUserWithEmailAndPassword(email, password);
}

async function signInAnonymously() {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.signInAnonymously();
}

async function signOutUser() {
  if (!_auth) return;
  return _auth.signOut();
}

async function sendPasswordReset(email) {
  if (!_auth) throw new Error('Firebase not ready');
  return _auth.sendPasswordResetEmail(email);
}

function onAuthChange(callback) {
  if (!_auth) { callback(null); return () => {}; }
  return _auth.onAuthStateChanged(callback);
}

function isFirebaseReady() { return FIREBASE_CONFIGURED && _auth !== null; }
