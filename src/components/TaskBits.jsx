import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useData, useToast } from '../state/Store';
import { updateTask, notify } from '../lib/api';
import { Avatar } from './ui';
import { fmtDue, dueUrgency } from '../lib/fmt';
import { checkinDismissed, dismissCheckin } from '../lib/local';

export const STATUS_LABEL = { todo: 'To do', doing: 'In progress', review: 'In review', done: 'Done' };
export const NEXT_STATUS = { todo: 'doing', doing: 'review', review: 'done', done: 'todo' };
export const ALL_STATUSES = ['todo', 'doing', 'review', 'done'];

// A small popover to move a card to ANY column (not just the next one).
export function StatusMenu({ status, onPick, label = 'Move' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="move-btn" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        {label} ▾
      </button>
      {open && (
        <div className="picker-menu">
          {ALL_STATUSES.filter((s) => s !== status).map((s) => (
            <button key={s} onClick={(e) => { e.stopPropagation(); setOpen(false); onPick(s); }}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// A small popover to pick a member (for reassigning a card).
export function MemberMenu({ members, currentUserId, onPick, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>{children}</span>
      {open && (
        <div className="picker-menu wide">
          {members.map((m) => (
            <button key={m.memberId ?? m.userId} onClick={(e) => { e.stopPropagation(); setOpen(false); onPick(m); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={m.name} colourIndex={m.colourIndex} size={20} />
              <span>{m.name}{m.userId === currentUserId ? ' (you)' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function statusStyle(status) {
  if (status === 'done') return { bg: 'var(--acc-soft)', ink: 'var(--acc-deep)' };
  if (status === 'review') return { bg: 'color-mix(in oklab, var(--o5) 16%, var(--surface))', ink: 'var(--o5)' };
  if (status === 'doing') return { bg: 'var(--amber-soft)', ink: 'var(--amber)' };
  return { bg: 'var(--sunken)', ink: 'var(--muted)' };
}

export function dueChip(task) {
  const u = dueUrgency(task.due_date, task.status);
  const label = task.status === 'done' ? 'Done' : (fmtDue(task.due_date) ?? 'No due date');
  if (u === 'done') return { label, color: 'var(--acc-deep)', bg: 'var(--acc-soft)' };
  if (u === 'late') return { label, color: 'var(--danger)', bg: 'var(--amber-soft)' };
  if (u === 'soon') return { label, color: 'var(--amber)', bg: 'var(--amber-soft)' };
  return { label, color: 'var(--muted)', bg: 'var(--sunken)' };
}

export function nextProgress(status, current) {
  if (status === 'done') return 100;
  if (status === 'todo') return 0;
  if (status === 'review') return Math.max(current ?? 0, 66);
  return Math.max(current ?? 0, 30);
}

// Shared "cycle this task's status" action with the design's toast copy.
export function useCycleStatus() {
  const { user, displayName } = useAuth();
  const { refreshTasks } = useData();
  const { toast } = useToast();

  return async (task, { assignerName, onDone } = {}) => {
    const next = NEXT_STATUS[task.status];
    try {
      await updateTask(task.id, { status: next, progress: nextProgress(next, task.progress) });
      if (next === 'done') {
        toast('Marked complete', assignerName ? `${assignerName} (assigner) sees the update on their dashboard` : 'Everyone in the space sees it move to Done', 'ok');
        if (task.assigned_by_user && task.assigned_by_user !== user.id) {
          notify([task.assigned_by_user], {
            actorName: displayName, kind: 'done',
            text: `${displayName} completed “${task.title}”`,
            projectId: task.project_id, taskId: task.id,
          });
        }
      }
      refreshTasks();
      onDone?.();
    } catch (e) {
      toast('Could not update the task', e.message, 'error');
    }
  };
}

export function TaskRow({ task, spaceName, byName, byColour, noteTitle }) {
  const nav = useNavigate();
  const cycle = useCycleStatus();
  const ss = statusStyle(task.status);
  const due = dueChip(task);
  const strike = task.status === 'done' ? 'line-through' : 'none';
  const barColor = task.status === 'done' ? 'var(--acc)' : 'var(--amber)';

  return (
    <div className="task-row">
      <button className="task-status" title="Click to change status"
        style={{ background: ss.bg, color: ss.ink }}
        onClick={() => cycle(task, { assignerName: byName })}>
        {STATUS_LABEL[task.status]}
      </button>
      <div className="task-main">
        <div className="title" style={{ textDecoration: strike }}>{task.title}</div>
        <div className="meta">
          {spaceName ?? 'Space'}
          {noteTitle ? <> › <a href="#" onClick={(e) => { e.preventDefault(); nav(`/app/s/${task.project_id}?note=${task.note_id}`); }}>{noteTitle}</a></> : null}
          {byName ? <> · from {byName}</> : null}
        </div>
      </div>
      <div className="task-progress">
        <div className="bar"><div style={{ width: `${task.progress ?? 0}%`, background: barColor }} /></div>
        <span className="pct">{task.progress ?? 0}% done</span>
      </div>
      <span className="due-chip" style={{ color: due.color, background: due.bg }}>{due.label}</span>
      {byName && <Avatar name={byName} colourIndex={byColour} size={26} title={`Assigned by ${byName}`} />}
    </div>
  );
}

// Pick the task the check-in banner should nag about.
export function pickCheckinTask(myTasks) {
  const open = myTasks.filter((t) => t.status === 'doing' && !checkinDismissed(t.id));
  if (!open.length) return null;
  return [...open].sort((a, b) => String(a.due_date ?? '9999').localeCompare(String(b.due_date ?? '9999')))[0];
}

export function CheckinBanner({ task, spaceName, byName }) {
  const { user, displayName } = useAuth();
  const { refreshTasks } = useData();
  const { toast } = useToast();
  const dueLabel = fmtDue(task.due_date);

  const done = () => { dismissCheckin(task.id); refreshTasks(); };

  return (
    <div className="checkin">
      <span className="clock">
        <svg width="15" height="15" viewBox="0 0 16 16">
          <path d="M8 4 v4 l2.6 1.6" fill="none" stroke="var(--acc-ink)" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="8" cy="8" r="6.4" fill="none" stroke="var(--acc-ink)" strokeWidth="1.7" />
        </svg>
      </span>
      <div className="body">
        <b>Quick check-in — “{task.title}”</b>
        <span>
          You're at {task.progress ?? 0}%{dueLabel ? `, due ${dueLabel}` : ''}. Still on track?
          GroveStudio nudges you so deadlines don't go quiet.
        </span>
      </div>
      <div className="acts">
        <button className="btn btn-primary btn-sm" style={{ height: 32 }} onClick={() => {
          done();
          toast('Logged — on track', 'Next gentle check-in: tomorrow', 'ok');
        }}>On track</button>
        <button className="btn btn-sm" style={{ height: 32 }} onClick={async () => {
          done();
          toast('Flagged as blocked', byName ? `${byName} (assigner) has been notified to unblock you` : 'The space has been notified', 'warn');
          if (task.assigned_by_user && task.assigned_by_user !== user.id) {
            notify([task.assigned_by_user], {
              actorName: displayName, kind: 'blocked',
              text: `${displayName} is blocked on “${task.title}”`,
              sub: spaceName, projectId: task.project_id, taskId: task.id,
            });
          }
        }}>I'm blocked</button>
        <button className="btn btn-sm" style={{ height: 32 }} onClick={async () => {
          try {
            await updateTask(task.id, { status: 'done', progress: 100 });
            done();
            toast('Marked complete 🎉', spaceName ? `Everyone in ${spaceName} sees it move to Done` : undefined, 'ok');
            if (task.assigned_by_user && task.assigned_by_user !== user.id) {
              notify([task.assigned_by_user], {
                actorName: displayName, kind: 'done',
                text: `${displayName} completed “${task.title}”`,
                sub: spaceName, projectId: task.project_id, taskId: task.id,
              });
            }
          } catch (e) { toast('Could not update the task', e.message, 'error'); }
        }}>Mark done</button>
      </div>
    </div>
  );
}
