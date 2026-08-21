// Grove — 8.6 Note card. Edit and Delete are ALWAYS visible — hover-reveal
// fails on touch and hides destructive actions. There is no read-only variant
// for another observer's note; that view does not exist. GROVE-MASTER.md §8.6.
import { useState } from 'react';
import type { Note } from '../lib/models';

export interface NoteCardProps {
  note: Note;
  onSave: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onSave, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(note.body);

  const time = new Date(note.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  if (editing) {
    return (
      <article className="note">
        <label className="vh" htmlFor={`edit-${note.id}`}>Edit note</label>
        <textarea
          id={`edit-${note.id}`}
          className="textarea"
          style={{ fontSize: 'var(--note-size)' }}
          rows={3}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(note.body); setEditing(false); } }}
        />
        <div className="note__meta">
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setDraft(note.body); setEditing(false); }}>Cancel</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => { onSave(note.id, draft); setEditing(false); }} disabled={!draft.trim()}>Save</button>
        </div>
      </article>
    );
  }

  return (
    <article className={`note${note.pending ? ' note--pending' : ''}${note.failed ? ' note--failed' : ''}`}>
      <p className="note__body">{note.body}</p>
      <div className="note__meta">
        {confirming ? (
          <>
            <span>Delete this note?</span>
            <span className="spacer" />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>Keep</button>
            <button type="button" className="btn btn--destructive btn--sm" onClick={() => onDelete(note.id)}>Delete</button>
          </>
        ) : (
          <>
            <span>{note.kind}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular">{note.pending ? 'Saving.' : note.failed ? 'Not saved.' : time}</span>
            {!note.pending && !note.failed && (
              <span className="note__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>Edit</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(true)}>Delete</button>
              </span>
            )}
          </>
        )}
      </div>
    </article>
  );
}
