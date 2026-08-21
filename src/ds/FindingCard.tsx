// Grove — 8.10 Finding card. GROVE-MASTER.md §8.10.
import type { Finding, RosterRow } from '../lib/models';
import { step } from '../lib/step';
import { Badge } from './Badge';
import { Chip } from './Chip';
import { Disagreement } from './Disagreement';

/** A contributing observer is a roster row (names, colours, counts — never
 *  note text), keyed by participant_id, not a Participant row. */
export type Contributor = Pick<RosterRow, 'participant_id' | 'display_name' | 'colour_index'>;

export interface FindingCardProps {
  finding: Finding;
  total: number;
  contributors: Contributor[];
}

/* ---------- 8.10 Finding card. It shows everything it has; there is no
   expand. A sole-observer card renders at FULL opacity, full size, full type
   scale — position carries the ranking, opacity does not. ---------- */
export function FindingCard({ finding, total, contributors }: FindingCardProps) {
  return (
    <article className="finding" id={`finding-${finding.id}`} data-corrob={step(finding.observer_count)} tabIndex={-1}>
      <Badge count={finding.observer_count} total={total} />
      <h3 className="t-h2 finding__theme">{finding.theme}</h3>
      <p className="t-body finding__summary">{finding.summary}</p>
      {finding.has_disagreement && finding.disagreement_note && (
        <Disagreement note={finding.disagreement_note} />
      )}
      {contributors.length > 0 && (
        <div className="finding__by">
          <span className="t-label muted">Noted by</span>
          {contributors.map((p) => (
            <Chip key={p.participant_id} name={p.display_name} colourIndex={p.colour_index} />
          ))}
        </div>
      )}
    </article>
  );
}
