// Grove — DEV ONLY. Mounted only when import.meta.env.DEV is true, so a
// production build cannot render fabricated findings. It exists so Synthesis
// Mode can be designed and verified before Supabase is wired.
//
// v1: the supporters map comes from get_finding_observers() rows (ids only),
// not from a client-side note-owner map — see ../../lib/supporters. The mind
// map (§8.23, stretch) and the Listen block (§8.22) are not mounted in v1, so
// they are not previewed here either.
import { ConvergenceGrid } from '../../ds/ConvergenceGrid';
import { FindingCard } from '../../ds/FindingCard';
import { Header } from '../../ds/Header';
import { OfflineBanner } from '../../ds/OfflineBanner';
import { QuestionBand } from '../../ds/QuestionBand';
import { Receipt } from '../../ds/Receipt';
import type { Finding } from '../../lib/models';
import { buildSupporters } from '../../lib/supporters';
import { istTime } from '../../lib/time';
import { findingObservers, findings, noteCount, roster, session, synthesisedAt } from './fixtures';

export function DevFindings() {
  const supporters = buildSupporters(findingObservers);
  const question = session.research_question;
  const total = roster.length;
  const corroborated = findings.filter((f) => f.observer_count > 1);
  const singles = findings.filter((f) => f.observer_count === 1);
  const contributorsFor = (f: Finding) => {
    const set = supporters.get(f.id) || new Set<string>();
    return roster.filter((p) => set.has(p.participant_id));
  };

  return (
    <>
      <Header right={<span className="t-label muted">preview</span>} />
      <OfflineBanner />
      <main className="page col-content" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <QuestionBand question={question} />
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h1 className="t-h1">Findings</h1>
          <p className="t-body muted" style={{ marginTop: 'var(--space-2)' }}>
            Ranked by how many observers independently noted them.
          </p>
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Receipt observers={total} notes={noteCount} at={synthesisedAt} />
        </div>
        <div style={{ marginTop: 'var(--space-8)' }}>
          <ConvergenceGrid findings={findings} roster={roster} supporters={supporters} />
        </div>
        <div className="stack stack-4" style={{ marginTop: 'var(--space-8)' }}>
          {corroborated.map((f) => (
            <FindingCard key={f.id} finding={f} total={total} contributors={contributorsFor(f)} />
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h2 className="t-h3">Seen by one observer only</h2>
          <p className="t-body muted measure" style={{ marginTop: 'var(--space-2)' }}>
            These are observer signal, not noise. Grove shows them rather than filtering them out.
          </p>
          <div className="stack stack-4" style={{ marginTop: 'var(--space-4)' }}>
            {singles.map((f) => (
              <FindingCard key={f.id} finding={f} total={total} contributors={contributorsFor(f)} />
            ))}
          </div>
        </div>
        <p className="t-label muted tabular" style={{ marginTop: 'var(--space-12)' }}>
          Synthesised from {noteCount} notes across {total} observers at {istTime(synthesisedAt) ?? ''} IST.
        </p>
      </main>
    </>
  );
}
