// =============================================================================
// The sample space's collaborative loop, entirely client-side: one shared
// store for its tasks, assignment notifications and check-in timing, so an
// assignment made on the sample board is FELT on the dashboard — the
// notification, the "Assigned to you" row, and a small floating check-in
// pop that follows you around the app — exactly like the real flow, minus
// the backend. Lives in localStorage per browser and updates live across
// components via a subscriber list.
//
// Check-in policy, tuned to never feel naggy:
//   - nothing in the first minutes of a session (signing in, navigating);
//   - the first nudge a few hours after a task with a deadline is assigned;
//   - then every few hours, hourly only in the final two hours;
//   - one task at a time, with a quiet period after any nudge is answered
//     or dismissed, so nudges for several tasks never pile up;
//   - stops when the task is done. The sample deadline is ~10 hours out.
// =============================================================================
import { useSyncExternalStore } from 'react';
import { DEMO_TASKS, DEMO_MEMBERS } from './demoData';

const KEY = 'gs:demo-loop';
const SEED_V = 4;
const HOUR = 3600_000;
export const DEMO_DEADLINE_MS = 10 * HOUR;     // sample deadline, from assignment
export const CHECKIN_EVERY_MS = 3 * HOUR;      // regular cadence
export const FINAL_STRETCH_MS = 2 * HOUR;      // last stretch before the deadline…
export const FINAL_EVERY_MS = 1 * HOUR;        // …where nudges come hourly
export const SESSION_QUIET_MS = 10 * 60_000;   // no nudges right after the app opens
export const GLOBAL_COOLDOWN_MS = 2 * HOUR;    // between nudges, whatever the task
const openedAt = Date.now();

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
    // Assigned-to-you tasks with a deadline are armed from the start: the
    // clock runs from assignment, so the first nudge lands a few hours in.
    checkins: Object.fromEntries(DEMO_TASKS.filter((t) => t.assignee_user === 'demo-you' && t.status !== 'done').map((t) => [t.id, Date.now()])),
    dueAt: Object.fromEntries(DEMO_TASKS.filter((t) => t.assignee_user === 'demo-you' && t.status !== 'done').map((t) => [t.id, Date.now() + DEMO_DEADLINE_MS])),
    lastNudgeAt: 0, // when a nudge was last answered or dismissed
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
  // A task that somehow has no deadline yet gets one when work starts.
  if (status !== 'done' && !dueAt[id]) {
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
  // Assignment with a deadline starts the check-in clock for the assignee.
  const checkins = { ...state.checkins };
  const dueAt = { ...state.dueAt };
  if (toYou) {
    checkins[id] = Date.now();
    dueAt[id] = dueAt[id] ?? Date.now() + DEMO_DEADLINE_MS;
  }
  commit({
    ...state,
    notifs,
    checkins,
    dueAt,
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
  commit({ ...state, checkins: { ...state.checkins, [id]: Date.now() }, lastNudgeAt: Date.now() });
}

// How often to check in, given the time left: every few hours, hourly in
// the final stretch.
export function checkinInterval(timeLeftMs) {
  return timeLeftMs <= FINAL_STRETCH_MS ? FINAL_EVERY_MS : CHECKIN_EVERY_MS;
}

// The one task the floating check-in may nudge about right now: assigned to
// you with a deadline, not done, quiet for longer than its interval since
// the last check-in (or since assignment) — and only outside the session's
// opening minutes and the quiet period after the previous nudge. Soonest
// deadline first.
export function pickDemoCheckin(loop, now = Date.now()) {
  if (now - openedAt < SESSION_QUIET_MS) return null;
  if (now - (loop.lastNudgeAt ?? 0) < GLOBAL_COOLDOWN_MS) return null;
  const due = loop.tasks.filter((t) => t.assignee_user === 'demo-you'
    && t.status !== 'done'
    && loop.dueAt[t.id]
    && now - (loop.checkins[t.id] ?? 0) > checkinInterval(loop.dueAt[t.id] - now));
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
