// The loudest element on a finding card. Tabular numerals. Reads "3 of 3
// observers". The number is computed by our own code from note ids the model
// returned — the model never computes observer_count or rank.
export default function CorroborationBadge({ count, total }) {
  const step = count >= 3 ? 3 : count === 2 ? 2 : 1;
  return (
    <span className={`corrob corrob--${step}`}>
      <span className="t-num">{count}</span>
      <span className="corrob__of t-num">of {total} observers</span>
    </span>
  );
}
