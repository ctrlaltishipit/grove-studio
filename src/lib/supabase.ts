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
//   - this module never calls supabase.auth.* — identity is passed in as a
//     userId by the route (see auth.ts), so nothing here can sign anyone in.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Finding, FindingObserver, Note, NoteKind, Participant, RosterRow, Session } from './models';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. The UI renders a notice, not a crash. */
export const configured = Boolean(url && key);

export const supabase: SupabaseClient | null = configured
  ? createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

function db(): SupabaseClient {
  if (!supabase) throw new Error('not configured');
  return supabase;
}

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

export async function createSession(args: { title: string; researchQuestion: string; userId: string }): Promise<Session> {
  const { data, error } = await db()
    .from('sessions')
    .insert({ title: args.title.trim(), research_question: args.researchQuestion.trim(), created_by: args.userId })
    .select(SESSION_COLS)
    .single();
  if (error) throw error;
  // join_code comes from the Postgres column default (gen_join_code()) — never the client.
  return data as Session;
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

/** Reuses an existing participant row for this (session, user). A duplicate would silently
 *  inflate observer_count — the one number Grove exists to produce. colour_index is assigned
 *  by a SECURITY DEFINER trigger in Postgres; the client never sends it. */
export async function joinSession(args: { sessionId: string; displayName: string; userId: string }): Promise<Participant> {
  const mine = await getMyParticipant(args.sessionId, args.userId);
  if (mine) return mine;

  const { data, error } = await db()
    .from('participants')
    .insert({ session_id: args.sessionId, display_name: args.displayName.trim(), user_id: args.userId })
    .select(PARTICIPANT_COLS)
    .single();
  if (error) {
    // 23505 = unique_violation on (session_id, user_id): two tabs raced. The row exists; read it.
    if ((error as { code?: string }).code === '23505') {
      const again = await getMyParticipant(args.sessionId, args.userId);
      if (again) return again;
    }
    throw error;
  }
  return data as Participant;
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
