import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useRoster } from '../hooks/useRoster';
import { useMyNotes } from '../hooks/useMyNotes';
import { useFindings } from '../hooks/useFindings';
import ResearchQuestion from '../components/ResearchQuestion';
import NoteComposer from '../components/NoteComposer';
import NoteList from '../components/NoteList';
import RosterRail from '../components/RosterRail';
import SynthesiseButton from '../components/SynthesiseButton';
import ErrorNotice from '../components/ErrorNotice';

// CAPTURE MODE. Quiet, low chrome, nothing animates. The observer sees the
// research question, their own lane, and the roster — counts only.
export default function Capture() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { session, me, loading, error } = useSession(sessionId);
  const { roster, notes, setNotes, status } = useRoster({
    sessionId,
    participantId: me?.id,
  });
  const { add, edit, remove, busy, error: noteError } = useMyNotes({
    sessionId, participantId: me?.id, notes, setNotes,
  });
  const { running, error: synthError, setError: setSynthError, run } = useFindings(sessionId);
  const [notFoundHere, setNotFoundHere] = useState(false);

  // Route guard: no participant row -> go join (code prefilled when we have it).
  useEffect(() => {
    if (!loading && session && !me) {
      navigate(`/join/${session.join_code ?? ''}`, { replace: true });
    }
    if (!loading && !session && !error) setNotFoundHere(true);
  }, [loading, session, me, error, navigate]);

  if (loading) return <div className="page"><p className="t-muted">Loading…</p></div>;

  if (notFoundHere) {
    return (
      <div className="page page--narrow stack">
        <h1>That session does not exist.</h1>
        <p className="t-muted">Check the link, or start a new session.</p>
        <Link to="/" className="btn">Back to start</Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page page--narrow stack">
        <ErrorNotice>Could not load the session. Check your connection and reload.</ErrorNotice>
      </div>
    );
  }
  if (!session || !me) return <div className="page"><p className="t-muted">Loading…</p></div>;

  async function onSynthesise() {
    const res = await run();
    if (res) navigate(`/s/${sessionId}/findings`);
  }

  return (
    <div className="page">
      <div className="capture-grid">
        <main className="stack-6">
          <div className="stack-2">
            <h1>{session.title}</h1>
            {status === 'synthesised' ? (
              <p className="t-small">
                This session has been synthesised.{' '}
                <Link to={`/s/${sessionId}/findings`}>View the findings</Link> — or keep writing
                and synthesise again.
              </p>
            ) : null}
          </div>

          <ResearchQuestion text={session.research_question} />

          <NoteComposer sessionId={sessionId} onAdd={add} busy={busy} />

          {noteError ? (
            <ErrorNotice>That note did not save. Your text is back in the box — try again.</ErrorNotice>
          ) : null}

          <NoteList notes={notes} onEdit={edit} onDelete={remove} />

          <hr className="divider" />

          <div className="stack-2">
            <SynthesiseButton roster={roster} running={running} onRun={onSynthesise} />
            {synthError ? (
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <ErrorNotice>{synthError}</ErrorNotice>
                <button type="button" className="btn btn--quiet" onClick={() => setSynthError(null)}>
                  Dismiss
                </button>
              </div>
            ) : null}
          </div>
        </main>

        <RosterRail roster={roster} myParticipantId={me.id} joinCode={session.join_code} />
      </div>
    </div>
  );
}
