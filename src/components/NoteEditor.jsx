import React, { useState, useEffect, useRef, useCallback } from 'react';
import { updateNote, shareNoteToSpace, listComments, addComment, fetchProfiles, features } from '../lib/api';
import { SAVE_DEBOUNCE_MS, POLL_MS } from '../config';
import { relTime, shortTime } from '../lib/fmt';
import { Avatar, SparkIcon } from './ui';
import { useToast } from '../state/Store';
import { createDictation, dictationSupported } from '../lib/dictation';
import { genNoteBrief } from '../lib/studioApi';
import { STATUS_LABEL, statusStyle } from './TaskBits';

// Per-note brief cache, keyed by note id + version so re-entering an
// unchanged note never re-spends tokens. Session-local by design.
const briefCache = new Map();

function NoteBrief({ note }) {
  const [state, setState] = useState(null); // null | 'busy' | {summary}
  useEffect(() => {
    // Generated ONCE per entry into the note — never while typing.
    const body = (note.body ?? '').trim();
    if (body.length < 60) { setState(null); return undefined; }
    const key = `${note.id}|${note.updated_at}`;
    const hit = [...briefCache.entries()].find(([k]) => k === key)?.[1]
      ?? briefCache.get(key);
    if (hit) { setState(hit); return undefined; }
    let alive = true;
    setState('busy');
    genNoteBrief(note.id)
      .then((r) => {
        // Keep only the freshest brief per note id.
        for (const k of briefCache.keys()) if (k.startsWith(note.id + '|')) briefCache.delete(k);
        briefCache.set(key, r);
        if (alive) setState(r);
      })
      .catch(() => { if (alive) setState(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  if (!state) return null;
  return (
    <div className="note-brief">
      <span className="spark"><SparkIcon size={10} /></span>
      {state === 'busy'
        ? <span style={{ animation: 'pulse 1.6s ease-in-out infinite' }}>summarising…</span>
        : <span>{state.summary}</span>}
    </div>
  );
}

const SAVE_RETRY_MS = 2500;

function MicIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8 a5 5 0 0 0 10 0 M8 13 v2 M5.5 15 h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// A tiny hook wrapping the ported dictation lib: speech is appended into a
// draft through `apply`, never auto-submitted.
function useDictation(apply) {
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState(false);
  const dictation = useRef(null);
  const base = useRef('');
  const listeningRef = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (!listening) return undefined;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  // The microphone is never live in a hidden tab, and stops on unmount.
  useEffect(() => {
    const hide = () => { if (document.hidden) dictation.current?.stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); dictation.current?.stop(); };
  }, []);

  const join = (a, b) => (!b ? a : !a ? b : (/\s$/.test(a) ? a + b : `${a} ${b}`));

  const stop = () => { if (listeningRef.current) dictation.current?.stop(); };

  const toggle = (currentText) => {
    if (listeningRef.current) { stop(); return; }
    setMicError(false);
    setSeconds(0);
    base.current = currentText;
    dictation.current = createDictation({
      onInterim: (text) => applyRef.current(join(base.current, text)),
      onFinal: (text) => { base.current = join(base.current, text); applyRef.current(base.current); },
      onError: (code) => {
        if (code === 'not-allowed' || code === 'service-not-allowed') setMicError(true);
      },
      onEnd: () => { listeningRef.current = false; setListening(false); },
    });
    if (!dictation.current) return;
    dictation.current.start();
    listeningRef.current = true;
    setListening(true);
  };

  return { listening, seconds, micError, toggle, stop };
}

// ---------------------------------------------------------------- comments

function Thread({ note, space, meUserId, meName, meAvatar, live, remoteComment, membersByUser }) {
  const { toast } = useToast();
  const [comments, setComments] = useState(null);
  const [profiles, setProfiles] = useState(new Map());
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const areaRef = useRef(null);

  const refresh = useCallback(async () => {
    try { setComments(await listComments(note.id)); } catch { /* poll again */ }
  }, [note.id]);

  useEffect(() => { setComments(null); setDraft(''); refresh(); }, [note.id, refresh]);

  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, POLL_MS * 2);
    return () => clearInterval(t);
  }, [refresh]);

  // A peer's comment arrives over broadcast — append without waiting to poll.
  useEffect(() => {
    if (!remoteComment || remoteComment.note_id !== note.id) return;
    setComments((c) => {
      if (c === null) return c;
      if (c.some((x) => x.id === remoteComment.id)) return c;
      return [...c, remoteComment];
    });
  }, [remoteComment, note.id]);

  useEffect(() => {
    (async () => {
      const ids = (comments ?? []).map((c) => c.author_user);
      if (ids.length) setProfiles(await fetchProfiles(ids));
    })();
  }, [comments]);

  const dict = useDictation((text) => setDraft(text));

  const send = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    dict.stop();
    setBusy(true);
    try {
      const row = await addComment(note.id, space.id, meUserId, body);
      setDraft('');
      setComments((c) => [...(c ?? []), row]);
      live?.sendComment(row);
      areaRef.current?.focus();
    } catch (e) {
      toast('Comment not sent', features.tasks === false
        ? 'Comments switch on once sql/06_grovestudio.sql is applied.'
        : e.message, 'warn');
    }
    setBusy(false);
  };

  const grow = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(140, el.scrollHeight) + 'px';
  };

  const nameOf = (uid) => uid === meUserId
    ? meName
    : (profiles.get(uid)?.display_name ?? membersByUser.get(uid)?.name ?? 'A teammate');
  const avatarOf = (uid) => uid === meUserId ? meAvatar : (profiles.get(uid)?.avatar_url ?? '');

  return (
    <div className="thread">
      <div className="thread-head">
        <b>Conversation</b>
        <span className="n">{comments?.length ?? 0}</span>
      </div>

      {comments !== null && comments.length > 0 && (
        <div className="thread-list">
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <Avatar name={nameOf(c.author_user)} avatarUrl={avatarOf(c.author_user)}
                colourIndex={membersByUser.get(c.author_user)?.colourIndex ?? c.author_user} size={28} />
              <div style={{ minWidth: 0 }}>
                <div className="c-head">
                  <span className="c-name">{c.author_user === meUserId ? 'You' : nameOf(c.author_user)}</span>
                  <span className="c-time">{shortTime(c.created_at)}</span>
                </div>
                <p className="c-body">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {comments !== null && comments.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--faint)', marginBottom: 12 }}>
          {features.tasks === false
            ? 'Comments switch on once sql/06_grovestudio.sql is applied to the backend.'
            : 'No comments yet — say something, everyone in the space sees it instantly.'}
        </div>
      )}

      <div className="composer-row">
        <Avatar name={meName} avatarUrl={meAvatar} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="composer">
            <textarea
              ref={areaRef}
              rows={1}
              placeholder="Add to the conversation — type or dictate…"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); grow(e.target); }}
              onInput={(e) => grow(e.target)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                if (e.key === 'Escape') dict.stop();
              }}
            />
            {dictationSupported && (
              <button
                className={'mic-btn' + (dict.listening ? ' on' : '')}
                aria-pressed={dict.listening}
                aria-label={dict.listening ? 'Stop dictating' : 'Dictate a comment'}
                title={dict.listening ? 'Stop dictating' : 'Dictate a comment'}
                onClick={() => dict.toggle(draft)}
              >
                <MicIcon />
              </button>
            )}
            <button className="send-btn" aria-label="Send" disabled={busy || !draft.trim()} onClick={send}>
              <svg width="13" height="13" viewBox="0 0 14 14">
                <path d="M2 7 H11 M8 3.5 L11.5 7 L8 10.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="composer-hint" style={{ paddingLeft: 2 }}>
            {dict.listening
              ? `Recording · ${String(Math.floor(dict.seconds / 60)).padStart(2, '0')}:${String(dict.seconds % 60).padStart(2, '0')} — dictation lands in the box, you press send`
              : dict.micError
                ? 'The microphone was refused — allow it in the browser and try again.'
                : 'Enter sends · Shift+Enter for a new line'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ editor

// The live co-written editor. Every keystroke: broadcast to peers fast
// (shared notes only — private notes never leave the DB path), save to the
// DB debounced with retry.
export default function NoteEditor({
  note, space, members, presence, meUserId, meName, meAvatar, live, remoteEdit, remoteComment,
  noteTasks = [], canAssign = false, onAssignNew, onReassign,
  onClose, onDeleted, onChanged, onShare,
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body ?? '');
  const [saveState, setSaveState] = useState('saved'); // saved | saving | retry | readonly
  const [readOnly, setReadOnly] = useState(false);
  const lastTypedAt = useRef(0);
  const saveTimer = useRef(null);
  const typingTimer = useRef(null);
  const latest = useRef({ title: note.title, body: note.body ?? '' });
  const pendingSave = useRef(false);
  const bodyRef = useRef(null);

  const isShared = space.kind === 'shared';
  const isSharedNote = isShared && note.visibility === 'shared';
  const memberByMemberId = new Map(members.map((m) => [m.memberId, m]));
  const membersByUser = new Map(members.map((m) => [m.userId, m]));
  const author = memberByMemberId.get(note.author_id);
  const mine = author?.userId === meUserId;

  // Presence: who has this note open right now (besides me).
  const here = isSharedNote ? presence.filter((p) => p.noteId === note.id && p.userId !== meUserId) : [];
  const typers = here.filter((p) => p.typing);

  // Private content never enters the presence/broadcast channel.
  useEffect(() => {
    if (isSharedNote) live?.setEditing(note.id, false);
    return () => { live?.setEditing(null, false); clearTimeout(typingTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, isSharedNote]);

  // Apply peer keystrokes when they're about this note and I'm not mid-burst.
  useEffect(() => {
    if (!remoteEdit || remoteEdit.noteId !== note.id || remoteEdit.userId === meUserId) return;
    if (Date.now() - lastTypedAt.current < 1500) return;
    if (typeof remoteEdit.title === 'string') { setTitle(remoteEdit.title); latest.current.title = remoteEdit.title; }
    if (typeof remoteEdit.body === 'string') { setBody(remoteEdit.body); latest.current.body = remoteEdit.body; }
  }, [remoteEdit, note.id, meUserId]);

  // Fresh server rows (poll/nudge) win only when I'm idle AND nothing of mine
  // is still on its way to the server — a stale poll must not revert a save.
  useEffect(() => {
    if (pendingSave.current || Date.now() - lastTypedAt.current < 2000) return;
    if (note.title !== latest.current.title) { setTitle(note.title); latest.current.title = note.title; }
    if ((note.body ?? '') !== latest.current.body) { setBody(note.body ?? ''); latest.current.body = note.body ?? ''; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.title, note.body]);

  const fireSave = useCallback(async () => {
    try {
      const row = await updateNote(note.id, {
        title: latest.current.title,
        body: latest.current.body,
      });
      if (row === null) {
        pendingSave.current = false;
        setReadOnly(true);
        setSaveState('readonly');
      } else {
        pendingSave.current = false;
        setSaveState('saved');
        onChanged?.();
      }
    } catch {
      // Typed text must never be lost silently: keep the pending flag, show
      // the state, retry until the network comes back.
      setSaveState('retry');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(fireSave, SAVE_RETRY_MS);
    }
  }, [note.id, onChanged]);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    pendingSave.current = true;
    setSaveState('saving');
    saveTimer.current = setTimeout(fireSave, SAVE_DEBOUNCE_MS);
  }, [fireSave]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const onType = (patch) => {
    lastTypedAt.current = Date.now();
    if (typeof patch.title === 'string') { setTitle(patch.title); latest.current.title = patch.title; }
    if (typeof patch.body === 'string') { setBody(patch.body); latest.current.body = patch.body; }
    if (isSharedNote) {
      live?.setEditing(note.id, true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => live?.setEditing(note.id, false), 2000);
      live?.sendEdit(note.id, { title: latest.current.title, body: latest.current.body });
    }
    scheduleSave();
  };

  // Dictation straight into the note body (the conversation box has its own mic).
  const bodyDict = useDictation((text) => onType({ body: text }));

  const audienceLine = isShared
    ? (note.visibility === 'shared' ? 'everyone in this space sees it live' : 'only you can see it until you share it')
    : 'only you will ever see it';

  const meta = [
    `Created by ${mine ? 'you' : (author?.name ?? 'a teammate')}${mine || author?.role === 'owner' ? ' (admin)' : ''}`,
    `updated ${relTime(note.updated_at)}`,
    isSharedNote ? `shared with ${members.length} people` : 'private',
  ].join(' · ');

  const saveLabel = { saved: 'saved', saving: 'saving…', retry: 'retrying…', readonly: 'view only' }[saveState];

  return (
    <div className="editor">
      <div className="editor-bar">
        <button className="btn-ghost" onClick={onClose}>← All notes</button>
        <span className="crumb">{space.name} › {title || 'Untitled'}</span>
        <div className="right">
          {here.length > 0 && (
            <>
              <span className="avatar-stack">
                {here.slice(0, 4).map((p) => (
                  <Avatar key={p.userId} name={p.name} colourIndex={p.colourIndex} size={24} ring={p.typing}
                    title={`${p.name} — ${p.typing ? 'editing' : 'viewing'}`} />
                ))}
              </span>
              <span className="typing-label">
                <span className="dot" style={{ background: 'var(--o2)' }} />
                {typers.length ? `${typers[0].name} is typing…` : `${here[0].name} is here`}
              </span>
            </>
          )}
          <span className="save-state">{saveLabel}</span>
          {dictationSupported && !readOnly && (
            bodyDict.listening ? (
              <span className="recording-pill">
                <span className="mono">Recording · {String(Math.floor(bodyDict.seconds / 60)).padStart(2, '0')}:{String(bodyDict.seconds % 60).padStart(2, '0')}</span>
                <button className="btn btn-xs" onClick={bodyDict.stop}>Stop</button>
              </span>
            ) : (
              <button className="mic-btn" aria-label="Dictate into this note" title="Dictate into this note"
                onClick={() => bodyDict.toggle(latest.current.body)}>
                <MicIcon />
              </button>
            )
          )}
          {isShared && note.visibility !== 'shared' && mine && (
            <button className="btn btn-sm" onClick={async () => {
              await shareNoteToSpace(note.id);
              onChanged?.();
              live?.nudge();
              toast('Shared to the space', 'Teammates see it in their list right now', 'ok');
            }}>Share to space</button>
          )}
          {isShared && (
            <button className="btn btn-sm" onClick={onShare}>Share</button>
          )}
          {canAssign && (
            <button className="btn btn-sm" onClick={onAssignNew} title="Turn this note into an assigned task">
              <svg width="12" height="12" viewBox="0 0 14 14" style={{ marginRight: 1 }}>
                <circle cx="7" cy="4.2" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2.5 12 a4.5 4.5 0 0 1 9 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Assign
            </button>
          )}
          {mine && (
            <button className="btn-ghost danger" onClick={onDeleted}>Delete</button>
          )}
        </div>
      </div>

      <input
        className="editor-title" value={title} placeholder="Untitled note"
        readOnly={readOnly}
        onChange={(e) => onType({ title: e.target.value })}
      />
      <div className="editor-meta">{meta}</div>
      <NoteBrief note={note} />
      <textarea
        ref={bodyRef}
        className="editor-body"
        value={body}
        placeholder="Start typing…"
        readOnly={readOnly}
        onChange={(e) => onType({ body: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Escape') bodyDict.stop(); }}
        rows={Math.max(10, (body.match(/\n/g)?.length ?? 0) + 4)}
      />
      <div className="editor-hint">
        {bodyDict.micError
          ? 'The microphone was refused — allow it in the browser and try again. Typing works as ever.'
          : readOnly
            ? 'View only — co-editing switches on once sql/06_grovestudio.sql is applied to the backend.'
            : `Every keystroke saves — typed or dictated — and ${audienceLine}.`}
      </div>

      {canAssign && (
        <div className="note-tasks">
          <div className="note-tasks-head">
            <b>Tasks from this note</b>
            <span className="n">{noteTasks.length}</span>
            <button className="btn btn-xs" style={{ marginLeft: 'auto' }} onClick={onAssignNew}>+ Assign a task</button>
          </div>
          {noteTasks.map((t) => {
            const a = membersByUser.get(t.assignee_user);
            const ss = statusStyle(t.status);
            return (
              <div className="note-task-row" key={t.id}>
                <span className="task-status" style={{ background: ss.bg, color: ss.ink, width: 88, cursor: 'default' }}>{STATUS_LABEL[t.status]}</span>
                <span className="nt-title" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                <button className="assignee-btn" title={a ? `${a.name} — reassign` : 'Assign'} onClick={() => onReassign(t)}>
                  {a ? <Avatar name={a.name} colourIndex={a.colourIndex} size={24} />
                     : <span className="avatar unassigned" style={{ width: 24, height: 24 }}>?</span>}
                  <span className="who">{a ? a.name.split(' ')[0] : 'Assign'}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ color: 'var(--faint)' }}>
                    <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            );
          })}
          {!noteTasks.length && (
            <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>
              No tasks yet — assign one and its owner is notified with a link back to this note.
            </div>
          )}
        </div>
      )}

      {isSharedNote && (
        <Thread
          note={note} space={space} meUserId={meUserId} meName={meName} meAvatar={meAvatar}
          live={live} remoteComment={remoteComment} membersByUser={membersByUser}
        />
      )}
    </div>
  );
}
