// Grove — S6 Findings and S7 Shared findings. GROVE-MASTER.md §7 S6, S7.
//
// Same route. A participant gets "Back to your notes"; a non-participant gets a
// context strip and no controls. Every number on this page comes from data we
// own: the roster RPCs (names, colours, COUNTS) and get_finding_observers (ids).
// Nothing here reads another observer's note text, and nothing here signs
// anyone in — a share link must load with zero auth requests.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConvergenceGrid } from '../ds/ConvergenceGrid';
import { Empty } from '../ds/Empty';
import { FindingCard } from '../ds/FindingCard';
import { Header } from '../ds/Header';
import { OfflineBanner } from '../ds/OfflineBanner';
import { QuestionBand } from '../ds/QuestionBand';
import { Receipt } from '../ds/Receipt';
import { useToast } from '../ds/Toast';
import { getCachedUser } from '../lib/auth';
import type { Finding, RosterRow, Session } from '../lib/models';
import { buildSupporters } from '../lib/supporters';
import { istTime } from '../lib/time';
import { configured, getFindingObservers, getMyParticipant, getPublicRoster, getRoster, getSession, listFindings } from '../lib/supabase';

type State =
  | { loading: true }
  | { loading: false; failed: true }
  | { loading: false; failed?: false; session: Session; findings: Finding[]; roster: RosterRow[]; supporters: Map<string, Set<string>>; noteCount: number; isParticipant: boolean };

export default function Findings() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const toast = useToast();
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured) { setState({ loading: false, failed: true }); return; }
      try {
        const session = await getSession(sessionId);
        if (cancelled) return;
        // Unreadable = not a participant and not synthesised yet → E12, nothing else.
        if (!session) { setState({ loading: false, failed: true }); return; }
        const user = await getCachedUser();
        const mine = user ? await getMyParticipant(sessionId, user.id).catch(() => null) : null;
        const [findings, roster, observers] = await Promise.all([
          listFindings(sessionId),
          mine ? getRoster(sessionId) : getPublicRoster(sessionId),
          getFindingObservers(sessionId),
        ]);
        if (cancelled) return;
        setState({
          loading: false,
          session,
          findings,
          roster,
          supporters: buildSupporters(observers),
          noteCount: roster.reduce((sum, r) => sum + r.note_count, 0),
          isParticipant: Boolean(mine),
        });
      } catch {
        if (!cancelled) setState({ loading: false, failed: true });
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (state.loading) {
    return (
      <>
        <Header />
        <main className="page col-content" style={{ paddingTop: 'var(--space-8)' }}>
          <p className="t-body muted">Loading findings.</p>
        </main>
      </>
    );
  }

  if (state.failed) {
    return (
      <>
        <Header />
        <main className="page col-content" style={{ paddingTop: 'var(--space-8)' }}>
          <Empty>No findings at this link yet.</Empty>
        </main>
      </>
    );
  }

  const { session, findings, roster, supporters, noteCount, isParticipant } = state;
  const total = roster.length;
  const solo = total <= 1;
  const at = findings[0]?.created_at ?? null;

  const corroborated = findings.filter((f) => f.observer_count > 1);
  const singles = findings.filter((f) => f.observer_count === 1);
  const grouped = !solo && corroborated.length > 0 && singles.length > 0;

  const contributorsFor = (finding: Finding) => {
    const set = supporters.get(finding.id) ?? new Set<string>();
    return roster.filter((r) => set.has(r.participant_id));
  };

  const renderCard = (f: Finding) => <FindingCard key={f.id} finding={f} total={total} contributors={contributorsFor(f)} />;

  return (
    <>
      <Header
        left={isParticipant
          ? <Link to={`/s/${sessionId}`} className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>Back to your notes</Link>
          : <Link to="/" className="wordmark">Grove</Link>}
        right={(
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              toast.show('Share link copied. Anyone with the link can read these findings.');
            }}
          >
            Copy share link
          </button>
        )}
      />
      <OfflineBanner />

      <main className="page col-content" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        {!isParticipant && (
          <div style={{ background: 'var(--sunken)', borderRadius: 'var(--radius-input)', padding: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <p className="t-label muted">
              A read-only view. {total} observer{total === 1 ? '' : 's'} wrote these notes in separate lanes; you&rsquo;re reading what they converged on.
            </p>
          </div>
        )}

        <QuestionBand question={session.research_question} />

        <div style={{ marginTop: 'var(--space-8)' }}>
          <h1 className="t-h1">Findings</h1>
          <p className="t-body muted" style={{ marginTop: 'var(--space-2)' }}>
            {solo ? 'Your notes, grouped.' : 'Ranked by how many observers independently noted them.'}
          </p>
        </div>

        {findings.length === 0 ? (
          <div style={{ marginTop: 'var(--space-8)' }}>
            <Empty action={isParticipant ? <Link to={`/s/${sessionId}`} className="btn btn--secondary btn--sm" style={{ textDecoration: 'none' }}>Back to your notes</Link> : null}>
              {isParticipant ? 'No findings yet. Synthesise when the session is done.' : 'No findings yet.'}
            </Empty>
          </div>
        ) : (
          <>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Receipt observers={total} notes={noteCount} at={at} solo={solo} />
            </div>

            <div style={{ marginTop: 'var(--space-8)' }}>
              <ConvergenceGrid findings={findings} roster={roster} supporters={supporters} />
            </div>

            <div className="stack stack-4 fade-in-once" style={{ marginTop: 'var(--space-8)' }}>
              {grouped ? corroborated.map(renderCard) : findings.map(renderCard)}
            </div>

            {grouped && (
              <div style={{ marginTop: 'var(--space-8)' }}>
                <h2 className="t-h3">Seen by one observer only</h2>
                <p className="t-body muted measure" style={{ marginTop: 'var(--space-2)' }}>
                  These are observer signal, not noise. Grove shows them rather than filtering them out.
                </p>
                <div className="stack stack-4" style={{ marginTop: 'var(--space-4)' }}>{singles.map(renderCard)}</div>
              </div>
            )}

            <p className="t-label muted tabular" style={{ marginTop: 'var(--space-12)' }}>
              {solo
                ? `Synthesised from ${noteCount} notes at ${istTime(at) ?? ''} IST.`
                : `Synthesised from ${noteCount} notes across ${total} observers at ${istTime(at) ?? ''} IST.`}
            </p>
          </>
        )}

        {!isParticipant && (
          <p className="t-label muted" style={{ marginTop: 'var(--space-8)' }}>
            Grove — findings ranked by how many observers independently noted them.
          </p>
        )}
      </main>
      {toast.node}
    </>
  );
}
