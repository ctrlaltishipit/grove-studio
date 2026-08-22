// Grove — the ONE module that talks to the database. GROVE-MASTER.md §12, CLAUDE.md §4.
//
// THE INDEPENDENCE INVARIANT LIVES HERE.
//   There is exactly one read of notes.body in the client — listMyNotes() —
//   and it is filtered to the current participant. There is no unfiltered
//   variant and there must never be one. Everything about OTHER observers
//   comes from SECURITY DEFINER functions that return names, colours and
//   INTEGERS (get_roster, get_public_roster) or ids (get_finding_observers),
//   and are structurally incapable of returning note text.
//
// Rules enforced by scripts/independence-audit.mjs:
//   - `.from(`, `.rpc(`, `createClient(` appear nowhere else in src/.
//   - every from('notes') statement carries .eq('participant_id', …) and an
//     explicit column list — never select('*').
//   - this module never calls auth.* itself — identity is passed in as a
//     userId by the route (see auth.ts), so nothing here can sign anyone in.
//     authClient() hands the auth surface to auth.ts; the raw client is private.
//
// Participants have ONE write path: the SECURITY DEFINER function join_session().
//   Direct INSERT on public.participants is revoked from anon and authenticated,
//   so the client cannot create a second row for the same (session, user) and
//   inflate observer_count — the one number Grove exists to produce. Creating a
//   session joins its creator through the same function as everyone else.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  NoteTask, MyTask, AppNotification, TaskStatus,
  Finding, FindingObserver, Note, NoteKind, Participant, Profile, RosterRow,
  Session, Space, SpaceMember, SpaceNote,
} from './models';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. The UI renders a notice, not a crash. */
export const configured = Boolean(url && key);

// Module-private on purpose: no other file may hold the client, so no other file can query.
const client: SupabaseClient | null = configured
  ? createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

function db(): SupabaseClient {
  if (!client) throw new Error('not configured');
  return client;
}

/** The only auth surface leaving this module. Consumed by auth.ts alone; nothing here calls it. */
export const authClient = () => db().auth;

const SESSION_COLS = 'id, title, research_question, join_code, status, created_by, created_at';
const PARTICIPANT_COLS = 'id, session_id, display_name, user_id, colour_index, last_seen_at, joined_at';
const NOTE_COLS = 'id, session_id, participant_id, body, kind, created_at, updated_at';
const FINDING_COLS = 'id, session_id, theme, summary, observer_count, supporting_note_ids, has_disagreement, disagreement_note, rank, created_at';

/** What lookup_session_by_code() returns: enough to show "Joining <title>", never the session row. */
export interface SessionLookup {
  id: string;
  title: string;
  research_question: string;
  status: Session['status'];
  join_code: string;
}

/* ---------------- sessions ---------------- */

/** Inserts the session row, then joins its creator through join_session() — the same path as
 *  every other observer, so there is no second way to become a participant. */
export async function createSession(args: { title: string; researchQuestion: string; displayName: string; userId: string }): Promise<Session> {
  const { data, error } = await db()
    .from('sessions')
    .insert({ title: args.title.trim(), research_question: args.researchQuestion.trim(), created_by: args.userId })
    .select(SESSION_COLS)
    .single();
  if (error) throw error;
  // join_code comes from the Postgres column default (gen_join_code()) — never the client.
  const session = data as Session;
  await joinSession({ code: session.join_code, displayName: args.displayName });
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await db().from('sessions').select(SESSION_COLS).eq('id', sessionId).maybeSingle();
  if (error) throw error;
  return (data as Session | null) ?? null;
}

/** Join-by-code goes through a SECURITY DEFINER function so sessions_select can stay tight. */
export async function lookupSessionByCode(rawCode: string): Promise<SessionLookup | null> {
  const code = String(rawCode || '').trim().toUpperCase().replace(/\s/g, '');
  if (code.length !== 6) return null;
  const { data, error } = await db().rpc('lookup_session_by_code', { p_code: code });
  if (error) throw error;
  const rows = (data as SessionLookup[] | null) ?? [];
  return rows[0] ?? null;
}

