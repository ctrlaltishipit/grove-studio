// Grove Studio — S0 Login. Two doors and nothing else.
//
// This screen must not sell (§7 S1). No feature grid, no testimonials, no
// past sessions, no "rejoin" strip — the person is here to get in, and a
// returning user's spaces belong on the home screen behind the door, not in
// front of it. The left panel carries the mark, the name and one sentence.
// That is the whole of it.
//
// It also has to say what went wrong. An OAuth round trip that fails comes
// back with `error_description` in the URL, and an app that ignores it just
// shows the login screen again — which reads as "nothing happened" and is
// the single most confusing thing a sign-in page can do.
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodeInput } from '../ds/CodeInput';
import { Mark } from '../ds/Mark';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { ThemeToggle } from '../ds/ThemeToggle';
import { signInWithGoogle } from '../lib/auth';
import { configured } from '../lib/supabase';

/** Read whatever the identity provider sent back, from either the query
 *  string or the hash — Supabase uses both depending on the flow. */
function callbackError(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const desc = url.searchParams.get('error_description') ?? hash.get('error_description');
  const code = url.searchParams.get('error') ?? hash.get('error');
  if (!desc && !code) return null;
  const said = (desc ?? code ?? '').replace(/\+/g, ' ');
  // The provider's own words, then the one thing that is almost always the
  // cause, so the person reading this can act rather than just retry.
  return `${said.charAt(0).toUpperCase()}${said.slice(1)}`;
}

export default function Login() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const err = callbackError();
    if (err) {
      setFailed(err);
      // Clear it from the address bar so a refresh does not re-show a stale
      // failure, but only after it has been read into state.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function google(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(null);
    try {
      await signInWithGoogle();   // leaves the page; Supabase brings it back to /home
    } catch (err) {
      setFailed(err instanceof Error ? err.message : 'Couldn’t reach Google. Nothing was saved.');
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate__toggle"><ThemeToggle /></div>
      <OfflineBanner />

      <div className="gate__card">
        <div className="gate__side">
          <Mark size={64} label="Grove Studio" />
          <h1 className="gate__name">Grove Studio</h1>
          <p className="gate__line">
            Write together, or write apart and see what you all noticed.
          </p>
        </div>

        <main className="gate__form">
          {!configured && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <Notice>
                Grove Studio isn&rsquo;t connected to its store yet. Set the Supabase
                environment variables and redeploy.
              </Notice>
            </div>
          )}

          <form onSubmit={google}>
            <button type="submit" className="btn btn--primary btn--block" disabled={busy || !configured}>
              {busy ? 'Opening Google.' : 'Continue with Google'}
            </button>
          </form>

          {failed && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Notice>{failed}</Notice>
            </div>
          )}

          <div className="gate__or">
            <hr />
            <span className="t-micro muted">or join with a code</span>
            <hr />
          </div>

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
        </main>
      </div>
    </div>
  );
}
