// Grove — S2 Create session. GROVE-MASTER.md §7 S2.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../ds/Header';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { ensureUser } from '../lib/auth';
import { loadName, saveLastSession, saveName } from '../lib/storage';
import { configured, createSession } from '../lib/supabase';

export default function Create() {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [name, setName] = useState(loadName());
  const [errors, setErrors] = useState<{ title?: string; question?: string; name?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    // Validation runs on SUBMIT, not on keystroke. Disable-until-valid hides the reason. §7 S2
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Add a session title.';
    if (!question.trim()) next.question = 'Add a research question.';
    if (!name.trim()) next.name = 'Add a display name so the others know who is here.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setFailed(false);
    try {
      const user = await ensureUser();
      // createSession joins the creator through join_session() — the one write path for participants.
      const session = await createSession({ title, researchQuestion: question, displayName: name, userId: user.id });
      saveName(name.trim());
      saveLastSession({ sessionId: session.id, title: session.title, joinCode: session.join_code });
      navigate(`/s/${session.id}`, { replace: true });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <OfflineBanner />
      <main className="page col-form" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
        <h1 className="t-h1">Create a session</h1>
        <p className="t-body muted" style={{ marginTop: 'var(--space-2)' }}>Two things, then you&rsquo;ll get a code to share.</p>

        {!configured && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Notice>Grove isn&rsquo;t connected to its store yet. Set the Supabase environment variables and redeploy.</Notice>
          </div>
        )}

        <form onSubmit={submit} style={{ marginTop: 'var(--space-8)' }} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="title">Session title</label>
            <input
              id="title" className="input" value={title} disabled={busy} placeholder="Pricing discovery — Acme"
              aria-invalid={errors.title ? 'true' : undefined} aria-describedby="title-help"
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title
              ? <span className="field__error" id="title-help">{errors.title}</span>
              : <span className="field__help" id="title-help">Shown to everyone who joins.</span>}
          </div>

          <div className="field" style={{ marginTop: 'var(--space-6)' }}>
            <label className="field__label" htmlFor="question">Research question</label>
            <textarea
              id="question" className="textarea textarea--heavy" rows={3} value={question} disabled={busy}
              placeholder="What makes them hesitate before buying?"
              aria-invalid={errors.question ? 'true' : undefined} aria-describedby="question-help"
              onChange={(e) => setQuestion(e.target.value)}
            />
            {errors.question
              ? <span className="field__error" id="question-help">{errors.question}</span>
              : <span className="field__help" id="question-help">Pinned at the top of the session for every observer. It cannot be changed once the session starts.</span>}
          </div>

          <div className="field" style={{ marginTop: 'var(--space-6)' }}>
            <label className="field__label" htmlFor="name">Your display name</label>
            <input
              id="name" className="input" value={name} disabled={busy} placeholder="Priya"
              aria-invalid={errors.name ? 'true' : undefined} aria-describedby="name-help"
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name
              ? <span className="field__error" id="name-help">{errors.name}</span>
              : <span className="field__help" id="name-help">Other observers see your name and how many notes you&rsquo;ve written. They never see the notes.</span>}
          </div>

          {failed && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <Notice>Couldn&rsquo;t create the session. Nothing was saved. Try again.</Notice>
            </div>
          )}

          <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 'var(--space-8)' }} disabled={busy}>
            {busy ? 'Creating session.' : 'Create session'}
          </button>
        </form>

        <div className="center" style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/" className="btn btn--ghost" style={{ textDecoration: 'none' }}>Back</Link>
        </div>
      </main>
    </>
  );
}
