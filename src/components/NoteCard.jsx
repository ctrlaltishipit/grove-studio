import { useState } from 'react';

function timeOf(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
}

export default function NoteCard({ note, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <div className="note">
        <textarea
          className="textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={4000}
          autoFocus
        />
        <div className="note__meta">
          <span className="note__time">Editing</span>
          <div className="note__actions">
            <button type="button" className="btn btn--quiet" onClick={() => { setDraft(note.body); setEditing(false); }}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={async () => { if (await onEdit(note.id, draft)) setEditing(false); }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="note">
      <p className="note__body">{note.body}</p>
      <div className="note__meta">
        <span className="note__time t-num">
          {note._pending ? 'Saving' : timeOf(note.created_at)}
          {note.updated_at && note.updated_at !== note.created_at && !note._pending ? ' · edited' : ''}
        </span>
        {note.kind && note.kind !== 'observation' ? <span className="kind-tag">{note.kind}</span> : null}
        {note._pending ? null : (
          <div className="note__actions">
            <button type="button" className="btn btn--quiet" onClick={() => setEditing(true)}>Edit</button>
            {confirming ? (
              <>
                <button type="button" className="btn btn--quiet" onClick={() => setConfirming(false)}>Keep</button>
                <button
                  type="button"
                  className="btn btn--quiet btn--danger-quiet"
                  onClick={() => { setConfirming(false); onDelete(note.id); }}
                >
                  Delete
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--quiet" onClick={() => setConfirming(true)}>Delete</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