/* ---------------- participants ---------------- */

/** THE ONLY WRITE PATH FOR PARTICIPANTS. join_session() is a SECURITY DEFINER function that
 *  resolves the code, requires the session to be live, and reuses an existing participant row
 *  for this (session, user) before it inserts one. A duplicate would silently inflate
 *  observer_count — the one number Grove exists to produce — and because the reuse happens
 *  inside Postgres, two tabs racing cannot produce one. colour_index is assigned by a
 *  SECURITY DEFINER trigger in Postgres; the client never sends it. Identity is auth.uid()
 *  on the server, so no userId crosses the wire. */
export async function joinSession(args: { code: string; displayName: string }): Promise<Participant> {
  const { data, error } = await db().rpc('join_session', { p_code: args.code, p_display_name: args.displayName });
  if (error) throw error;
  const rows = (data as Participant[] | null) ?? [];
  const row = rows[0];
  if (!row) throw new Error('join returned no row');
  return row;
}

export async function getMyParticipant(sessionId: string, userId: string): Promise<Participant | null> {
  const { data, error } = await db()
    .from('participants')
    .select(PARTICIPANT_COLS)
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Participant | null) ?? null;
}

export async function heartbeat(participantId: string): Promise<void> {
  const { error } = await db()
    .from('participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', participantId);
  if (error) throw error;
}

/* ---------------- roster — counts only ----------------
 * get_roster() (participants) and get_public_roster() (anyone, synthesised sessions only)
 * return names, colours and integers. If you are ever tempted to replace either with a join
 * onto notes, re-read CLAUDE.md §4 first. */

export async function getRoster(sessionId: string): Promise<RosterRow[]> {
  const { data, error } = await db().rpc('get_roster', { p_session_id: sessionId });
  if (error) throw error;
  return (data as RosterRow[] | null) ?? [];
}

export async function getPublicRoster(sessionId: string): Promise<RosterRow[]> {
  const { data, error } = await db().rpc('get_public_roster', { p_session_id: sessionId });
  if (error) throw error;
  return (data as RosterRow[] | null) ?? [];
}

/* ---------------- notes — the private lane ----------------
 * THE ONLY read of notes.body in the client, filtered to the current participant. */

export async function listMyNotes(sessionId: string, participantId: string): Promise<Note[]> {
  const { data, error } = await db()
    .from('notes')
    .select(NOTE_COLS)
    .eq('session_id', sessionId)
    .eq('participant_id', participantId) // ← the invariant. Never remove this line.
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Note[] | null) ?? [];
}

