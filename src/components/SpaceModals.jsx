import React, { useState } from 'react';
import { Modal, Avatar } from './ui';
import { useAuth, useData, useToast, useStudio } from '../state/Store';
import { updateTask, createTask, notify, shareNoteToSpace, inviteByEmail, shareNotesByEmail } from '../lib/api';
import { fmtDue, isoDateInDays } from '../lib/fmt';

// Compose the toast for an invite result — shared by both share modals.
export function inviteToastCopy(r, addr) {
  const name = r.name || addr;
  if (r.emailed) {
    return {
      title: `Invite emailed to ${addr}`,
      sub: r.addedMember ? `${name} was added to the space too`
        : r.alreadyMember ? `${name} is already a member`
          : 'They can join from the link — or the code in the email',
      kind: 'ok',
    };
  }
  if (r.emailConfigured === false) {
    return {
      title: r.addedMember ? `${name} added to the space` : r.alreadyMember ? `${name} is already a member` : 'Ready to invite',
      sub: r.code ? `Email isn't set up yet — share the code ${r.code}` : "Email isn't set up yet — share the join code.",
      kind: r.addedMember || r.alreadyMember ? 'ok' : 'warn',
    };
  }
  // Configured but the send failed.
  return {
    title: r.addedMember ? `${name} added, but email didn't send` : "Email didn't send",
    sub: r.code ? `Share the code ${r.code} for now.` : 'Try again in a moment.',
    kind: 'warn',
  };
}

