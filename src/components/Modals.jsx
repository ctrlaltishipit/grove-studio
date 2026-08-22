import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui';
import { useAuth, useData, useToast } from '../state/Store';
import { joinSpace, createSpace, getSpace, notify, inviteByEmail } from '../lib/api';
import { DEMO_SPACE_ID } from '../lib/demoData';
import { spaceTile } from '../lib/colors';

export function JoinModal({ onClose, initialCode = '' }) {
  const nav = useNavigate();
  const { user, displayName } = useAuth();
  const { refreshSpaces } = useData();
  const { toast } = useToast();
  const [code, setCode] = useState((initialCode || '').toUpperCase().slice(0, 6));
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { projectId } = await joinSpace(code, displayName);
      await refreshSpaces();
      onClose();
      nav(`/app/s/${projectId}`);
      const space = await getSpace(projectId).catch(() => null);
      toast(`Joined ${space?.name ?? 'the space'}`, "You're in — the roster updated for everyone", 'ok');
      if (space?.createdBy && space.createdBy !== user.id) {
        notify([space.createdBy], {
          actorName: displayName, kind: 'share',
          text: `${displayName} joined “${space.name}”`,
          sub: 'via join code', projectId,
        });
      }
    } catch (e) {
      toast('Could not join', e.message ?? 'No space with that code.', 'error');
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-stack">
        <div>
          <h3>Join a shared space</h3>
          <div className="sub">Six characters. No O, zero, I, one or L — they get misheard.</div>
        </div>
        <input
          className="code-input" placeholder="GRV7PK" maxLength={6} autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
        />
        <button className="btn btn-primary" style={{ height: 40 }} disabled={busy || code.trim().length !== 6} onClick={go}>
          {busy ? 'Joining…' : 'Join space'}
        </button>
      </div>
    </Modal>
  );
}

export function NewSpaceModal({ onClose }) {
  const nav = useNavigate();
  const { displayName } = useAuth();
  const { refreshSpaces } = useData();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('shared');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      const space = await createSpace({ name, kind, displayName });
      await refreshSpaces();
      onClose();
      nav(`/app/s/${space.id}`);
      toast(
        `${name.trim()} created`,
        kind === 'private'
          ? 'Private — notes + studio, no board'
          : `Shared — invite people with code ${space.joinCode}`,
        'ok');
    } catch (e) {
      toast('Could not create the space', e.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-stack">
        <div>
          <h3>New space</h3>
          <div className="sub">A space is a project — it holds notes, a studio, and (if shared) a board.</div>
        </div>
        <input
          className="modal-input" placeholder="Space name — e.g. Q4 Research" autoFocus
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={'type-pick' + (kind === 'private' ? ' on' : '')} onClick={() => setKind('private')}>
            <b>🔒 Private</b>
            <span>Only you. Notes + studio, no board.</span>
          </button>
          <button className={'type-pick' + (kind === 'shared' ? ' on' : '')} onClick={() => setKind('shared')}>
            <b>Shared</b>
            <span>Live co-editing, board + assignments.</span>
          </button>
        </div>
        <button className="btn btn-primary" style={{ height: 40 }} disabled={busy || !name.trim()} onClick={create}>
          {busy ? 'Creating…' : 'Create space'}
        </button>
      </div>
    </Modal>
  );
}

// Share one or several spaces straight to a person by email — the
// collaboration path when a join code feels too manual.
export function ShareSpacesModal({ onClose }) {
  const { spaces, refreshSpaces } = useData();
  const { toast } = useToast();
  const [picked, setPicked] = useState(new Set());
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  // The built-in sample presents as shared but is client-side only — the
  // server can never authorize invites into it, so keep it out of the picker.
  const shareable = (spaces ?? []).filter((s) => s.kind === 'shared' && s.id !== DEMO_SPACE_ID);

  const flip = (id) => setPicked((p) => {
    const next = new Set(p);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const share = async () => {
    const addr = email.trim();
    if (!addr || !picked.size || busy) return;
    setBusy(true);
    let emailed = 0; let added = 0; let name = null; let anyEmailConfig = false; let failed = 0;
    for (const id of picked) {
      try {
        const r = await inviteByEmail(id, addr);
        if (r.emailed) emailed += 1;
        if (r.addedMember) added += 1;
        if (r.emailConfigured) anyEmailConfig = true;
        name = r.name ?? name;
      } catch { failed += 1; }
    }
    setBusy(false);
    const n = picked.size;
    if (emailed > 0) {
      onClose(); refreshSpaces();
      toast(`Invited ${name ?? addr} to ${emailed} space${emailed === 1 ? '' : 's'}`,
        'An invite email with the link and code is on its way', 'ok');
    } else if (added > 0) {
      onClose(); refreshSpaces();
      toast(`Added ${name ?? addr} to ${added} space${added === 1 ? '' : 's'}`,
        anyEmailConfig ? 'They were added; the email did not send' : "Email isn't set up yet — they're added and can also use the code", 'ok');
    } else if (failed === n) {
      toast('Could not invite', 'Something went wrong — try again in a moment.', 'error');
    } else {
      toast('No account with that email yet', anyEmailConfig
        ? "We emailed them a join link — they'll be in once they sign in."
        : "Set up SMTP to email invites, or share a space's join code.", 'warn');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-stack">
        <div>
          <h3>Share spaces</h3>
          <div className="sub">Pick the spaces, add the person's email — they become a member of each, instantly.</div>
        </div>
        {shareable.length === 0 && (
          <div className="fine">No shared spaces yet — create one first. Private spaces can't be shared.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
          {shareable.map((s) => (
            <button key={s.id} className={'assign-row' + (picked.has(s.id) ? ' current' : '')} onClick={() => flip(s.id)}>
              <span className="avatar" style={{ width: 26, height: 26, borderRadius: 8, background: spaceTile(s.id), fontSize: 12 }}>
                {s.name.trim()[0]?.toUpperCase()}
              </span>
              <div className="who">
                <b>{s.name}</b>
                <span>{s.memberCount} member{s.memberCount === 1 ? '' : 's'} · code {s.joinCode}</span>
              </div>
              {picked.has(s.id) && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--acc-deep)' }}>✓</span>}
            </button>
          ))}
        </div>
        <input
          className="modal-input" type="email" placeholder="Their email — the one they sign in with"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') share(); }}
        />
        <button className="btn btn-primary" style={{ height: 40 }}
          disabled={busy || !picked.size || !email.trim()} onClick={share}>
          {busy ? 'Sharing…' : `Share ${picked.size || ''} space${picked.size === 1 ? '' : 's'}`}
        </button>
        <div className="fine">Guests sign in without an email — hand them the six-character join code instead.</div>
      </div>
    </Modal>
  );
}

// Renders whichever global modal is open (join / new / share).
export default function ModalHost() {
  const { modal, closeModal } = useData();
  if (!modal) return null;
  if (modal.name === 'join') return <JoinModal key={modal.key} onClose={closeModal} initialCode={modal.props?.code} />;
  if (modal.name === 'new') return <NewSpaceModal key={modal.key} onClose={closeModal} />;
  if (modal.name === 'share-spaces') return <ShareSpacesModal key={modal.key} onClose={closeModal} />;
  return null;
}
