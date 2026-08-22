import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { updateNote, shareNoteToSpace, listComments, addComment, fetchProfiles, features, notify, listVersions, addVersion, setNoteEditMode } from '../lib/api';
import {
  caretAfterRemote, measureCaret, lineOfOffset, lineText, offsetOfLine, mentionQuery, insertMention, findMentions,
  changeSummary, rangesLabel, blame, roleCanEdit,
} from '../lib/collab';
import { SAVE_DEBOUNCE_MS, POLL_MS } from '../config';
import { relTime, shortTime } from '../lib/fmt';
import { Avatar, SparkIcon, Modal } from './ui';
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

// --------------------------------------------------------------- mentions

// Highlight @Name tokens for the space's members inside plain text.
function renderWithMentions(text, members) {
  const names = [...members].map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length || !text.includes('@')) return text;
  const re = new RegExp('(@(?:' + names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '))', 'gi');
  return text.split(re).map((part, i) => (
    i % 2 === 1 ? <span className="mention-tag" key={i}>{part}</span> : part
  ));
}

// "@par" typed in a textarea → a member picker under the caret. The parent
// owns the text; this returns what to render and the keys to intercept.
function useMentionPicker(areaRef, text, setText, members) {
  const [state, setState] = useState(null); // { query, start, idx }
  const update = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const q = mentionQuery(el.value, el.selectionStart ?? el.value.length);
    setState(q ? { ...q, idx: 0 } : null);
  }, [areaRef]);
  const items = useMemo(() => {
    if (!state) return [];
    const q = state.query.toLowerCase();
    return members.filter((m) => m.name && m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [state, members]);
  const pick = useCallback((m) => {
    const el = areaRef.current;
    if (!el || !state) return;
    const r = insertMention(el.value, el.selectionStart ?? el.value.length, state.start, m.name);
    setText(r.text);
    setState(null);
    requestAnimationFrame(() => { try { el.focus(); el.setSelectionRange(r.caret, r.caret); } catch { /* fine */ } });
  }, [areaRef, state, setText]);
  const onKeyDown = (e) => {
    if (!state || !items.length) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setState((st) => ({ ...st, idx: (st.idx + 1) % items.length })); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setState((st) => ({ ...st, idx: (st.idx - 1 + items.length) % items.length })); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(items[state.idx] ?? items[0]); return true; }
    if (e.key === 'Escape') { setState(null); return true; }
    return false;
  };
  const style = useMemo(() => {
    const el = areaRef.current;
    if (!el || !state) return null;
    const pos = measureCaret(el, state.start);
    return pos ? { top: el.offsetTop + pos.top + pos.height + 4, left: el.offsetLeft + Math.min(pos.left, Math.max(0, el.clientWidth - 220)) } : null;
  }, [areaRef, state]);
  const open = !!state && items.length > 0;
  return { open, items, idx: state?.idx ?? 0, update, pick, onKeyDown, style };
}

