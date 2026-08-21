// Amber. Never red — --danger is for destructive actions only.
// Both positions are stated. Neither is resolved. That is the point.
export default function DisagreementNote({ text }) {
  if (!text) return null;
  return (
    <div className="disagree">
      <div className="disagree__label">Observers disagreed</div>
      <p className="disagree__text">{text}</p>
    </div>
  );
}
