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
    return (
      <div className="strip">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onToggle} aria-expanded="false">
          {roster.length} observers
        </button>
      </div>
    );
  }
  return (
    <div className="strip" aria-label="Observers" aria-live="polite">
      {roster.map((p) => (
        <span key={p.participant_id} className="strip__item">
          <Chip name={p.display_name} colourIndex={p.colour_index} self={p.participant_id === meId} />
          <span className="strip__count">{p.note_count}</span>
          <span className="vh">{p.display_name}, {p.note_count} notes</span>
        </span>
      ))}
      <span className="spacer" />
      <button type="button" className="btn btn--ghost btn--icon" onClick={onToggle} aria-expanded="true" aria-label="Collapse observers">
        <Icon name="chev" size={12} />
      </button>
    </div>
  );
}
