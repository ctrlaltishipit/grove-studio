import RosterChip from './RosterChip';

export default function RosterRail({ roster, myParticipantId, joinCode }) {
  const total = roster.reduce((sum, p) => sum + (p.note_count ?? 0), 0);
  return (
    <aside className="roster" aria-label="Observers in this session">
      <div className="roster__title">Observers · {roster.length}</div>
      <div className="roster__list">
        {roster.map((p) => (
          <RosterChip key={p.participant_id} person={p} isMe={p.participant_id === myParticipantId} />
        ))}
      </div>
      <div className="roster__foot t-small t-muted">
        <div>{total} {total === 1 ? 'note' : 'notes'} in this session.</div>
        <div style={{ marginTop: 'var(--space-2)' }}>
          You can see that others are writing. You cannot see what they wrote — that is
          what makes the count mean something.
        </div>
        {joinCode ? (
          <div style={{ marginTop: 'var(--space-3)' }}>
            Join code <strong className="t-num">{joinCode}</strong>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
