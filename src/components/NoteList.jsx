import NoteCard from './NoteCard';
import EmptyState from './EmptyState';

export default function NoteList({ notes, onEdit, onDelete }) {
  if (!notes.length) {
    return (
      <EmptyState title="Your lane is empty.">
        Write what you notice as you notice it. Nobody else can read this until synthesis.
      </EmptyState>
    );
  }
  return (
    <div className="stack">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
