// =============================================================================
// The sample space's collaborative loop, entirely client-side: one shared
// store for its tasks, assignment notifications and check-in timing, so an
// assignment made on the sample board is FELT on the dashboard — the
// notification, the "Assigned to you" row, and a small floating check-in
// pop that follows you around the app — exactly like the real flow, minus
// the backend. Lives in localStorage per browser and updates live across
// components via a subscriber list.
//
// Time is compressed for demoing: starting work arms a ~10 hour deadline,
// and the app checks in once per sample "day" — which passes every minute.
// =============================================================================
import { useSyncExternalStore } from 'react';
import { DEMO_TASKS, DEMO_MEMBERS } from './demoData';

const KEY = 'gs:demo-loop';
const SEED_V = 2;
export const DEMO_DAY_MS = 60_000;            // one sample "day"
export const DEMO_DEADLINE_MS = 10 * 3600_000; // armed when work starts

function seed() {
  return {
    v: SEED_V,
    tasks: DEMO_TASKS.map((t) => ({ ...t })),
    // One unread notification out of the box so the dashboard element shows
    // itself before the visitor has touched the board.
    notifs: [{
      id: 'dn-seed', read: false, at: Date.now(),
      text: 'Priya S. assigned you “Create your first space”',
      sub: 'Getting started with GroveStudio — it’s in “Assigned to you” below',
    }],
    checkins: {}, // taskId -> ms timestamp of the last check-in (or start of work)
    dueAt: {},    // taskId -> ms deadline, armed when the task enters "doing"
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === SEED_V && Array.isArray(s.tasks)) return s;
  } catch { /* fall through to a fresh seed */ }
  return seed();
}

let state = load();
const subs = new Set();
function commit(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* per-viewer nicety only */ }
  subs.forEach((fn) => fn());
}
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export function useDemoLoop() {
  return useSyncExternalStore(subscribe, () => state);
}

const progressFor = (status, current = 0) => (
  status === 'done' ? 100 : status === 'todo' ? 0 : status === 'review' ? Math.max(current, 66) : Math.max(current, 40)
);

export function setDemoTaskStatus(id, status) {
  const checkins = { ...state.checkins };
  const dueAt = { ...state.dueAt };
  // Starting work arms the deadline and the check-in clock; the first
  // nudge lands one sample day later.
  if (status === 'doing' && !checkins[id]) {
    checkins[id] = Date.now();
    dueAt[id] = Date.now() + DEMO_DEADLINE_MS;
  }
  commit({
    ...state,
    checkins,
    dueAt,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, status, progress: progressFor(status, t.progress) } : t)),
  });
}

export function nudgeDemoProgress(id, by = 15) {
  commit({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, progress: Math.min(90, (t.progress ?? 0) + by) } : t)),
  });
}

// Returns 'you' | 'other' when the assignee changed (a notification is
// queued for 'you'), or null when nothing changed.
export function reassignDemoTask(id, member) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task || task.assignee_user === member.userId) return null;
  const toYou = member.userId === 'demo-you';
  const notifs = toYou
    ? [{
        id: `dnotif-${Date.now()}`, read: false, at: Date.now(),
        text: `Assigned to you — “${task.title}”`,
        sub: 'From the sample board — it’s in “Assigned to you” below',
      }, ...state.notifs]
    : state.notifs;
  commit({
    ...state,
    notifs,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, assignee_user: member.userId, assigned_by_user: 'demo-you' } : t)),
  });
  return toYou ? 'you' : 'other';
}

export function createDemoTask(status, title) {
  commit({
    ...state,
    tasks: [...state.tasks, {
      id: `demo-new-${Date.now()}`, project_id: DEMO_TASKS[0].project_id, note_id: null,
      title, label: null, status, progress: progressFor(status),
      assignee_user: 'demo-you', assigned_by_user: 'demo-you', due_date: null,
    }],
  });
}

export function markDemoNotifsRead() {
  commit({ ...state, notifs: state.notifs.map((n) => ({ ...n, read: true })) });
}

export function recordDemoCheckin(id) {
  commit({ ...state, checkins: { ...state.checkins, [id]: Date.now() } });
}

// The task the floating check-in should nag about: yours, in progress, and
// quiet for over a sample day since the last check-in. Soonest deadline
// first — the real cadence scales with how close the deadline is.
export function pickDemoCheckin(loop, now = Date.now()) {
  const due = loop.tasks.filter((t) => t.assignee_user === 'demo-you'
    && t.status === 'doing'
    && now - (loop.checkins[t.id] ?? 0) > DEMO_DAY_MS);
  if (!due.length) return null;
  return [...due].sort((a, b) => (loop.dueAt[a.id] ?? Infinity) - (loop.dueAt[b.id] ?? Infinity))[0];
}

export function demoTimeLeftLabel(loop, id, now = Date.now()) {
  const due = loop.dueAt[id];
  if (!due) return null;
  const left = due - now;
  if (left <= 0) return 'past the deadline';
  const h = Math.floor(left / 3600_000);
  const m = Math.round((left % 3600_000) / 60_000);
  return h > 0 ? `about ${h}h ${m}m left` : `about ${m}m left`;
}

export const demoMemberByUser = (id) => DEMO_MEMBERS.find((m) => m.userId === id);
