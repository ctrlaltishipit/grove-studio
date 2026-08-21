// Recessive until at least two observers have notes. Disabled while in flight.
// No spinner theatre, no progress bar pretending to know how long it takes.
export default function SynthesiseButton({ roster, running, onRun }) {
  const withNotes = roster.filter((p) => (p.note_count ?? 0) > 0).length;
  const ready = withNotes >= 2;

  return (
    <div className="row row--wrap" style={{ gap: 'var(--space-3)' }}>
      <button
        type="button"
        className={ready ? 'btn btn--primary' : 'btn'}
        onClick={onRun}
        disabled={!ready || running}
      >
        {running ? 'Synthesising…' : 'Synthesise'}
      </button>
      <span className="t-small t-muted">
        {ready
          ? `${withNotes} observers have notes.`
          : 'Synthesis needs at least two observers with notes.'}
      </span>
    </div>
  );
}
