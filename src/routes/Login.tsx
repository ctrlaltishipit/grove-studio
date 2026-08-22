// Grove Studio — S0 Login. Two doors and nothing else.
//
// This screen must not sell (§7 S1). No feature grid, no testimonials, no
// past sessions, no "rejoin" strip — the person is here to get in, and a
// returning user's spaces belong on the home screen behind the door, not
// in front of it.
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodeInput } from '../ds/CodeInput';
import { Header } from '../ds/Header';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { signInWithGoogle } from '../lib/auth';
import { configured } from '../lib/supabase';

export default function Login() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  async function google(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      await signInWithGoogle();   // leaves the page; Supabase brings it back to /home
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <>
      <Header linkHome={false} />
      <OfflineBanner />
      <main className="page col-narrow" style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-12)' }}>
        <div className="center">
          <h1 className="t-h1">Grove Studio</h1>
          <p className="t-body muted" style={{ margin: 'var(--space-3) auto 0', maxWidth: '46ch' }}>
            Write together, or write apart and see what you all noticed.
          </p>
        </div>

        {!configured && (
          <div style={{ marginTop: 'var(--space-8)' }}>
            <Notice>Grove Studio isn&rsquo;t connected to its store yet. Set the Supabase environment variables and redeploy.</Notice>
          </div>
        )}

        <form onSubmit={google} style={{ marginTop: 'var(--space-8)' }}>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !configured}>
            {busy ? 'Opening Google.' : 'Continue with Google'}
          </button>
        </form>

        {failed && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Notice>Couldn&rsquo;t reach Google. Nothing was saved. Try again.</Notice>
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--space-8)', gap: 'var(--space-3)' }}>
          <hr className="rule" style={{ flex: 1 }} />
          <span className="t-micro muted">or join with a code</span>
          <hr className="rule" style={{ flex: 1 }} />
        </div>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <CodeInput value={code} onChange={setCode} />
          <button
            type="button"
            className="btn btn--secondary btn--block"
            style={{ marginTop: 'var(--space-4)' }}
            disabled={code.length !== 6}
            onClick={() => navigate(`/join/${code}`)}
          >
            Join
          </button>
          <p className="t-label muted center" style={{ marginTop: 'var(--space-3)' }}>
            No account needed to join a session.
          </p>
        </div>
      </main>
    </>
  );
}
