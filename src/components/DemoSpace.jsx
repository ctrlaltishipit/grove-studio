import React, { useState, useEffect, useRef } from 'react';
import { useStudio, useData, useToast } from '../state/Store';
import { Avatar, AvatarStack, DocIcon, SparkIcon } from './ui';
import { spaceTile, labelChip } from '../lib/colors';
import { shortTime, relTime, fmtDue, dueUrgency } from '../lib/fmt';
import { STATUS_LABEL, StatusMenu, MemberMenu } from './TaskBits';
import { createDictation, dictationSupported } from '../lib/dictation';
import {
  demoSpace, DEMO_SPACE_ID, DEMO_MEMBERS, DEMO_NOTES, DEMO_COMMENTS, DEMO_TASKS,
} from '../lib/demoData';

const memberByMemberId = new Map(DEMO_MEMBERS.map((m) => [m.memberId, m]));
const memberByUser = new Map(DEMO_MEMBERS.map((m) => [m.userId, m]));
const ASSIGNABLE = DEMO_MEMBERS; // includes You

function SampleBadge() {
  return <span className="private-chip" style={{ color: 'var(--acc-deep)', background: 'var(--acc-soft)', border: '1px solid color-mix(in oklab, var(--acc) 30%, var(--border))' }}>★ SAMPLE</span>;
}

const COLS = [
  { key: 'todo', dot: 'var(--faint)' },
  { key: 'doing', dot: 'var(--amber)' },
  { key: 'review', dot: 'var(--o5)' },
  { key: 'done', dot: 'var(--acc)', check: true },
];

// -------------------------------------------------------------------- board

