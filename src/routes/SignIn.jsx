import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useToast } from '../state/Store';
import { configError } from '../lib/supabase';
import { signInWithGoogle, signInAsGuest } from '../lib/auth';
import { loadGuestName, saveGuestName, savePendingJoin } from '../lib/local';
import { Logo, Spinner } from '../components/ui';

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export default function SignIn() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [name, setName] = useState(loadGuestName());
  const [busy, setBusy] = useState(false);

  // A code from the landing page or an invite link. Stash it so the Google
  // OAuth round-trip (which returns to /app without the query) still joins.
  const joinParam = (new URLSearchParams(location.search).get('join') || '').toUpperCase();
  const joinCode = /^[A-Z0-9]{6}$/.test(joinParam) ? joinParam : null;
  useEffect(() => { if (joinCode) savePendingJoin(joinCode); }, [joinCode]);

  if (loading) return <div className="signin-wrap"><Spinner /></div>;
  if (user) {
    const wantsJoin = new URLSearchParams(location.search).get('join');
    return <Navigate to={wantsJoin ? `/app?join=${encodeURIComponent(wantsJoin)}` : '/app'} replace />;
  }

  const google = async () => {
    try {
      setBusy(true);
      await signInWithGoogle(); // navigates away to accounts.google.com
    } catch (e) {
      setBusy(false);
      toast('Google sign-in failed', e.message, 'error');
    }
  };

  const guest = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      saveGuestName(name.trim());
      await signInAsGuest(name.trim());
      // AuthProvider picks up the session; the redirect above kicks in.
    } catch (e) {
      setBusy(false);
      toast('Could not sign in', e.message, 'error');
    }
  };

  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
            Grove<em style={{ fontStyle: 'normal', color: 'var(--acc-deep)' }}>Studio</em>
          </span>
        </div>
        <div>
          <h1>Welcome in.</h1>
          <p className="signin-sub">{joinCode
              ? <>Sign in to join with code <b style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.12em' }}>{joinCode}</b> — the space opens right after.</>
              : 'Your spaces, notes and tasks follow your account across devices.'}</p>
        </div>

        {configError ? (
          <div className="config-warn">{configError}</div>
        ) : (
          <>
            <button className="btn-google" onClick={google} disabled={busy}>
              <GoogleG /> Continue with Google
            </button>
            <div className="signin-divider">or</div>
            <input
              className="signin-input" placeholder="Your name — e.g. Priya R." maxLength={40}
              value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') guest(); }}
            />
            <button className="btn btn-primary" style={{ height: 42, borderRadius: 12 }}
              disabled={busy || !name.trim()} onClick={guest}>
              {busy ? 'One moment…' : 'Continue as guest'}
            </button>
            <p className="signin-fine">
              Guest sessions live in this browser. Sign in with Google to keep your spaces for good.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