function MentionPop({ picker }) {
  if (!picker.open || !picker.style) return null;
  return (
    <div className="mention-pop" style={picker.style}>
      <div className="hint">Mention a teammate</div>
      {picker.items.map((m, i) => (
        <button key={m.memberId ?? m.userId} className={i === picker.idx ? 'on' : ''}
          onMouseDown={(e) => { e.preventDefault(); picker.pick(m); }}>
          <Avatar name={m.name} colourIndex={m.colourIndex} size={20} />
          <span>{m.name}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- comments

function Thread({ note, space, meUserId, meName, meAvatar, live, remoteComment, membersByUser, members = [], anchor = null, onClearAnchor, onComments, onJumpToLine }) {
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
  const picker = useMentionPicker(areaRef, draft, setDraft, members);

  // The editor's margin markers need to know which lines carry comments.
  useEffect(() => { onComments?.(comments ?? []); }, [comments, onComments]);
  // A fresh line anchor means "comment on this": bring the composer up.
  useEffect(() => { if (anchor) areaRef.current?.focus(); }, [anchor]);

  const send = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    dict.stop();
    setBusy(true);
    try {
      const row = await addComment(note.id, space.id, meUserId, body, anchor);
      setDraft('');
      onClearAnchor?.();
      setComments((c) => [...(c ?? []), row]);
      live?.sendComment(row);
      areaRef.current?.focus();
      // Tell the people this comment is about: anyone @mentioned, and the
      // note's author (once) when someone else comments on their note.
      const mentioned = findMentions(body, members).map((m) => m.userId).filter((id) => id !== meUserId);
      if (mentioned.length) {
        notify(mentioned, { kind: 'mention', text: `${meName} mentioned you in a comment on “${note.title}”`, sub: body.slice(0, 140), projectId: space.id, noteId: note.id });
      }
      const authorUser = members.find((m) => m.memberId === note.author_id)?.userId;
      if (authorUser && authorUser !== meUserId && !mentioned.includes(authorUser)) {
        notify([authorUser], { kind: 'comment', text: `${meName} commented on “${note.title}”`, sub: body.slice(0, 140), projectId: space.id, noteId: note.id });
      }
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
    <div className="thread" id="note-thread">
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
                {c.anchor_line && (
                  <span className="c-anchor" title="Jump to this line" onClick={() => onJumpToLine?.(c.anchor_line)}>
                    Line {c.anchor_line}{c.anchor_text ? `: “${c.anchor_text}”` : ''}
                  </span>
                )}
                <p className="c-body">{renderWithMentions(c.body, members)}</p>
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
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {anchor && (
            <div className="anchor-chip">
              <b>Line {anchor.line}</b>
              <span>{anchor.text || '(empty line)'}</span>
              <button type="button" aria-label="Remove the line anchor" onClick={onClearAnchor}>✕</button>
            </div>
          )}
          <div className="composer">
            <textarea
              ref={areaRef}
              rows={1}
              placeholder={anchor ? `Comment on line ${anchor.line}…` : 'Add to the conversation — type, dictate, or @mention…'}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); grow(e.target); picker.update(); }}
              onInput={(e) => grow(e.target)}
              onKeyUp={picker.update}
              onClick={picker.update}
              onKeyDown={(e) => {
                if (picker.onKeyDown(e)) return;
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                if (e.key === 'Escape') dict.stop();
              }}
            />
            <MentionPop picker={picker} />
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
                : 'Enter sends · Shift+Enter for a new line · @ mentions a teammate'}
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

  // ---- permissions: space role + the note's own lock ----
  const myRole = membersByUser.get(meUserId)?.role;
  const viewerOnly = isShared && myRole && !roleCanEdit(myRole);
  const lockedByAuthor = isSharedNote && note.edit_mode === 'author' && !mine;
  const blocked = readOnly || viewerOnly || lockedByAuthor;

  // ---- collaboration state ----
  const [caret, setCaret] = useState(0);
  const [cursorFlags, setCursorFlags] = useState([]);
  const [anchor, setAnchor] = useState(null);            // { line, text } for an inline comment
  const [anchoredLines, setAnchoredLines] = useState([]); // [{ line, count, top }]
  const [commentRows, setCommentRows] = useState([]);
  const [history, setHistory] = useState(null);          // null | { versions, picked }
  const lastSnapshot = useRef({ title: note.title, body: note.body ?? '', at: 0 });
  const notifiedMentions = useRef(new Set());
  const caretLine = lineOfOffset(body, caret);
  const collabOn = features.collab !== false;
  const colourVar = (i) => `var(--o${((i ?? 0) % 5) + 1})`;

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
    if (typeof remoteEdit.body === 'string') {
      // Keep my caret on the same characters while their edit lands.
      const el = bodyRef.current;
      const focused = el && document.activeElement === el;
      const next = caretAfterRemote(latest.current.body, remoteEdit.body, el?.selectionStart ?? 0);
      setBody(remoteEdit.body); latest.current.body = remoteEdit.body;
      if (focused) requestAnimationFrame(() => { try { el.setSelectionRange(next, next); setCaret(next); } catch { /* fine */ } });
    }
  }, [remoteEdit, note.id, meUserId]);

  // ---- live cursors: where teammates are in this note ----
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !isSharedNote) { setCursorFlags([]); return; }
    const flags = presence
      .filter((p) => p.noteId === note.id && p.userId !== meUserId && typeof p.caret === 'number')
      .map((p) => {
        const pos = measureCaret(el, Math.min(p.caret, body.length));
        return pos ? { userId: p.userId, name: p.name, colourIndex: p.colourIndex, typing: p.typing, ...pos } : null;
      })
      .filter(Boolean);
    setCursorFlags(flags);
  }, [presence, body, note.id, meUserId, isSharedNote]);

  // ---- margin markers for inline comments ----
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) { setAnchoredLines([]); return; }
    const counts = new Map();
    for (const c of commentRows) if (c.anchor_line) counts.set(c.anchor_line, (counts.get(c.anchor_line) ?? 0) + 1);
    setAnchoredLines([...counts.entries()].map(([line, count]) => {
      const pos = measureCaret(el, offsetOfLine(body, line));
      return pos ? { line, count, top: pos.top } : null;
    }).filter(Boolean));
  }, [commentRows, body]);

  const trackCaret = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const c = el.selectionStart ?? 0;
    setCaret(c);
    if (isSharedNote) live?.setCursor(note.id, c);
  }, [isSharedNote, live, note.id]);

  const jumpToLine = (line) => {
    const el = bodyRef.current;
    if (!el) return;
    const off = offsetOfLine(latest.current.body, line);
    el.focus();
    try { el.setSelectionRange(off, off + lineText(latest.current.body, line).length); } catch { /* fine */ }
    setCaret(off);
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  // ---- version history: snapshot my edits, at most every 30s ----
  const snapshot = useCallback(async (summary = null, force = false) => {
    if (!collabOn) return;
    const { title: t, body: b } = latest.current;
    const prev = lastSnapshot.current;
    if (!force && t === prev.title && b === prev.body) return;
    if (!force && Date.now() - prev.at < 30_000) return;
    try {
      await addVersion(note.id, space.id, meUserId, { title: t, body: b, summary });
      lastSnapshot.current = { title: t, body: b, at: Date.now() };
    } catch { /* history is best effort */ }
  }, [collabOn, note.id, space.id, meUserId]);
  useEffect(() => {
    lastSnapshot.current = { title: note.title, body: note.body ?? '', at: 0 };
    notifiedMentions.current = new Set();
    return () => { snapshot(null, false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // ---- @mentions typed into the note body ----
  const bodyPicker = useMentionPicker(bodyRef, body, (t) => onTypeRef.current({ body: t }), members);
  const onTypeRef = useRef(() => {});

  const notifyBodyMentions = useCallback(() => {
    const fresh = findMentions(latest.current.body, members)
      .map((m) => m.userId)
      .filter((id) => id !== meUserId && !notifiedMentions.current.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => notifiedMentions.current.add(id));
    const line = latest.current.body.split('\n').find((l) => fresh.some((id) => l.toLowerCase().includes('@' + (membersByUser.get(id)?.name ?? '').toLowerCase()))) ?? '';
    notify(fresh, { kind: 'mention', text: `${meName} mentioned you in “${latest.current.title || 'Untitled note'}”`, sub: line.slice(0, 140), projectId: space.id, noteId: note.id });
  }, [members, meUserId, meName, membersByUser, space.id, note.id]);

  const openHistory = async () => {
    try {
      const versions = await listVersions(note.id);
      setHistory({ versions, picked: versions.length ? versions[versions.length - 1].id : null });
    } catch (e) {
      toast('Could not load history', e.message, 'warn');
    }
  };

  const restoreVersion = async (v) => {
    const when = shortTime(v.created_at);
    latest.current = { title: v.title, body: v.body };
    setTitle(v.title); setBody(v.body);
    lastTypedAt.current = Date.now();
    if (isSharedNote) live?.sendEdit(note.id, { title: v.title, body: v.body });
    scheduleSave();
    await snapshot(`Restored the version from ${when}`, true);
    setHistory(null);
    toast('Version restored', `Back to how it was at ${when}. The restore itself is in the history too.`, 'ok');
  };

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
        snapshot();
        notifyBodyMentions();
      }
    } catch {
      // Typed text must never be lost silently: keep the pending flag, show
      // the state, retry until the network comes back.
      setSaveState('retry');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(fireSave, SAVE_RETRY_MS);
    }
  }, [note.id, onChanged, snapshot, notifyBodyMentions]);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    pendingSave.current = true;
    setSaveState('saving');
    saveTimer.current = setTimeout(fireSave, SAVE_DEBOUNCE_MS);
  }, [fireSave]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const onType = (patch) => {
    if (blocked) return;
    lastTypedAt.current = Date.now();
    requestAnimationFrame(trackCaret);
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
  onTypeRef.current = onType;

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
          <span className="save-state">{blocked ? 'view only' : saveLabel}</span>
          {collabOn && (
            <button className="btn btn-sm" onClick={openHistory} title="Who changed what, and restore any version">History</button>
          )}
          {mine && isSharedNote && collabOn && (
            <select className="edit-mode-select" value={note.edit_mode ?? 'everyone'} aria-label="Who can edit this note"
              onChange={async (e) => {
                try {
                  await setNoteEditMode(note.id, e.target.value);
                  onChanged?.(); live?.nudge();
                  toast(e.target.value === 'author' ? 'Only you can edit this note now' : 'Everyone in the space can edit again', null, 'ok');
                } catch (err) { toast('Could not change that', err.message, 'warn'); }
              }}>
              <option value="everyone">Everyone can edit</option>
              <option value="author">Only I can edit</option>
            </select>
          )}
          {dictationSupported && !blocked && (
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
        readOnly={blocked}
        onChange={(e) => onType({ title: e.target.value })}
      />
      <div className="editor-meta">{meta}</div>
      <NoteBrief note={note} />
      <div className="editor-body-wrap">
        <textarea
          ref={bodyRef}
          className="editor-body"
          value={body}
          placeholder="Start typing…"
          readOnly={blocked}
          onChange={(e) => { onType({ body: e.target.value }); bodyPicker.update(); }}
          onSelect={trackCaret}
          onClick={() => { trackCaret(); bodyPicker.update(); }}
          onKeyUp={() => { trackCaret(); bodyPicker.update(); }}
          onFocus={trackCaret}
          onKeyDown={(e) => { if (bodyPicker.onKeyDown(e)) return; if (e.key === 'Escape') bodyDict.stop(); }}
          rows={Math.max(10, (body.match(/\n/g)?.length ?? 0) + 4)}
        />
        <div className="cursor-layer" aria-hidden="true">
          {cursorFlags.map((f) => (
            <div key={f.userId} className={'peer-caret' + (f.typing ? ' typing' : '')}
              style={{ top: f.top, left: f.left, height: f.height, '--c': colourVar(f.colourIndex) }}>
              <span className="flag">{f.name}</span>
            </div>
          ))}
          {anchoredLines.map((a) => (
            <button key={a.line} type="button" className="line-marker" style={{ top: a.top + 3 }}
              title={`${a.count} comment${a.count === 1 ? '' : 's'} on line ${a.line}`}
              onClick={() => document.getElementById('note-thread')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <svg width="10" height="10" viewBox="0 0 16 16"><path d="M8 2 C4.7 2 2 4.2 2 7 c0 1.6 .9 3 2.2 3.9 L3.6 13.5 L6.4 11.8 C6.9 11.9 7.4 12 8 12 c3.3 0 6 -2.2 6 -5 s-2.7 -5 -6 -5 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              {a.count}
            </button>
          ))}
        </div>
        <MentionPop picker={bodyPicker} />
      </div>
      <div className="editor-hint" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 200 }}>
          {bodyDict.micError
            ? 'The microphone was refused — allow it in the browser and try again. Typing works as ever.'
            : viewerOnly
              ? 'View only — you have view-only access in this space. An admin can change that from Share.'
              : lockedByAuthor
                ? `View only — ${author?.name ?? 'the author'} set this note to author-only editing.`
                : readOnly
                  ? 'View only — co-editing switches on once sql/06_grovestudio.sql is applied to the backend.'
                  : `Every keystroke saves — typed or dictated — and ${audienceLine}.${isSharedNote ? ' Type @ to mention a teammate.' : ''}`}
        </span>
        {isSharedNote && collabOn && (
          <button className="btn btn-xs" onClick={() => setAnchor({ line: caretLine, text: lineText(body, caretLine).trim().slice(0, 120) })}
            title="Start a comment tied to the line your cursor is on">
            Comment on line {caretLine}
          </button>
        )}
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
        <Thread members={members} anchor={anchor} onClearAnchor={() => setAnchor(null)} onComments={setCommentRows} onJumpToLine={jumpToLine}
          note={note} space={space} meUserId={meUserId} meName={meName} meAvatar={meAvatar}
          live={live} remoteComment={remoteComment} membersByUser={membersByUser}
        />
      )}

      {history && (
        <HistoryModal
          history={history} setHistory={setHistory} body={body}
          nameOf={(uid) => (uid === meUserId ? 'You' : (membersByUser.get(uid)?.name ?? 'a teammate'))}
          onRestore={restoreVersion}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ history

// Who changed what, version by version, with a one-click restore.
function HistoryModal({ history, setHistory, body, nameOf, onRestore }) {
  const { versions, picked } = history;
  const sorted = [...versions].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const pickedV = sorted.find((v) => v.id === picked) ?? sorted[0] ?? null;
  const prevOf = (v) => {
    const i = versions.findIndex((x) => x.id === v.id);
    return i > 0 ? versions[i - 1] : null;
  };
  const legend = useMemo(() => {
    const attr = blame(versions, body);
    const groups = [];
    attr.forEach((a, i) => {
      const who = a?.author_user ?? null;
      const last = groups[groups.length - 1];
      if (last && last.who === who) last.to = i + 1; else groups.push({ who, from: i + 1, to: i + 1 });
    });
    return groups;
  }, [versions, body]);

  return (
    <Modal onClose={() => setHistory(null)} width={560}>
      <div className="modal-stack">
        <div>
          <h3>History</h3>
          <div className="sub">Every edit is kept. Pick a version to see it, and restore it if you need to.</div>
        </div>
        {versions.length === 0 ? (
          <div className="fine">No versions yet — they start being recorded as people edit this note.</div>
        ) : (
          <>
            <div className="history-list">
              {sorted.map((v) => {
                const prev = prevOf(v);
                const d = changeSummary(prev?.body ?? '', v.body);
                return (
                  <button key={v.id} className={'version-row' + (pickedV?.id === v.id ? ' on' : '')} onClick={() => setHistory({ versions, picked: v.id })}>
                    <div className="who">
                      <b>{nameOf(v.author_user)} · {shortTime(v.created_at)}</b>
                      <span>{v.summary ?? (prev ? (d.ranges.length ? `changed ${rangesLabel(d.ranges)}` : 'no text changes') : 'first recorded version')}</span>
                    </div>
                    <span className="delta"><span className="plus">+{d.added}</span> <span className="minus">−{d.removed}</span></span>
                  </button>
                );
              })}
            </div>
            {pickedV && (
              <>
                <div className="version-preview">{pickedV.body || '(empty)'}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => onRestore(pickedV)}>Restore this version</button>
                  <span className="fine">Restoring records a new version — nothing is ever lost.</span>
                </div>
              </>
            )}
            <div>
              <div className="studio-label" style={{ marginBottom: 6 }}>Who wrote what (current text)</div>
              <div className="blame-legend">
                {legend.map((g, i) => (
                  <span key={i}><b>{g.who ? nameOf(g.who) : 'Unsaved edits'}</b> · {g.from === g.to ? `line ${g.from}` : `lines ${g.from}–${g.to}`}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
