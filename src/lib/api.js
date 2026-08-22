// =============================================================================
// GroveStudio — src/lib/api.js
// THE ONLY MODULE THAT TALKS TO THE DATABASE.
//
// Backend contract (live on the Supabase project):
//   profiles(user_id, display_name, avatar_url)
//   projects(id, name, description, join_code, created_by [, kind])
//   project_members(id, project_id, user_id, display_name, colour_index,
//                   role 'owner'|'member', last_seen_at, joined_at)
//   space_notes(id, project_id, author_id -> project_members.id, title, body,
//               visibility 'private'|'shared', shared_at, created_at, updated_at)
//   RPCs: create_project(p_name, p_display_name) -> [{id, name, join_code}]
//         join_project(p_code, p_display_name)   -> [member row]
//         my_spaces() -> [{id, name, join_code, member_count, shared_notes,
//                          my_private_notes, last_activity}]
//         get_space_members(p_project_id) -> [{member_id, user_id, display_name,
//                          colour_index, role, shared_notes, last_seen_at}]
//
// tasks / notifications / projects.kind ship in sql/06_grovestudio.sql.
// Until that file is applied the app detects their absence and degrades.
// =============================================================================

import { supabase } from './supabase';
import { getAccessToken } from './auth';
import { demoSpace, DEMO_SPACE_ID, DEMO_MEMBERS } from './demoData';

// ------------------------------------------------------------- feature flags

// null = unknown, then true/false after first contact with the backend.
export const features = { tasks: null, kind: null, collab: null };

// 07_collab.sql applied? (note_versions exists). Probed once, cached.
let collabProbe = null;
export async function probeCollab() {
  if (features.collab !== null) return features.collab;
  if (!collabProbe) {
    collabProbe = (async () => {
      const { error } = await supabase.from('note_versions').select('id').limit(1);
      features.collab = !(error && (missingRelation(error) || error.code === 'PGRST204'));
      return features.collab;
    })();
  }
  return collabProbe;
}

function missingRelation(error) {
  // PGRST205: table not in schema cache. 42703: column does not exist.
  return error && (error.code === 'PGRST205' || error.code === '42703' || error.code === '42P01');
}

// ------------------------------------------------------------------- spaces

export async function listSpaces() {
  const { data, error } = await supabase.rpc('my_spaces');
  if (error) throw error;
  const spaces = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    joinCode: s.join_code,
    memberCount: s.member_count,
    sharedNotes: s.shared_notes,
    myPrivateNotes: s.my_private_notes,
    lastActivity: s.last_activity,
    kind: 'shared',
    description: '',
    createdBy: null,
  }));
  if (!spaces.length) return [{ ...demoSpace }]; // brand-new user: just the sample

  // Enrich with description/kind straight from projects (RLS: members only).
  const ids = spaces.map((s) => s.id);
  const cols = features.kind === false
    ? 'id, description, created_by'
    : 'id, description, created_by, kind';
  let { data: projs, error: pErr } = await supabase.from('projects').select(cols).in('id', ids);
  if (pErr && missingRelation(pErr) && features.kind !== false) {
    features.kind = false;
    ({ data: projs, error: pErr } = await supabase
      .from('projects').select('id, description, created_by').in('id', ids));
  }
  if (!pErr && projs) {
    if (features.kind !== false && projs.length && 'kind' in projs[0]) features.kind = true;
    const byId = new Map(projs.map((p) => [p.id, p]));
    for (const s of spaces) {
      const p = byId.get(s.id);
      if (p) {
        s.description = p.description ?? '';
        s.createdBy = p.created_by;
        s.kind = p.kind === 'private' ? 'private' : 'shared';
      }
    }
  }
  // The built-in sample space leads the list for everyone.
  return [{ ...demoSpace }, ...spaces];
}

export async function createSpace({ name, kind, displayName }) {
  const { data, error } = await supabase.rpc('create_project', {
    p_name: name.trim(),
    p_display_name: displayName,
  });
  if (error) throw error;
  const proj = Array.isArray(data) ? data[0] : data;
  if (kind === 'private' && features.kind !== false) {
    const { error: kErr } = await supabase
      .from('projects').update({ kind: 'private' }).eq('id', proj.id);
    if (kErr && missingRelation(kErr)) features.kind = false;
  }
  return { id: proj.id, name: proj.name, joinCode: proj.join_code, kind };
}

export async function joinSpace(rawCode, displayName) {
  const code = String(rawCode ?? '').trim().toUpperCase().replace(/\s/g, '');
  if (code.length !== 6) throw new Error('Codes are six characters.');
  const { data, error } = await supabase.rpc('join_project', {
    p_code: code,
    p_display_name: displayName,
  });
  if (error) throw error;
  const member = Array.isArray(data) ? data[0] : data;
  if (!member) throw new Error('No space with that code.');
  return { projectId: member.project_id, memberId: member.id };
}

