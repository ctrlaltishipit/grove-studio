import CorroborationBadge from './CorroborationBadge';
import DisagreementNote from './DisagreementNote';
import ObserverInitials from './ObserverInitials';

export default function FindingCard({ finding, observerTotal, contributors }) {
  const c = finding.observer_count ?? 1;
  const step = c >= 3 ? 'c3' : c === 2 ? 'c2' : 'c1';
  const n = finding.supporting_note_ids?.length ?? 0;

  return (
    <article className={`finding finding--${step}`}>
      <div className="finding__head">
        <h3 className="finding__theme">{finding.theme}</h3>
        <CorroborationBadge count={c} total={observerTotal} />
      </div>

      <p className="finding__summary">{finding.summary}</p>

      {finding.has_disagreement ? <DisagreementNote text={finding.disagreement_note} /> : null}

      <div className="finding__foot">
        {contributors?.length ? (
          <span className="row" style={{ gap: 'var(--space-1)' }}>
            {contributors.map((p) => (
              <ObserverInitials
                key={p.participant_id}
                name={p.display_name}
                colourIndex={p.colour_index}
                small
              />
            ))}
          </span>
        ) : null}
        <span className="t-small t-faint t-num">
          {n} supporting {n === 1 ? 'note' : 'notes'}
        </span>
        {c === 1 ? (
          <span className="t-small t-faint">
            One observer only. Shown because a single observation is still evidence — just weaker.
          </span>
        ) : null}
      </div>
    </article>
  );
}
