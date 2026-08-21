// Grove — 8.12 / 8.13 Convergence grid. GROVE-MASTER.md §8.12–8.13.
import type { Finding, RosterRow } from '../lib/models';
import { Chip } from './Chip';

export interface ConvergenceGridProps {
  findings: Finding[];
  /** Columns are roster rows, in join order: names, colours, counts — never note text. */
  roster: RosterRow[];
  /** finding_id → set of participant_id. See ../lib/supporters. */
  supporters: Map<string, Set<string>>;
}

/* ---------- 8.12 / 8.13 Convergence grid.
   A real <table>, at most 8 rows and 5 columns. It needs no virtualisation, no
   canvas and no charting library — if one is ever proposed, the answer is no.
   Marks are OBSERVER IDENTITY colours, never the corroboration ladder.
   Cells are not interactive and carry no tooltip: a cell tooltip is the
   shortest path to leaking note text. ---------- */
export function ConvergenceGrid({ findings, roster, supporters }: ConvergenceGridProps) {
  const rows = findings.slice(0, 8);
  // One observer, or fewer than two findings → does not render at all,
  // silently. No placeholder, no message. (E13)
  if (roster.length < 2 || findings.length < 2) return null;

  const caption = findings.length > 8
    ? 'Top 8 findings by corroboration. Columns are observers, in join order.'
    : 'Findings by corroboration. Columns are observers, in join order.';

  const focusCard = (id: string) => {
    const el = document.getElementById(`finding-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  };

  return (
    <div className="gridbox">
      <table className="cgrid">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="cgrid__rowlabel"><span className="vh">Finding</span></th>
            {roster.map((p) => (
              <th key={p.participant_id} scope="col" className="cgrid__head">
                <span style={{ display: 'inline-flex' }}>
                  <Chip name={p.display_name} colourIndex={p.colour_index} />
                </span>
              </th>
            ))}
            <th scope="col" className="cgrid__count"><span className="vh">Observers</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => {
            const set = supporters.get(f.id) || new Set<string>();
            return (
              <tr key={f.id}>
                <th
                  scope="row"
                  className={`cgrid__rowlabel${f.has_disagreement ? ' cgrid__rowlabel--disagree' : ''}`}
                >
                  <button type="button" onClick={() => focusCard(f.id)}>{f.theme}</button>
                </th>
                {roster.map((p) => (
                  <td key={p.participant_id} className="cgrid__cell">
                    {set.has(p.participant_id)
                      ? <><span className="cgrid__dot" data-colour={p.colour_index % 5} /><span className="vh">{p.display_name} supported this</span></>
                      : <span className="vh">{p.display_name} did not support this</span>}
                  </td>
                ))}
                <td className="cgrid__count">{f.observer_count}/{roster.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