export async function getSpace(projectId) {
  const spaces = await listSpaces();
  return spaces.find((s) => s.id === projectId) ?? null;
}

export async function listMembers(projectId) {
  if (projectId === DEMO_SPACE_ID) return DEMO_MEMBERS.map((m) => ({ ...m }));
  const { data, error } = await supabase.rpc('get_space_members', { p_project_id: projectId });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    memberId: m.member_id,
    userId: m.user_id,
    name: m.display_name,
    colourIndex: m.colour_index,
    role: m.role,
    sharedNotes: m.shared_notes,
    lastSeenAt: m.last_seen_at,
  }));
}

export async function heartbeat(projectId) {
  // Best effort — a missed beat just renders as away. The RPC touches only
  // last_seen_at (no broad row UPDATE exists, deliberately).
  try {
    await supabase.rpc('touch_last_seen', { p_project_id: projectId });
  } catch { /* ignore */ }
}

// Share a space straight to a person by email: adds them as a member (if they
// already have an account) AND emails them a join link + code. Routed through
// the studio sidecar because SMTP credentials live only there.
// Returns { emailed, emailConfigured, alreadyMember, addedMember, name, code, spaceName }.
// Email specific notes to a person. Real spaces send note ids (the server
// reads them under your JWT); the sample sends its notes inline.
export async function shareNotesByEmail(projectId, email, { noteIds, notes } = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Your sign-in expired. Sign in again and try once more.');
  const res = await fetch('/api/share-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ projectId, email: email.trim(), noteIds, notes }),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || `Share failed (${res.status})`);
  return data;
}

export async function inviteByEmail(projectId, email) {
  const token = await getAccessToken();
  if (!token) throw new Error('Your sign-in expired. Sign in again and try once more.');
  const res = await fetch('/api/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ projectId, email: email.trim() }),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    // Sidecar down (e.g. prod without the server): fall back to the RPC so the
    // person is still added and the caller can share the code by hand.
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      const { data: rpcData, error } = await supabase.rpc('invite_by_email', {
        p_project_id: projectId, p_email: email.trim(),
      });
      if (error) throw error;
      return { emailed: false, emailConfigured: false, addedMember: !!rpcData?.invited, alreadyMember: !!rpcData?.already, name: rpcData?.name ?? null, sidecarDown: true };
    }
    throw new Error(data.error ?? `Invite failed (${res.status})`);
  }
  return data;
}

// -------------------------------------------------------------------- notes

const NOTE_COLS_BASE = 'id, project_id, author_id, title, body, visibility, shared_at, created_at, updated_at';
// edit_mode arrives with 07_collab.sql; selecting it earlier would 42703.
const noteCols = () => NOTE_COLS_BASE + (features.collab ? ', edit_mode' : '');

