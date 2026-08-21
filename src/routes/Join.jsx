import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ensureAnonSession } from '../lib/auth';
import { findSessionByCode, joinSession } from '../lib/data';
import { loadDisplayName, saveDisplayName, saveLastSession } from '../lib/local';
import ErrorNotice from '../components/ErrorNotice';

export default function Join() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState((codeParam ?? '').toUpperCase());
  const [name, setName] = useState(loadDisplayName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (codeParam) setCode(codeParam.toUpperCase()); }, [codeParam]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const clean = code.trim().toUpperCase().replace(/\s/g, '');
    if (clean.length !== 6) { setError('A join code is six characters.'); return; }
    if (!name.trim()) { setError('Add the name the others will see.'); return; }

    setBusy(true);
    setError(null);
    try {
      const session = await findSessionByCode(clean);
      if (!session) { setError('No session with that code.'); setBusy(false); return; }

      const user = await ensureAnonSession();
      await joinSession({ sessionId: session.id, displayName: name, userId: user.id });
      saveDisplayName(name.trim());
      saveLastSession({ sessionId: session.id, code: session.join_code, title: session.title });
      navigate(`/s/${session.id}`, { replace: true });
    } catch {
      setError('Could not join that session. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <form className="page page--narrow stack-6" onSubmit={submit}>
      <div className="stack-2">
        <h1>Join a session</h1>
        <p className="t-muted t-small">Your lane is private from the moment you join.</p>
      </div>

      <ErrorNotice>{error}</ErrorNotice>

      <div className="stack">
        <div>
          <label className="field__label" htmlFor="code">Join code</label>
          <input id="code" className="input input--code" value={code} maxLength={6}
                 autoCapitalize="characters" autoCorrect="off" spellCheck="false"
                 placeholder="GRVDEM"
                 onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <p className="field__hint">Six characters. No O, zero, I, one or L — they get misheard.</p>
        </div>

        <div>
          <label className="field__label" htmlFor="jname">Your name</label>
          <input id="jname" className="input" value={name} maxLength={40}
                 placeholder="Deekshitha S."
                 onChange={(e) => setName(e.target.value)} />
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Joining…' : 'Join session'}
        </button>
      </div>
    </form>
  );
}
