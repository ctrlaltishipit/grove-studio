import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureAnonSession } from '../lib/auth';
import { createSession, joinSession } from '../lib/data';
import { loadDisplayName, saveDisplayName, saveLastSession } from '../lib/local';
import ErrorNotice from '../components/ErrorNotice';

export default function Create() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [name, setName] = useState(loadDisplayName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim() || !question.trim() || !name.trim()) {
      setError('Add a title, a research question and your name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await ensureAnonSession();
      const session = await createSession({
        title, researchQuestion: question, userId: user.id,
      });
      await joinSession({ sessionId: session.id, displayName: name, userId: user.id });
      saveDisplayName(name.trim());
      saveLastSession({ sessionId: session.id, code: session.join_code, title: session.title });
      navigate(`/s/${session.id}`, { replace: true });
    } catch {
      setError('Could not create the session. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <form className="page page--narrow stack-6" onSubmit={submit}>
      <div className="stack-2">
        <h1>Start a session</h1>
        <p className="t-muted t-small">
          Everyone joins with a six-character code. Nobody needs an account.
        </p>
      </div>

      <ErrorNotice>{error}</ErrorNotice>

      <div className="stack">
        <div>
          <label className="field__label" htmlFor="title">Session title</label>
          <input id="title" className="input" value={title} maxLength={200}
                 placeholder="Clinic booking — discovery interview 04"
                 onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="field__label" htmlFor="rq">Research question</label>
          <textarea id="rq" className="textarea" value={question} maxLength={500}
                    placeholder="Why do patients who start an online booking abandon it before confirming?"
                    onChange={(e) => setQuestion(e.target.value)} />
          <p className="field__hint">
            Every observer sees this at the top of their lane. It is the only thing they share
            during the session.
          </p>
        </div>

        <div>
          <label className="field__label" htmlFor="name">Your name</label>
          <input id="name" className="input" value={name} maxLength={40}
                 placeholder="Deekshitha S."
                 onChange={(e) => setName(e.target.value)} />
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Creating…' : 'Create session'}
        </button>
      </div>
    </form>
  );
}
