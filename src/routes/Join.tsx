// Grove — S3 Join session. GROVE-MASTER.md §7 S3.
//
// THE ONE CRITICAL BEHAVIOUR: the moment the code validates, the session title
// appears. A bare code with no context reads as a chore or a phish, and this is
// the highest single drop-off point in the product.
//
// The lookup goes through lookup_session_by_code(), a SECURITY DEFINER function,
// so a stranger never needs (and never gets) a select on the sessions table.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CodeInput, normaliseCode } from '../ds/CodeInput';
import { Header } from '../ds/Header';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { ensureUser } from '../lib/auth';
import { loadName, saveLastSession, saveName } from '../lib/storage';
import { joinSession, lookupSessionByCode, type SessionLookup } from '../lib/supabase';

export default function Join() {
  const params = useParams<{ code?: string }>();
  const prefilled = normaliseCode(params.code);
  const [code, setCode] = useState(prefilled);
  const [name, setName] = useState(loadName());
  const [session, setSession] = useState<SessionLookup | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameField = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Validation fires automatically on the sixth character. No check button. §8.15
  useEffect(() => {
    let cancelled = false;
    if (code.length !== 6) { setSession(null); setError(null); return undefined; }
    setChecking(true);
    setError(null);
    lookupSessionByCode(code)
      .then((found) => {
        if (cancelled) return;
        if (!found) { setError('No session with that code. Check the six characters and try again.'); setSession(null); }
        else { setSession(found); nameField.current?.focus(); }
      })
      .catch(() => { if (!cancelled) setError('No session with that code. Check the six characters and try again.'); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [code]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!name.trim()) { setNameError('Add a display name so the others know who is here.'); return; }
    setNameError(null);
    setBusy(true);
    try {
      const user = await ensureUser();
      await joinSession({ sessionId: session.id, displayName: name, userId: user.id });
      saveName(name.trim());
      saveLastSession({ sessionId: session.id, title: session.title, joinCode: session.join_code });
      navigate(`/s/${session.id}`, { replace: true });
    } catch {
      setError('Couldn’t join. Your code is correct — try again.');
      setBusy(false);
    }
  }

  const synthesised = session?.status === 'synthesised';

  return (
    <>
      <Header />
      <OfflineBanner />
      <main className="page col-narrow" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
        <h1 className="t-h1">Join a session</h1>

        <form onSubmit={submit} style={{ marginTop: 'var(--space-8)' }} noValidate>
          <div className="field">
            <span className="field__label" id="code-label">Session code</span>
            <CodeInput value={code} onChange={setCode} error={Boolean(error)} autoFocus={!prefilled} disabled={busy} />
            {error
              ? <span className="field__error">{error}</span>
              : <span className="field__help">{checking ? 'Checking the code.' : 'Six characters. Not case sensitive.'}</span>}
          </div>

          {session && (
            <div className="fade-in-once" style={{ marginTop: 'var(--space-6)', background: 'var(--primary-soft)', borderRadius: 'var(--radius-input)', padding: 'var(--space-3)' }}>
              <div className="t-tracked" style={{ color: 'var(--primary-text)' }}>Joining</div>
              <div className="t-h3" style={{ marginTop: 'var(--space-2)', color: 'var(--primary-text)' }}>{session.title}</div>
              <p className="t-body" style={{ marginTop: 'var(--space-1)', color: 'var(--primary-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {session.research_question}
              </p>
            </div>
          )}

          {synthesised && session && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Notice action={<Link to={`/s/${session.id}/findings`} className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>Open findings</Link>}>
                That session has already been synthesised. Open the findings instead.
              </Notice>
            </div>
          )}

          <div className="field" style={{ marginTop: 'var(--space-6)' }}>
            <label className="field__label" htmlFor="join-name">Your display name</label>
            <input
              id="join-name" ref={nameField} className="input" value={name} disabled={busy} placeholder="Priya"
              aria-invalid={nameError ? 'true' : undefined} aria-describedby="join-name-help"
              onChange={(e) => setName(e.target.value)}
            />
            {nameError
              ? <span className="field__error" id="join-name-help">{nameError}</span>
              : <span className="field__help" id="join-name-help">Other observers see your name and how many notes you&rsquo;ve written. They never see the notes.</span>}
          </div>

          <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 'var(--space-8)' }} disabled={!session || busy}>
            {busy ? 'Joining.' : 'Join session'}
          </button>
        </form>
      </main>
    </>
  );
}
