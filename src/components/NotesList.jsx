import React from 'react';
import { DocIcon, AvatarStack, LockIcon } from './ui';
import { shortTime } from '../lib/fmt';
import { useStudio } from '../state/Store';

function SelectToggle({ picked, onToggle, label }) {
  return (
    <button
      className={'select-toggle' + (picked ? ' on' : '')}
      aria-pressed={picked}
      aria-label={label}
      title={picked ? 'Remove from studio scope' : 'Add to studio scope'}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      {picked && (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1.5 5.5 L4 8 L8.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
export { SelectToggle };

export default function NotesList({ space, notes, members, presence, meUserId, myMemberId, onOpen, onNew, onDelete, onShareNote }) {
  const studio = useStudio();
  const isShared = space.kind === 'shared';
  const memberByMemberId = new Map(members.map((m) => [m.memberId, m]));

  const label = isShared
    ? `${notes.length} note${notes.length === 1 ? '' : 's'} — shared ones are live for everyone in this space`
    : `${notes.length} private note${notes.length === 1 ? '' : 's'} — visible only to you`;

  return (
    <div className="notes-list">
      <div className="list-head">
        <span className="label">{label}</span>
        <button className="btn btn-primary btn-sm" onClick={onNew}>+ New note</button>
      </div>

      {notes.map((n) => {
        const author = memberByMemberId.get(n.author_id);
        const mine = author?.userId === meUserId;
        const editors = presence.filter((p) => p.noteId === n.id && p.userId !== meUserId);
        const isPrivate = n.visibility !== 'shared';
        const audience = isPrivate
          ? [author].filter(Boolean)
          : members;
        const picked = studio.selNotes.has(n.id);
        return (
          <div className={'note-card' + (picked ? ' sel-ring' : '')} key={n.id} onClick={() => onOpen(n)}>
            <div className="row">
              {studio.expanded && (
                <SelectToggle picked={picked} onToggle={() => studio.toggleNote(n.id)} label={`Studio scope: ${n.title}`} />
              )}
              <DocIcon />
              <button className="title" onClick={(e) => { e.stopPropagation(); onOpen(n); }}>{n.title}</button>
              {editors.length > 0 && (
                <span className="editing-chip"><span className="dot" />EDITING NOW</span>
              )}
              {isPrivate && isShared && (
                <span className="private-note-chip"><LockIcon size={9} />ONLY YOU</span>
              )}
              <div className="acts" onClick={(e) => e.stopPropagation()}>
                <button className="btn-ghost" onClick={() => onOpen(n)}>Edit</button>
                {isShared && (
                  <button className="btn-ghost" onClick={() => onShareNote(n)}>Share</button>
                )}
                {mine && (
                  <button className="btn-ghost danger" onClick={() => onDelete(n)}>Delete</button>
                )}
              </div>
            </div>
            <p className="preview">{(n.body ?? '').trim().replace(/\s+/g, ' ').slice(0, 140) || 'Empty — open it and start typing.'}</p>
            <div className="foot">
              <span className="byline">by {mine ? 'you' : (author?.name ?? 'a teammate')}{author?.role === 'owner' || mine ? ' · admin' : ''}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                {isShared && <AvatarStack people={audience} size={20} max={5} />}
                <span className="updated">{shortTime(n.updated_at)}</span>
              </span>
            </div>
          </div>
        );
      })}

      {!notes.length && (
        <div className="empty-note" style={{ background: 'var(--surface)', border: '1px dashed var(--border-strong)', borderRadius: 14 }}>
          No notes yet. Hit <b>+ New note</b> — {isShared ? 'teammates see it appear in their list right away.' : 'only you will ever see what you write here.'}
        </div>
      )}
    </div>
  );
}