// Invite one person by email into one space. Shared by both share modals.
export function InviteRow({ spaceId, onInvited }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const invite = async () => {
    const addr = email.trim();
    if (!addr || busy) return;
    setBusy(true);
    try {
      const r = await inviteByEmail(spaceId, addr);
      const { title, sub, kind } = inviteToastCopy(r, addr);
      toast(title, sub, kind);
      if (r.emailed || r.addedMember) { setEmail(''); onInvited?.(); }
    } catch (e) {
      toast('Could not invite', e.message, 'error');
    }
    setBusy(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="modal-input" style={{ flex: 1, height: 38 }} type="email"
          placeholder="Invite by email…"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') invite(); }}
        />
        <button className="btn btn-primary" style={{ height: 38, borderRadius: 10 }}
          disabled={busy || !email.trim()} onClick={invite}>
          {busy ? 'Inviting…' : 'Send invite'}
        </button>
      </div>
      <div className="fine" style={{ marginTop: 6 }}>
        They get an email with a join link and this space's code. Existing users are added straight away.
      </div>
    </div>
  );
}

// Email the notes the person picked with the circles — specific notes, not
// a whole space. Shared by the space share modal and the sample's.
export function ShareNotesRow({ projectId, picked, demo = false }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const addr = email.trim();
    if (!addr || busy || !picked.length) return;
    setBusy(true);
    try {
      const r = await shareNotesByEmail(projectId, addr, demo
        ? { notes: picked.map((n) => ({ id: n.id, title: n.title, body: n.body })) }
        : { noteIds: picked.map((n) => n.id) });
      toast(`Emailed ${r.count} note${r.count === 1 ? '' : 's'} to ${addr}`, 'The full text of each note, in one email', 'ok');
      setEmail('');
    } catch (e) {
      toast('Could not share the notes', e.message, 'error');
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="studio-label" style={{ marginBottom: 6 }}>Email selected notes · {picked.length}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {picked.map((n) => (
          <span key={n.id} className="key-chip" style={{ maxWidth: '100%' }}><span>{n.title}</span></span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="modal-input" style={{ flex: 1, height: 38 }} type="email"
          placeholder="Their email…"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <button className="btn btn-primary" style={{ height: 38, borderRadius: 10 }} disabled={busy || !email.trim()} onClick={send}>
          {busy ? 'Sending…' : 'Send notes'}
        </button>
      </div>
      <div className="fine" style={{ marginTop: 6 }}>They get the full text of these notes by email — no account needed.</div>
    </div>
  );
}

// -------------------------------------------------------------- share space

export function ShareSpaceModal({ space, members, note, meUserId, onClose, onChanged, notes = [] }) {
  const { toast } = useToast();
  const studio = useStudio();
  const pickedNotes = notes.filter((n) => studio.selNotes.has(n.id));
  const isNoteShare = !!note;
  const canShareNote = isNoteShare && note.visibility !== 'shared';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(space.joinCode);
      toast('Code copied', 'Anyone with it joins this space as a member', 'ok');
    } catch {
      toast('Copy failed', `The code is ${space.joinCode}`, 'warn');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-stack">
        <div>
          <h3>{isNoteShare ? `Share “${note.title}”` : `Share “${space.name}”`}</h3>
          <div className="sub">
            {isNoteShare
              ? (canShareNote
                ? 'This note is private to you. Share it and everyone in the space can read it live.'
                : 'This note is shared — everyone in the space reads it live as it changes.')
              : 'Anyone with the six-character code joins as a member and sees the shared notes.'}
          </div>
        </div>

        {canShareNote && (
          <button className="btn btn-primary" style={{ height: 38 }} onClick={async () => {
            await shareNoteToSpace(note.id);
            onChanged?.();
            onClose();
            toast('Shared to the space', `All ${members.length} members can now read it`, 'ok');
          }}>Share this note with the space</button>
        )}

        <InviteRow spaceId={space.id} onInvited={onChanged} />

        {pickedNotes.length > 0
          ? <ShareNotesRow projectId={space.id} picked={pickedNotes} />
          : <div className="fine">To email specific notes, open the Studio and tick the circles on the notes first.</div>}

        <div>
          <div className="studio-label" style={{ marginBottom: 6 }}>Join code</div>
          <div className="big-code" onClick={copy} title="Click to copy">{space.joinCode}</div>
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={copy}>Copy code</button>
        </div>

        <div>
          <div className="studio-label" style={{ marginBottom: 2 }}>Members · {members.length}</div>
          <div>
            {members.map((m) => (
              <div className="member-row" key={m.memberId}>
                <Avatar name={m.name} colourIndex={m.colourIndex} size={28} />
                <div className="who">
                  <b>{m.name}{m.userId === meUserId ? ' (you)' : ''}</b>
                  <span>{m.role === 'owner' ? 'Created this space' : 'Member'}</span>
                </div>
                {m.role === 'owner' && <span className="role-chip">Admin</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="fine">
          Access is per-space. Private notes stay private — sharing the code never exposes them.
        </div>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------- assign task

export function AssignModal({ space, task, members, noteTitle, onClose, onChanged }) {
  const { user, displayName } = useAuth();
  const { refreshTasks } = useData();
  const { toast } = useToast();
  const current = task.assignee_user;

  const pick = async (m) => {
    try {
      await updateTask(task.id, { assignee_user: m.userId, assigned_by_user: user.id });
      onClose();
      onChanged?.();
      refreshTasks();
      const first = m.name.split(' ')[0];
      toast(`${current ? 'Reassigned' : 'Assigned'} to ${m.name}`,
        `${first} was notified${noteTitle ? ` — note link “${noteTitle}”` : ''}${task.due_date ? ` · due ${fmtDue(task.due_date)}` : ''}`,
        'assign');
      if (m.userId !== user.id) {
        notify([m.userId], {
          actorName: displayName, kind: 'assign',
          text: `${displayName} assigned you “${task.title}”`,
          sub: `${space.name}${noteTitle ? ` › ${noteTitle}` : ''}${task.due_date ? ` · due ${fmtDue(task.due_date)}` : ''}`,
          projectId: space.id, taskId: task.id, noteId: task.note_id,
        });
      }
    } catch (e) {
      toast('Could not assign', e.message, 'error');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-stack" style={{ gap: 12 }}>
        <div>
          <h3>{current ? 'Reassign task' : 'Assign task'}</h3>
          <div className="sub">“{task.title}” — the new owner is notified instantly with the note link and deadline.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {members.map((m) => (
            <button key={m.memberId} className={'assign-row' + (m.userId === current ? ' current' : '')} onClick={() => pick(m)}>
              <Avatar name={m.name} colourIndex={m.colourIndex} size={28} />
              <div className="who">
                <b>{m.name}{m.userId === user.id ? ' (you)' : ''}</b>
                <span>{m.role === 'owner' ? 'Space admin' : 'Member'}</span>
              </div>
              {m.userId === current && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)' }}>current</span>}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------- new task

const LABELS = ['Spec', 'Research', 'Design', 'Eng', 'Ops'];

export function NewTaskModal({ space, members, notes, status, presetNoteId, presetTitle, onClose, onChanged }) {
  const { user, displayName } = useAuth();
  const { refreshTasks } = useData();
  const { toast } = useToast();
  const [title, setTitle] = useState(presetTitle ?? '');
  const [label, setLabel] = useState('Research');
  const [assignee, setAssignee] = useState(null);
  const [noteId, setNoteId] = useState(presetNoteId ?? '');
  const [due, setDue] = useState(isoDateInDays(7));
  const [busy, setBusy] = useState(false);

  const sharedNotes = notes.filter((n) => n.visibility === 'shared');

  const create = async () => {
    if (busy || !title.trim()) return;
    setBusy(true);
    try {
      const task = await createTask(space.id, {
        title: title.trim(),
        label,
        noteId: noteId || null,
        assigneeUser: assignee?.userId ?? null,
        assignedByUser: user.id,
        dueDate: due || null,
      });
      if (status && status !== 'todo') {
        await updateTask(task.id, { status, progress: status === 'done' ? 100 : 30 });
      }
      onClose();
      onChanged?.();
      refreshTasks();
      const noteTitle = sharedNotes.find((n) => n.id === noteId)?.title;
      if (assignee && assignee.userId !== user.id) {
        toast(`Assigned to ${assignee.name}`, `Notified with the action item${noteTitle ? ', note link' : ''} and deadline (${fmtDue(due) ?? 'none'})`, 'assign');
        notify([assignee.userId], {
          actorName: displayName, kind: 'assign',
          text: `${displayName} assigned you “${title.trim()}”`,
          sub: `${space.name}${noteTitle ? ` › ${noteTitle}` : ''}${due ? ` · due ${fmtDue(due)}` : ''}`,
          projectId: space.id, taskId: task.id, noteId: noteId || null,
        });
      } else {
        toast('Card added', 'Pick an owner any time — they’ll be notified', 'ok');
      }
    } catch (e) {
      toast('Could not add the card', e.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-stack">
        <div>
          <h3>New card</h3>
          <div className="sub">Type a title, pick an owner — they'll be notified with the note link and deadline.</div>
        </div>
        <input className="modal-input" placeholder="What needs doing?" autoFocus
          value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="modal-input" style={{ flex: 1 }} value={label} onChange={(e) => setLabel(e.target.value)}>
            {LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <input className="modal-input" style={{ flex: 1 }} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        {sharedNotes.length > 0 && (
          <select className="modal-input" value={noteId} onChange={(e) => setNoteId(e.target.value)}>
            <option value="">No source note</option>
            {sharedNotes.map((n) => <option key={n.id} value={n.id}>From: {n.title}</option>)}
          </select>
        )}
        <div>
          <div className="studio-label" style={{ marginBottom: 6 }}>Owner</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.map((m) => (
              <button key={m.memberId}
                className={'assign-row' + (assignee?.memberId === m.memberId ? ' current' : '')}
                onClick={() => setAssignee(assignee?.memberId === m.memberId ? null : m)}>
                <Avatar name={m.name} colourIndex={m.colourIndex} size={28} />
                <div className="who">
                  <b>{m.name}{m.userId === user.id ? ' (you)' : ''}</b>
                  <span>{m.role === 'owner' ? 'Space admin' : 'Member'}</span>
                </div>
                {assignee?.memberId === m.memberId && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--acc-deep)' }}>owner</span>}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" style={{ height: 40 }} disabled={busy || !title.trim()} onClick={create}>
          {busy ? 'Adding…' : assignee ? 'Add & notify' : 'Add card'}
        </button>
      </div>
    </Modal>
  );
}
