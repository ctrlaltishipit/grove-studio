// Grove — 8.23 Mind map (amendment A3). GROVE-MASTER.md §8.23.
// stretch — not mounted in v1. Ported verbatim from the reference build so it
// is ready to mount; nothing imports it.
import type { Finding, RosterRow } from '../../lib/models';

export interface MindMapProps {
  /** The research question. Pinned at the top of the page; here it is a landmark. */
  question: string | null | undefined;
  findings: Finding[];
  /** Branches are roster rows, in join order: names, colours, counts — never note text. */
  roster: RosterRow[];
  /** finding_id → set of participant_id. See ../../lib/supporters. */
  supporters: Map<string, Set<string>>;
}

/* ---------- 8.23 Mind map (amendment A3).
   Hand-written inline SVG. No charting library, no force simulation, no
   animation, no tooltips. Node size is CONSTANT — scaling a node by count
   would be a heat scale, which §4.3 rule 14 forbids. ---------- */
export function MindMap({ question, findings, roster, supporters }: MindMapProps) {
  const rows = findings.slice(0, 8);
  if (rows.length < 2) return null;

  const HUB_R = 44;   // --map-hub, as a number: SVG geometry attributes do not resolve var()
  const NODE_R = 6;   // --map-node / 2. CONSTANT — never scaled by count.
  const W = 760;
  const rowH = 46;
  const H = Math.max(220, rows.length * rowH + 48);
  const hubX = 150;
  const hubY = H / 2;
  const branchX = 330;

  const short = (t: string) => (t.length > 26 ? `${t.slice(0, 25)}…` : t);

  // Wrap the question into at most two 11-character lines so it sits inside
  // the hub rather than spilling over its edge.
  const hubLines = (() => {
    const words = String(question || '').split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let line = '';
    for (const w of words) {
      if ((`${line} ${w}`).trim().length > 11) { if (line) out.push(line); line = w; }
      else line = (`${line} ${w}`).trim();
      if (out.length === 2) break;
    }
    if (out.length < 2 && line) out.push(line);
    if (out.length === 2 && words.join(' ').length > out.join(' ').length) {
      out[1] = `${out[1].slice(0, 10)}…`;
    }
    return out.length ? out : ['Session'];
  })();

  return (
    <div className="map">
      <p className="t-label muted" style={{ marginBottom: 'var(--space-3)' }}>
        Top 8 findings. Branches are observers, in join order.
      </p>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Mind map of ${rows.length} findings across ${roster.length} observers`}>
        <circle className="map__hub" cx={hubX} cy={hubY} r={HUB_R} />
        {/* Two short lines inside the hub. The full question is already
            pinned at the top of the page, so this is a landmark, not a label. */}
        {hubLines.map((line, i) => (
          <text
            key={i}
            className="map__hubtext"
            x={hubX}
            y={hubY - 4 + i * 15}
            textAnchor="middle"
          >
            {line}
          </text>
        ))}
        {rows.map((f, i) => {
          const y = 32 + i * rowH;
          const set = supporters.get(f.id) || new Set<string>();
          const supporting = roster.filter((p) => set.has(p.participant_id));
          return (
            <g key={f.id}>
              <path className="map__edge" d={`M ${hubX + HUB_R + 2} ${hubY} C ${hubX + 120} ${hubY}, ${branchX - 90} ${y}, ${branchX - 12} ${y}`} />
              {f.has_disagreement && (
                <line className="map__disagree" x1={branchX - 8} y1={y - 12} x2={branchX - 8} y2={y + 12} />
              )}
              <text className="map__label" x={branchX} y={y + 4}>{short(f.theme)}</text>
              {supporting.map((p, j) => (
                <circle
                  key={p.participant_id}
                  className="map__node"
                  data-colour={p.colour_index % 5}
                  cx={W - 130 + j * 20}
                  cy={y}
                  r={NODE_R}
                />
              ))}
              <text className="map__count" x={W - 24} y={y + 4} textAnchor="end">
                {f.observer_count}/{roster.length}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
