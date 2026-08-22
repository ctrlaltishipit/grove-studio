// =============================================================================
// GroveStudio — src/lib/live.js
// Live layer for one open space. Three mechanisms, layered:
//   1. Polling (base): notes + tasks on POLL_MS, members on SLOW_POLL_MS.
//      Proven on this project; works with zero realtime configuration.
//   2. Presence channel: who is in the space, and which note they're editing.
//   3. Broadcast: keystroke-level note edits peer-to-peer, so co-writing
//      feels live even between debounced DB saves.
// =============================================================================

import { supabase } from './supabase';
import { POLL_MS, SLOW_POLL_MS, HEARTBEAT_MS, BROADCAST_DEBOUNCE_MS } from '../config';
import { listNotes, listSpaceTasks, listMembers, heartbeat } from './api';

export function startSpaceLive({ projectId, me, onNotes, onTasks, onMembers, onPresence, onNoteEdit, onComment, onError }) {
  let stopped = false;
  const safe = (fn) => (...a) => { if (!stopped && fn) fn(...a); };
  const emitNotes = safe(onNotes);
  const emitTasks = safe(onTasks);
  const emitMembers = safe(onMembers);
  const emitPresence = safe(onPresence);
  const emitNoteEdit = safe(onNoteEdit);
  const emitComment = safe(onComment);
  const emitError = safe(onError);

  async function refreshNotes() {
    try { emitNotes(await listNotes(projectId)); } catch (e) { emitError(e); }
  }
  async function refreshTasks() {
    try { emitTasks(await listSpaceTasks(projectId)); } catch (e) { emitError(e); }
  }
  async function refreshMembers() {
    try { emitMembers(await listMembers(projectId)); } catch (e) { emitError(e); }
  }

  function tick() { refreshNotes(); refreshTasks(); }

  // ---- realtime channel ----------------------------------------------------
  const channel = supabase.channel(`space:${projectId}`, {
    config: { presence: { key: me.userId }, broadcast: { self: false } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const people = Object.values(state).flat().map((p) => ({
      userId: p.userId,
      name: p.name,
      colourIndex: p.colourIndex,
      noteId: p.noteId ?? null,
      typing: !!p.typing,
    }));
    emitPresence(people);
  });

  channel.on('broadcast', { event: 'note_edit' }, ({ payload }) => {
    emitNoteEdit(payload);
  });

  // A submitted comment reaches peers instantly, ahead of the next poll.
  channel.on('broadcast', { event: 'comment' }, ({ payload }) => {
    emitComment(payload);
  });

  // Peers nudge each other after structural changes so nobody waits a poll.
  channel.on('broadcast', { event: 'refresh' }, () => tick());

  let joined = false;
  let myState = {
    userId: me.userId, name: me.name, colourIndex: me.colourIndex,
    noteId: null, typing: false,
  };
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      joined = true;
      channel.track(myState);
    }
  });

  // ---- outgoing edits, debounced ------------------------------------------
  let editTimer = null;
  function sendEdit(noteId, patch) {
    if (!joined) return;
    clearTimeout(editTimer);
    editTimer = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'note_edit',
        payload: { noteId, ...patch, userId: me.userId, name: me.name, colourIndex: me.colourIndex },
      }).catch(() => {});
    }, BROADCAST_DEBOUNCE_MS);
  }

  function setEditing(noteId, typing = false) {
    myState = { ...myState, noteId, typing };
    if (joined) channel.track(myState).catch(() => {});
  }

  function nudge() {
    if (joined) channel.send({ type: 'broadcast', event: 'refresh', payload: {} }).catch(() => {});
  }

  function sendComment(row) {
    if (joined) channel.send({ type: 'broadcast', event: 'comment', payload: row }).catch(() => {});
  }

  // ---- polling + heartbeat -------------------------------------------------
  const pollTimer = setInterval(() => { if (document.visibilityState === 'visible') tick(); }, POLL_MS);
  const slowTimer = setInterval(() => { if (document.visibilityState === 'visible') refreshMembers(); }, SLOW_POLL_MS);
  const beatTimer = setInterval(() => heartbeat(projectId), HEARTBEAT_MS);

  function onVisible() {
    if (document.visibilityState === 'visible') { tick(); refreshMembers(); }
  }
  document.addEventListener('visibilitychange', onVisible);

  tick();
  refreshMembers();
  heartbeat(projectId);

  return {
    sendEdit,
    setEditing,
    nudge,
    sendComment,
    refresh: tick,
    refreshMembers,
    stop() {
      stopped = true;
      clearInterval(pollTimer);
      clearInterval(slowTimer);
      clearInterval(beatTimer);
      clearTimeout(editTimer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    },
  };
}

// Global light polling for dashboard data (tasks + notifications).
export function startGlobalLive({ onTick }) {
  const t = setInterval(() => {
    if (document.visibilityState === 'visible') onTick();
  }, SLOW_POLL_MS);
  return () => clearInterval(t);
}