export async function listNotes(projectId) {
  await probeCollab();
  // RLS returns shared notes + the caller's own private notes.
  const { data, error } = await supabase
    .from('space_notes')
    .select(noteCols())
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNote(noteId) {
  await probeCollab();
  const { data, error } = await supabase
    .from('space_notes')
    .select(noteCols())
    .eq('id', noteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createNote(projectId, authorMemberId, { title, visibility }) {
  await probeCollab();
  const { data, error } = await supabase
    .from('space_notes')
    .insert({
      project_id: projectId,
      author_id: authorMemberId,
      title: title ?? 'Untitled note',
      body: '',
      visibility,
      shared_at: visibility === 'shared' ? new Date().toISOString() : null,
    })
    .select(noteCols())
    .single();
  if (error) throw error;
  return data;
}

// Returns the updated row, or null when RLS filtered the write (someone
// else's note before co-editing is enabled) — callers render read-only then.
export async function updateNote(noteId, patch) {
  await probeCollab();
  const { data, error } = await supabase
    .from('space_notes')
    .update(patch)
    .eq('id', noteId)
    .select(noteCols());
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function shareNoteToSpace(noteId) {
  return updateNote(noteId, { visibility: 'shared', shared_at: new Date().toISOString() });
}

export async function deleteNote(noteId) {
  const { data, error } = await supabase
    .from('space_notes')
    .delete()
    .eq('id', noteId)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// -------------------------------------------------------------------- tasks

const TASK_COLS = 'id, project_id, note_id, title, label, status, progress, assignee_user, assigned_by_user, due_date, created_at, updated_at';

async function taskGuard(run) {
  if (features.tasks === false) return [];
  const { data, error } = await run();
  if (error) {
    if (missingRelation(error)) { features.tasks = false; return []; }
    throw error;
  }
  features.tasks = true;
  return data ?? [];
}

export async function listMyTasks(userId) {
  return taskGuard(() =>
    supabase.from('tasks').select(TASK_COLS)
      .eq('assignee_user', userId)
      .order('due_date', { ascending: true, nullsFirst: false }));
}

export async function listSpaceTasks(projectId) {
  return taskGuard(() =>
    supabase.from('tasks').select(TASK_COLS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }));
}

export async function createTask(projectId, { title, label, noteId, assigneeUser, assignedByUser, dueDate }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title,
      label: label || 'Task',
      note_id: noteId ?? null,
      assignee_user: assigneeUser ?? null,
      assigned_by_user: assignedByUser,
      due_date: dueDate ?? null,
      status: 'todo',
      progress: 0,
    })
    .select(TASK_COLS)
    .single();
  if (error) throw friendlyTaskError(error);
  return data;
}

// The 'review' status and other sql/06 tweaks land only after the file is
// re-run; turn the raw Postgres check-violation into a clear instruction.
function friendlyTaskError(error) {
  if (error?.code === '23514' && /status/.test(error.message ?? '')) {
    return new Error('Re-run sql/06_grovestudio.sql in Supabase — the board’s “In review” column needs the updated status set.');
  }
  return error;
}

export async function updateTask(taskId, patch) {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .select(TASK_COLS)
    .single();
  if (error) throw friendlyTaskError(error);
  return data;
}

// ------------------------------------------------------------------ lookups

// Bulk profile lookup: task rows show who assigned what.
export async function fetchProfiles(userIds) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', ids);
  if (error) return new Map();
  return new Map(data.map((p) => [p.user_id, p]));
}

// Bulk note-title lookup for task source chips (RLS-filtered).
export async function fetchNoteTitles(noteIds) {
  const ids = [...new Set(noteIds)].filter(Boolean);
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from('space_notes')
    .select('id, title')
    .in('id', ids);
  if (error) return new Map();
  return new Map(data.map((n) => [n.id, n.title]));
}

// ------------------------------------------------------------ notifications

export async function listNotifications(userId) {
  return taskGuard(() =>
    supabase.from('notifications').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30));
}

export async function markNotificationsRead(userId) {
  if (features.tasks === false) return;
  try {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  } catch { /* advisory */ }
}

// Fan a notification out to one or more users, via the server-side RPC that
// verifies membership and stamps the actor name itself (no impersonation).
// Best effort by design: a failed ping never fails the action that caused it.
export async function notify(userIds, { kind, text, sub, projectId, noteId, taskId }) {
  if (features.tasks === false) return;
  const targets = [...new Set(userIds)].filter(Boolean);
  if (!targets.length) return;
  try {
    const { error } = await supabase.rpc('notify_users', {
      p_user_ids: targets,
      p_kind: kind,
      p_text: text,
      p_sub: sub ?? null,
      p_project_id: projectId ?? null,
      p_note_id: noteId ?? null,
      p_task_id: taskId ?? null,
    });
    if (error && (missingRelation(error) || error.code === 'PGRST202')) features.tasks = false;
  } catch { /* best effort */ }
}

// ----------------------------------------------------------------- comments

export async function listComments(noteId) {
  return taskGuard(() =>
    supabase.from('note_comments').select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true }));
}

export async function addComment(noteId, projectId, userId, body, anchor = null) {
  await probeCollab();
  const row = { note_id: noteId, project_id: projectId, author_user: userId, body: body.trim() };
  if (anchor && features.collab) { row.anchor_line = anchor.line; row.anchor_text = String(anchor.text ?? '').slice(0, 200); }
  const { data, error } = await supabase
    .from('note_comments')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ----------------------------------------------------- versions (07_collab)

export async function listVersions(noteId) {
  if (!(await probeCollab())) return [];
  const { data, error } = await supabase
    .from('note_versions')
    .select('id, note_id, project_id, author_user, title, body, summary, created_at')
    .eq('note_id', noteId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function addVersion(noteId, projectId, userId, { title, body, summary }) {
  if (!(await probeCollab())) return null;
  const { data, error } = await supabase
    .from('note_versions')
    .insert({ note_id: noteId, project_id: projectId, author_user: userId, title: title ?? '', body: body ?? '', summary: summary ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ------------------------------------------------ roles + locks (07_collab)

export async function setMemberRole(projectId, userId, role) {
  const { error } = await supabase.rpc('set_member_role', { p_project_id: projectId, p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function setNoteEditMode(noteId, mode) {
  return updateNote(noteId, { edit_mode: mode });
}
