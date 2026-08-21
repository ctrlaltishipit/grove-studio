// Grove — 8.8 Roster strip (below 1024px). Counts only; the display name drops
// out. The collapse toggle is the ONLY handler in this file — the items
// themselves are not interactive at any breakpoint. GROVE-MASTER.md §8.8.
import { Chip } from './Chip';
import { Icon } from './Icon';
import type { RosterRow } from '../lib/models';

export interface RosterStripProps {
  roster: RosterRow[];
  meId?: string | null;
  collapsed: boolean;
  onToggle: () => void;
}

export function RosterStrip({ roster, meId, collapsed, onToggle }: RosterStripProps) {
  if (collapsed) {
    const n = roster.length;
    return (
      <div className="strip strip--collapsed">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onToggle} aria-expanded="false">
          {n} observer{n === 1 ? '' : 's'}
        </button>
      </div>
    );
  }
  return (
    <div className="strip">
      {/* role="list" is explicit because list-style: none drops list semantics
          in Safari. Each item carries exactly one hidden name-and-count; the
          chip is unnamed and the visible count is hidden so nothing is heard
          twice. The chip ring is the strip's self marker — the name has
          dropped out, so there is no "(you)" to carry it. §8.8, §11.5 */}
      <ul className="strip__list" role="list" aria-label="Observers" aria-live="polite">
        {roster.map((p) => (
          <li key={p.participant_id} className="strip__item">
            <Chip name={p.display_name} colourIndex={p.colour_index} self={p.participant_id === meId} named={false} />
            <span className="strip__count" aria-hidden="true">{p.note_count}</span>
            <span className="vh">{p.display_name}, {p.note_count} note{p.note_count === 1 ? '' : 's'}</span>
          </li>
        ))}
      </ul>
      <span className="spacer" />
      <button type="button" className="btn btn--ghost btn--icon" onClick={onToggle} aria-expanded="true" aria-label="Collapse observers">
        <Icon name="chev" size={12} />
      </button>
    </div>
  );
}