function DemoBoard({ tasks, onSetStatus, onReassign }) {
  const noteById = new Map(DEMO_NOTES.map((n) => [n.id, n]));
  return (
    <div className="board">
      <div className="board-head">
        <span className="hint">Move a card to any column, and click its avatar to reassign — try it, changes stay in this sample.</span>
        <span className="n">{tasks.length} tasks</span>
      </div>
      <div className="board-cols">
        {COLS.map((c) => {
          const cards = tasks.filter((t) => t.status === c.key);
          return (
            <div className="board-col" key={c.key}>
              <div className="col-head">
                <b>{STATUS_LABEL[c.key]}</b>
                {c.check && (
                  <svg width="13" height="13" viewBox="0 0 14 14" style={{ color: 'var(--acc)' }}>
                    <circle cx="7" cy="7" r="6" fill="var(--acc)" />
                    <path d="M4 7.2 L6 9.2 L10 4.8" fill="none" stroke="var(--acc-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className="n">{cards.length}</span>
              </div>
              {cards.map((t) => {
                const [labelBg, labelInk] = labelChip(t.label);
                const a = memberByUser.get(t.assignee_user);
                const note = noteById.get(t.note_id);
                const urgency = dueUrgency(t.due_date, t.status);
                const dueColor = urgency === 'late' ? 'var(--danger)' : urgency === 'soon' ? 'var(--amber)' : 'var(--faint)';
                return (
                  <div className="board-card" key={t.id}>
                    <p className="title" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</p>
                    <div className="chips">
                      <span className="label-chip" style={{ background: labelBg, color: labelInk }}>{t.label}</span>
                      {t.status !== 'done' && t.due_date && <span className="due" style={{ color: dueColor }}>{fmtDue(t.due_date)}</span>}
                    </div>
                    <div className="foot">
                      {note && <span className="key-chip"><DocIcon size={11} /><span>{note.title}</span></span>}
                      <div className="card-right">
                        <StatusMenu status={t.status} onPick={(s) => onSetStatus(t.id, s)} />
                        <MemberMenu members={DEMO_MEMBERS} currentUserId="demo-you" onPick={(m) => onReassign(t.id, m)}>
                          <button className="assignee-btn" title={a ? `${a.name} — reassign` : 'Assign'}>
                            {a ? <Avatar name={a.name} colourIndex={a.colourIndex} size={24} />
                               : <span className="avatar unassigned" style={{ width: 24, height: 24 }}>?</span>}
                          </button>
                        </MemberMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- note + chat

function MicIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8 a5 5 0 0 0 10 0 M8 13 v2 M5.5 15 h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DemoNoteView({ note, comments, onComment }) {
  const author = memberByMemberId.get(note.author_id);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const dictation = useRef(null);
  const base = useRef('');
  const listeningRef = useRef(false);
  const areaRef = useRef(null);

  useEffect(() => () => dictation.current?.stop(), []);

  const join = (a, b) => (!b ? a : !a ? b : (/\s$/.test(a) ? a + b : `${a} ${b}`));
  const toggleMic = () => {
    if (listeningRef.current) { dictation.current?.stop(); return; }
    base.current = draft;
    dictation.current = createDictation({
      onInterim: (t) => setDraft(join(base.current, t)),
      onFinal: (t) => { base.current = join(base.current, t); setDraft(base.current); },
      onEnd: () => { listeningRef.current = false; setListening(false); },
    });
    if (!dictation.current) return;
    dictation.current.start();
    listeningRef.current = true;
    setListening(true);
  };

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    dictation.current?.stop();
    onComment(note.id, body);
    setDraft('');
    areaRef.current?.focus();
  };

  const grow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; };

  return (
    <div className="editor">
      <div className="editor-bar">
        <span className="crumb">{demoSpace.name} › {note.title}</span>
      </div>
      <h1 className="editor-title" style={{ cursor: 'default' }}>{note.title}</h1>
      <div className="editor-meta">Created by {author?.name ?? 'a teammate'} · updated {relTime(note.updated_at)} · shared with {DEMO_MEMBERS.length} people</div>
      {note.brief && (
        <div className="note-brief">
          <span className="spark"><SparkIcon size={10} /></span>
          <span>{note.brief}</span>
        </div>
      )}
      <div style={{ fontSize: 15.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{note.body}</div>

      <div className="thread">
        <div className="thread-head"><b>Conversation</b><span className="n">{comments.length}</span></div>
        <div className="thread-list">
          {comments.map((c) => {
            const m = memberByUser.get(c.author_user);
            const isYou = c.author_user === 'demo-you';
            return (
              <div className="comment" key={c.id}>
                <Avatar name={isYou ? 'You' : m?.name} colourIndex={m?.colourIndex ?? 0} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div className="c-head">
                    <span className="c-name">{isYou ? 'You' : (m?.name ?? 'Teammate')}</span>
                    <span className="c-time">{shortTime(c.created_at)}</span>
                  </div>
                  <p className="c-body">{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="composer-row">
          <Avatar name="You" colourIndex={0} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="composer">
              <textarea ref={areaRef} rows={1} placeholder="Add to the conversation — type or dictate…"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); grow(e.target); }}
                onInput={(e) => grow(e.target)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'Escape') dictation.current?.stop(); }} />
              {dictationSupported && (
                <button className={'mic-btn' + (listening ? ' on' : '')} aria-pressed={listening}
                  aria-label={listening ? 'Stop dictating' : 'Dictate'} title={listening ? 'Stop dictating' : 'Dictate'}
                  onClick={toggleMic}><MicIcon /></button>
              )}
              <button className="send-btn" aria-label="Send" disabled={!draft.trim()} onClick={send}>
                <svg width="13" height="13" viewBox="0 0 14 14"><path d="M2 7 H11 M8 3.5 L11.5 7 L8 10.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="composer-hint" style={{ paddingLeft: 2 }}>
              {listening ? 'Listening… speak and it appears above' : 'Enter sends · Shift+Enter for a new line · try the mic'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- shell

export default function DemoSpace() {
  const studio = useStudio();
  const { openModal } = useData();
  const { toast } = useToast();
  const [tab, setTab] = useState('notes');
  const [openId, setOpenId] = useState(null);
  const [tasks, setTasks] = useState(() => DEMO_TASKS.map((t) => ({ ...t })));
  const [comments, setComments] = useState(() => JSON.parse(JSON.stringify(DEMO_COMMENTS)));

  const openNote = DEMO_NOTES.find((n) => n.id === openId) ?? null;

  useEffect(() => {
    studio.setContext({ spaceId: DEMO_SPACE_ID, spaceName: demoSpace.name, kind: 'shared', demo: true });
    studio.clearSelection();
    return () => { studio.setContext(null); studio.clearSelection(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = (id, status) => setTasks((ts) => ts.map((t) => (t.id === id
    ? { ...t, status, progress: status === 'done' ? 100 : status === 'todo' ? 0 : status === 'review' ? Math.max(t.progress, 66) : Math.max(t.progress, 40) }
    : t)));

  const reassignTask = (id, member) => setTasks((ts) => ts.map((t) => {
    if (t.id !== id || t.assignee_user === member.userId) return t;
    toast(`Reassigned to ${member.name}`, 'In a real space, they’d be notified with the note link and deadline', 'assign');
    return { ...t, assignee_user: member.userId };
  }));

  const addComment = (noteId, body) => {
    const c = { id: 'dc-local-' + Math.random().toString(36).slice(2), note_id: noteId, author_user: 'demo-you', body, created_at: new Date().toISOString() };
    setComments((all) => ({ ...all, [noteId]: [...(all[noteId] ?? []), c] }));
  };

  return (
    <div className="space-view">
      <div className="space-topbar">
        <div className="space-titlebar">
          <span className="tile" style={{ background: spaceTile(DEMO_SPACE_ID) }}>G</span>
          <div className="name">{demoSpace.name}</div>
          <SampleBadge />
          <div className="right">
            <AvatarStack people={DEMO_MEMBERS} size={26} max={5} />
          </div>
        </div>
        <div className="space-tabs">
          <button className={'space-tab' + (tab === 'notes' ? ' on' : '')} onClick={() => { setTab('notes'); setOpenId(null); }}>Notes</button>
          <button className={'space-tab' + (tab === 'board' ? ' on' : '')} onClick={() => { setTab('board'); setOpenId(null); }}>Board</button>
        </div>
      </div>

      <div className="space-body">
        <div className="space-content">
          {tab === 'notes' && !openNote && (
            <div className="notes-list">
              <div className="demo-hello">
                <span>👋 A <b>sample space</b> — open a note, move cards on the <b>Board</b>, try the <b>Studio</b> on the right.</span>
                <button className="btn btn-sm" onClick={() => openModal('new')}>Create your own space</button>
              </div>
              <div className="list-head">
                <span className="label">{DEMO_NOTES.length} shared notes — everyone in this space can read them</span>
              </div>
              {DEMO_NOTES.map((n) => {
                const author = memberByMemberId.get(n.author_id);
                return (
                  <div className="note-card" key={n.id} onClick={() => setOpenId(n.id)}>
                    <div className="row">
                      <DocIcon />
                      <button className="title" onClick={(e) => { e.stopPropagation(); setOpenId(n.id); }}>{n.title}</button>
                    </div>
                    <p className="preview">{n.body.replace(/\s+/g, ' ').slice(0, 140)}</p>
                    <div className="foot">
                      <span className="byline">by {author?.name ?? 'a teammate'}</span>
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AvatarStack people={DEMO_MEMBERS} size={20} max={5} />
                        <span className="updated">{shortTime(n.updated_at)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'notes' && openNote && (
            <>
              <div style={{ maxWidth: 760, margin: '0 auto', padding: '18px 28px 0' }}>
                <button className="btn-ghost" onClick={() => setOpenId(null)}>← All notes</button>
              </div>
              <DemoNoteView note={openNote} comments={comments[openNote.id] ?? []} onComment={addComment} />
            </>
          )}

          {tab === 'board' && <DemoBoard tasks={tasks} onSetStatus={setStatus} onReassign={reassignTask} />}
        </div>
      </div>
    </div>
  );
}
