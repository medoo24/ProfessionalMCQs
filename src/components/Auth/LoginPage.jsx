const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

function LoginPage({ onSignedIn }) {
  const [mode, setMode] = React.useState('choose'); // 'choose' | 'email'
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPw, setConfirmPw] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [resetSent, setResetSent] = React.useState(false);

  const err = (msg) => { setError(msg); setLoading(false); };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try {
      await signInWithGoogle();
      // onAuthChange in App.jsx will pick up the new user
    } catch (e) {
      err(e.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled.' : e.message);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (!email.trim()) return err('Enter your email address.');
    if (password.length < 6) return err('Password must be at least 6 characters.');
    if (isSignUp && password !== confirmPw) return err('Passwords do not match.');
    try {
      if (isSignUp) await signUpWithEmail(email, password);
      else          await signInWithEmail(email, password);
    } catch (e) {
      const msg = {
        'auth/user-not-found':    'No account found with this email.',
        'auth/wrong-password':    'Incorrect password.',
        'auth/email-already-in-use': 'Email already in use. Sign in instead.',
        'auth/invalid-email':     'Invalid email address.',
        'auth/weak-password':     'Password must be at least 6 characters.',
      }[e.code] || e.message;
      err(msg);
    }
  };

  const handleAnonymous = async () => {
    setError(''); setLoading(true);
    try {
      await signInAnonymously();
    } catch (e) {
      err(e.message);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) return setError('Enter your email above first.');
    setError(''); setLoading(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true); setLoading(false);
    } catch (e) { err(e.message); }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">Q</div>
        <div className="auth-title">QnA Hub</div>
        <div className="auth-sub">Sign in to sync your progress across devices</div>

        {/* Google button */}
        <button className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
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
          Anonymous mode stores data locally only.<br/>
          Sign in to sync across devices.
        </div>
      </div>
    </div>
  );
}
