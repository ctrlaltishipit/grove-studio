import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useFindings } from '../hooks/useFindings';
import { getRoster, getPublicRoster, getFindingObservers } from '../lib/data';
import FindingCard from '../components/FindingCard';
import ConvergenceGrid from '../components/ConvergenceGrid';
import IndependenceReceipt from '../components/IndependenceReceipt';
import EmptyState from '../components/EmptyState';
import ErrorNotice from '../components/ErrorNotice';

// SYNTHESIS MODE. Brighter, structured, tighter. Read-only for everyone,
// including a stakeholder who never joined — this route must load with no
// auth, no join, no code. The corroboration badge is the loudest element.
export default function Findings() {
  const { sessionId } = useParams();
  const { session, me, loading } = useSession(sessionId);
  const { findings, loading: findingsLoading, running, error, run } = useFindings(sessionId);
  const [roster, setRoster] = useState([]);
  const [observerMap, setObserverMap] = useState([]);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      // Participants get the live roster; an absent stakeholder gets the
      // public one (synthesised sessions only). Both return counts, never text.
      try {
        setRoster(me ? await getRoster(sessionId) : await getPublicRoster(sessionId));
      } catch { setRoster([]); }
      try { setObserverMap(await getFindingObservers(sessionId)); } catch { setObserverMap([]); }
    })();
  }, [sessionId, me, findings.length]);

  const contributorsFor = useMemo(() => {
    const byId = new Map(roster.map((p) => [p.participant_id, p]));
    return (finding) =>
      observerMap
        .filter((row) => row.finding_id === finding.id)
        .map((row) => byId.get(row.participant_id))
        .filter(Boolean);
  }, [roster, observerMap]);

  const observerTotal = roster.length || Math.max(...findings.map((f) => f.observer_count ?? 1), 1);
  const noteTotal = roster.reduce((sum, p) => sum + (p.note_count ?? 0), 0);
  const synthesisedAt = findings[0]?.created_at;

  if (loading || findingsLoading) {
    return <div className="page"><p className="t-muted">Loading…</p></div>;
  }

  return (
    <div className="page stack-6" style={{ maxWidth: 820 }}>
      <div className="stack-2">
        <div className="row row--between row--wrap">
          <h1>{session?.title ?? 'Findings'}</h1>
          {me ? <Link className="btn btn--quiet" to={`/s/${sessionId}`}>Back to capture</Link> : null}
        </div>
        {session?.research_question ? (
          <p className="t-muted">{session.research_question}</p>
        ) : null}
      </div>

      {findings.length ? (
        <>
          <IndependenceReceipt
            observerCount={observerTotal}
            noteCount={noteTotal}
            synthesisedAt={synthesisedAt}
          />

          <div className="stack">
            {findings.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                observerTotal={observerTotal}
                contributors={contributorsFor(f)}
              />
            ))}
          </div>

          <ConvergenceGrid findings={findings} roster={roster} contributorsFor={contributorsFor} />

          {me ? (
            <div className="stack-2">
              <button type="button" className="btn" onClick={run} disabled={running}>
                {running ? 'Synthesising…' : 'Synthesise again'}
              </button>
              <p className="t-small t-faint">
                Re-running replaces these findings with a fresh merge of everything written so far.
              </p>
              <ErrorNotice>{error}</ErrorNotice>
            </div>
          ) : (
            <p className="t-small t-faint">
              You are viewing this session's findings as a stakeholder. Note text stays private
              to each observer; what you see here is the merge.
            </p>
          )}
        </>
      ) : (
        <EmptyState title="No findings yet.">
          {me
            ? 'Once at least two observers have notes, Synthesise from the capture screen.'
            : 'This session has not been synthesised yet. Ask an observer to run synthesis.'}
        </EmptyState>
      )}
    </div>
  );
}
