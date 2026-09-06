import React, { useState } from 'react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously,
  sendPasswordReset
} from '../../firebase';

export interface LoginPageProps {
  onSignedIn?: () => void;
  onContinueOffline?: () => void;
}

export function LoginPage({ onSignedIn, onContinueOffline }: LoginPageProps) {
  const [mode, setMode] = useState<'choose' | 'email'>('choose');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const err = (msg: string) => {
    setError(msg);
    setLoading(false);
  };

  const handleGoogle = async () => {
    if (isOffline) {
      return err('You are offline. Please connect to the internet to sign in with Google, or continue offline below.');
    }
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onSignedIn?.();
    } catch (e: any) {
      err(e.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled.' : e.message || 'Google sign-in failed');
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      return err('You are offline. Please connect to the internet to sign in, or continue offline below.');
    }
    setError('');
    setLoading(true);
    if (!email.trim()) return err('Enter your email address.');
    if (password.length < 6) return err('Password must be at least 6 characters.');
    if (isSignUp && password !== confirmPw) return err('Passwords do not match.');
    try {
      if (isSignUp) await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
      onSignedIn?.();
    } catch (e: any) {
      const msgMap: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'Email already in use. Sign in instead.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
      };
      err(msgMap[e.code] || e.message || 'Authentication failed');
    }
  };

  const handleAnonymous = async () => {
    setError('');
    setLoading(true);
    try {
      await signInAnonymously();
      onSignedIn?.();
    } catch (e: any) {
      if (isOffline || e.code === 'auth/network-request-failed') {
        // Automatically bypass if network request fails
        onContinueOffline?.();
      } else {
        err(e.message || 'Anonymous sign-in failed');
      }
    }
  };

  const handleReset = async () => {
    if (!email.trim()) return setError('Enter your email above first.');
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
      setLoading(false);
    } catch (e: any) {
      err(e.message || 'Password reset failed');
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">Q</div>
        <div className="auth-title">QnA Hub</div>
        <div className="auth-sub">Sign in to sync your progress across devices</div>

        {isOffline && (
          <div style={{
            background: 'rgba(245,166,35,.15)',
            border: '1px solid var(--yellow)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 12,
            color: 'var(--yellow)',
            lineHeight: 1.4
          }}>
            ⚡ <strong>Offline Mode:</strong> Internet connection is currently unavailable. You can launch and study cached question banks immediately without signing in.
          </div>
        )}

        {/* Offline Bypass Button */}
        {onContinueOffline && (
          <button
            className="btn primary"
            onClick={onContinueOffline}
            style={{ width: '100%', justifyContent: 'center', marginBottom: 12, padding: '12px' }}
          >
            📱 Continue in Offline Mode
          </button>
        )}

        {/* Google button */}
        <button className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">or</div>

        {/* Email / Password form */}
        {mode === 'choose' ? (
          <button
            onClick={() => setMode('email')}
            className="btn"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            📧 Continue with Email
          </button>
        ) : (
          <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {isSignUp ? 'Create account' : 'Sign in'}
              </span>
              <button type="button" onClick={() => setMode('choose')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}>
                ← Back
              </button>
            </div>
            <input
              className="input" type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)} autoFocus required
            />
            <input
              className="input" type="password" placeholder="Password (min 6 chars)"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
            {isSignUp && (
              <input
                className="input" type="password" placeholder="Confirm password"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
              />
            )}
            {error && (
              <div style={{ color: 'var(--red)', fontSize: 12, padding: '6px 10px', background: 'var(--rg)', borderRadius: 6 }}>
                {error}
              </div>
            )}
            {resetSent && (
              <div style={{ color: 'var(--green)', fontSize: 12 }}>✓ Reset email sent! Check your inbox.</div>
            )}
            <button className="btn primary" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? '…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
              <button type="button" onClick={() => { setIsSignUp(v => !v); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 12 }}>
                {isSignUp ? 'Already have account? Sign in' : "Don't have account? Sign up"}
              </button>
              {!isSignUp && (
                <button type="button" onClick={handleReset}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}>
                  Forgot password?
                </button>
              )}
            </div>
          </form>
        )}

        {/* Anonymous */}
        <button className="auth-anon-btn" onClick={handleAnonymous} disabled={loading}>
          👤 Continue without signing in
        </button>

        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          Local progress is saved automatically.<br />
          Sign in when online to sync across all devices.
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