export async function createNote(args: { sessionId: string; participantId: string; body: string; kind: NoteKind }): Promise<Note> {
  const { data, error } = await db()
    .from('notes')
    .insert({ session_id: args.sessionId, participant_id: args.participantId, body: args.body.trim(), kind: args.kind })
    .select(NOTE_COLS)
    .single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(args: { noteId: string; participantId: string; body: string }): Promise<Note> {
  const { data, error } = await db()
    .from('notes')
    .update({ body: args.body.trim() })
    .eq('id', args.noteId)
    .eq('participant_id', args.participantId)
    .select(NOTE_COLS)
    .single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(args: { noteId: string; participantId: string }): Promise<void> {
  const { error } = await db()
    .from('notes')
    .delete()
    .eq('id', args.noteId)
    .eq('participant_id', args.participantId);
  if (error) throw error;
}

/* ---------------- findings ----------------
 * The client NEVER writes findings. api/synthesise.py owns that table. */

export async function listFindings(sessionId: string): Promise<Finding[]> {
  const { data, error } = await db()
    .from('findings')
    .select(FINDING_COLS)
    .eq('session_id', sessionId)
    .order('rank', { ascending: true });
  if (error) throw error;
  return (data as Finding[] | null) ?? [];
}

/** Which participant supported which finding — ids only, from a SECURITY DEFINER function,
 *  so the convergence grid is correct for stakeholders and under RLS. */
export async function getFindingObservers(sessionId: string): Promise<FindingObserver[]> {
  const { data, error } = await db().rpc('get_finding_observers', { p_session_id: sessionId });
  if (error) throw error;
  return (data as FindingObserver[] | null) ?? [];
}

/* ================================================================
 * Grove Studio — spaces and notes.
 *
 * Same rules as above. Membership is written ONLY through join_project() /
 * create_project(); the client has no INSERT privilege on project_members, so
 * a leaked space id is not a way in — the join code is. Private notes are
 * filtered by RLS, not by politeness: the select below asks for everything the
 * caller is allowed to see, and the database decides what that is.
 * ================================================================ */

const SPACE_NOTE_COLS = 'id, project_id, author_id, title, body, visibility, shared_at, created_at, updated_at';

/** Upsert the signed-in user's display name and avatar, from their OAuth identity. */
export async function saveProfile(p: Profile): Promise<void> {
  const { error } = await db().from('profiles').upsert(
    { user_id: p.user_id, display_name: p.display_name, avatar_url: p.avatar_url },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await db()
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/** Every space this person belongs to, newest activity first, with counts for the home screen. */
export async function listMySpaces(): Promise<Space[]> {
  const { data, error } = await db().rpc('my_spaces');
  if (error) throw error;
  return (data as Space[] | null) ?? [];
}

export async function createSpace(name: string, displayName: string): Promise<{ id: string; name: string; join_code: string }> {
  const { data, error } = await db().rpc('create_project', { p_name: name, p_display_name: displayName });
  if (error) throw error;
  const rows = (data as { id: string; name: string; join_code: string }[] | null) ?? [];
  if (!rows[0]) throw new Error('create returned no row');
  return rows[0];
}

/** Join by code. The code is the capability — there is no other way in. */
export async function joinSpace(code: string, displayName: string): Promise<SpaceMember | null> {
  const { data, error } = await db().rpc('join_project', {
    p_code: code.trim().toUpperCase(),
    p_display_name: displayName,
  });
  if (error) throw error;
  const rows = (data as { id: string; project_id: string }[] | null) ?? [];
  return rows[0] ? ({ ...rows[0], member_id: rows[0].id } as unknown as SpaceMember) : null;
}

export async function getSpaceMembers(projectId: string): Promise<SpaceMember[]> {
  const { data, error } = await db().rpc('get_space_members', { p_project_id: projectId });
  if (error) throw error;
  return (data as SpaceMember[] | null) ?? [];
}

export async function getSpace(projectId: string): Promise<{ id: string; name: string; description: string; join_code: string } | null> {
  const { data, error } = await db()
    .from('projects')
    .select('id, name, description, join_code')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string; name: string; description: string; join_code: string } | null) ?? null;
}

/** Shared notes of the space plus the caller's own private ones. RLS decides;
 *  this query does not try to be clever about it. */
export async function listSpaceNotes(projectId: string): Promise<SpaceNote[]> {
  const { data, error } = await db()
    .from('space_notes')
    .select(SPACE_NOTE_COLS)
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SpaceNote[] | null) ?? [];
}

export async function getSpaceNote(noteId: string): Promise<SpaceNote | null> {
  const { data, error } = await db()
    .from('space_notes')
    .select(SPACE_NOTE_COLS)
    .eq('id', noteId)
    .maybeSingle();
  if (error) throw error;
  return (data as SpaceNote | null) ?? null;
}

export async function createSpaceNote(args: {
  projectId: string; authorId: string; title?: string; body?: string; visibility?: SpaceNote['visibility'];
}): Promise<SpaceNote> {
  const { data, error } = await db()
    .from('space_notes')
    .insert({
      project_id: args.projectId,
      author_id: args.authorId,
      title: args.title?.trim() || 'Untitled note',
      body: args.body ?? '',
      visibility: args.visibility ?? 'private',
      shared_at: args.visibility === 'shared' ? new Date().toISOString() : null,
    })
    .select(SPACE_NOTE_COLS)
    .single();
  if (error) throw error;
  return data as SpaceNote;
}

export async function saveSpaceNote(noteId: string, patch: { title?: string; body?: string }): Promise<SpaceNote> {
  const { data, error } = await db()
    .from('space_notes')
    .update(patch)
    .eq('id', noteId)
    .select(SPACE_NOTE_COLS)
    .single();
  if (error) throw error;
  return data as SpaceNote;
}

/** Promotion is one-way, and the database agrees: there is no demote here
 *  because un-sharing something people have already read is a lie. */
export async function shareSpaceNote(noteId: string): Promise<SpaceNote> {
  const { data, error } = await db()
    .from('space_notes')
    .update({ visibility: 'shared', shared_at: new Date().toISOString() })
    .eq('id', noteId)
    .select(SPACE_NOTE_COLS)
    .single();
  if (error) throw error;
  return data as SpaceNote;
}

export async function deleteSpaceNote(noteId: string): Promise<void> {
  const { error } = await db().from('space_notes').delete().eq('id', noteId);
  if (error) throw error;
}


/* ---------- tasks (A15) ----------
 *
 * Every write goes through an RPC, never a table. That is not ceremony: a
 * task write has to check the note is shared and the assignee is in this
 * space, and then write a notification row for somebody else — which RLS
 * forbids a client from ever doing directly. The INSERT/UPDATE/DELETE
 * privileges on note_tasks and notifications are revoked, so there is no
 * second path to get this wrong.
 */

export async function listNoteTasks(noteId: string): Promise<NoteTask[]> {
  const { data, error } = await db().rpc('list_note_tasks', { p_note_id: noteId });
  if (error) throw error;
  return (data as NoteTask[] | null) ?? [];
}

export async function createTask(input: {
  noteId: string; title: string; assigneeId?: string | null; dueDate?: string | null; detail?: string;
}): Promise<void> {
  const { error } = await db().rpc('create_task', {
    p_note_id: input.noteId,
    p_title: input.title,
    p_assignee_id: input.assigneeId ?? null,
    p_due_date: input.dueDate ?? null,
    p_detail: input.detail ?? '',
  });
  if (error) throw error;
}

/** Clearing a field and leaving it alone are different intentions, and one
 *  null cannot mean both. The two explicit clear flags keep them apart. */
export async function updateTask(taskId: string, patch: {
  title?: string; assigneeId?: string | null; dueDate?: string | null;
  status?: TaskStatus; detail?: string; clearAssignee?: boolean; clearDue?: boolean;
}): Promise<void> {
  const { error } = await db().rpc('update_task', {
    p_task_id: taskId,
    p_title: patch.title ?? null,
    p_assignee_id: patch.assigneeId ?? null,
    p_due_date: patch.dueDate ?? null,
    p_status: patch.status ?? null,
    p_detail: patch.detail ?? null,
    p_clear_assignee: patch.clearAssignee ?? false,
    p_clear_due: patch.clearDue ?? false,
  });
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await db().rpc('delete_task', { p_task_id: taskId });
  if (error) throw error;
}

export async function myTasks(): Promise<MyTask[]> {
  const { data, error } = await db().rpc('my_tasks');
  if (error) throw error;
  return (data as MyTask[] | null) ?? [];
}

export async function myTaskCounts(): Promise<Record<string, { open: number; overdue: number }>> {
  const { data, error } = await db().rpc('my_task_counts');
  if (error) throw error;
  const out: Record<string, { open: number; overdue: number }> = {};
  for (const r of (data as { project_id: string; open_count: number; overdue_count: number }[] | null) ?? []) {
    out[r.project_id] = { open: Number(r.open_count), overdue: Number(r.overdue_count) };
  }
  return out;
}

export async function myNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await db().rpc('my_notifications', { p_limit: limit });
  if (error) throw error;
  return (data as AppNotification[] | null) ?? [];
}

export async function markNotificationsRead(): Promise<void> {
  const { error } = await db().rpc('mark_notifications_read');
  if (error) throw error;
}
