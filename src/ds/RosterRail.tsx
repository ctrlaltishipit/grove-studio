// Grove — 8.8 Roster rail. Counts only.
// NOT interactive: no click handler, no link, no tooltip attribute, no
// pointer-reveal card, no bottom sheet — at any breakpoint. This is the
// component that proves the product claim; an affordance here destroys the
// proof. GROVE-MASTER.md §8.8.
import { Chip } from './Chip';
import type { RosterRow } from '../lib/models';

export interface RosterRailProps {
  roster: RosterRow[];
  meId?: string | null;
  loading?: boolean;
}

export function RosterRail({ roster, meId, loading }: RosterRailProps) {
  return (
    <aside className="rail" aria-label="Observers">
      <div className="rail__head">
        <h3 className="t-h3">Observers</h3>
        <span className="spacer" />
        <span className="t-badge">{roster.length}</span>
      </div>
      {loading ? (
        <p className="t-body muted">Loading observers.</p>
      ) : (
        <ul aria-live="polite">
          {roster.map((p) => (
            <li key={p.participant_id} className="rosteritem">
              <Chip name={p.display_name} colourIndex={p.colour_index} self={p.participant_id === meId} />
              <span className="rosteritem__name">
                {p.display_name}{p.participant_id === meId ? ' (you)' : ''}
              </span>
              <span className="rosteritem__count">{p.note_count}</span>
              <span className="vh">{p.display_name}, {p.note_count} notes</span>
            </li>
          ))}
        </ul>
      )}
      <p className="rail__foot">Counts only. Note text stays in each observer&rsquo;s lane.</p>
    </aside>
  );
}
