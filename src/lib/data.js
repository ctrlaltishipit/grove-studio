// =============================================================================
// Grove — src/lib/data.js
// THE ONLY MODULE THAT TALKS TO THE DATABASE.
// If a component or a hook contains `.from(` or `.rpc(`, that is a bug.
//
// THE INDEPENDENCE INVARIANT (CLAUDE.md §8):
// Exactly one function below selects `body`, and it is always filtered to the
// caller's own participant_id. The roster reads COUNTS. Never write a query,
// component, API response, log line, tooltip or test fixture that exposes
// another participant's note body. Treat any leak as a P0.
// =============================================================================

import { supabase } from './supabase';
import { getAccessToken } from './auth';

const SESSION_COLS = 'id, title, research_question, join_code, status, created_at, created_by';

// ---------------------------------------------------------------- sessions --

export async function createSession({ title, researchQuestion, userId }) {
  // join_code is generated in Postgres as a column default. The client never
  // invents one, so two simultaneous creates cannot collide client-side.
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      title: title.trim(),
      research_question: researchQuestion.trim(),
      created_by: userId,
    })
    .select(SESSION_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function getSession(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_COLS)
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findSessionByCode(rawCode) {
  const code = String(rawCode ?? '').trim().toUpperCase().replace(/\s/g, '');
  if (code.length !== 6) return null;
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_COLS)
    .eq('join_code', code)
    .maybeSingle();
  if (error) throw error;
  return data; // null -> "No session with that code."
}

// ------------------------------------------------------------ participants --

export async function joinSession({ sessionId, displayName, userId }) {
  const { count } = await supabase
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const { data, error } = await supabase
    .from('participants')
    .upsert(
      {
        session_id: sessionId,
        display_name: displayName.trim(),
        user_id: userId,
        colour_index: (count ?? 0) % 5,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,user_id' } // a refresh rejoins, it does not duplicate
    )
    .select('id, session_id, display_name, colour_index, last_seen_at, joined_at')
    .single();
  if (error) throw error;
  return data;
}

export async function getMyParticipant(sessionId, userId) {
  const { data, error } = await supabase
    .from('participants')
    .select('id, session_id, display_name, colour_index, last_seen_at, joined_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function heartbeat(participantId) {
  const { error } = await supabase
    .from('participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', participantId);
  if (error) throw error;
}

// ------------------------------------------------------------------ roster --

// COUNTS ONLY. get_roster is a SECURITY DEFINER function whose return type has
// no column that could carry a note body. It cannot leak text even if someone
// later rewrites this call carelessly.
export async function getRoster(sessionId) {
  const { data, error } = await supabase.rpc('get_roster', { p_session_id: sessionId });
  if (error) throw error;
  return data ?? [];
}

// The absent-stakeholder path: a synthesised session's roster, readable by
// anyone holding the findings link. Counts only, same as above.
export async function getPublicRoster(sessionId) {
  const { data, error } = await supabase.rpc('get_public_roster', { p_session_id: sessionId });
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------- notes --

// THE ONLY FUNCTION IN GROVE THAT READS NOTE BODIES FOR THE CLIENT.
export async function listMyNotes(sessionId, participantId) {
  const { data, error } = await supabase
    .from('notes')
    .select('id, body, kind, created_at, updated_at')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)   // <- the invariant. Never remove this line.
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createNote({ sessionId, participantId, body, kind = 'observation' }) {
  const { data, error } = await supabase
    .from('notes')
    .insert({ session_id: sessionId, participant_id: participantId, body: body.trim(), kind })
    .select('id, body, kind, created_at, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote({ noteId, participantId, body }) {
  const { data, error } = await supabase
    .from('notes')
    .update({ body: body.trim() })
    .eq('id', noteId)
    .eq('participant_id', participantId)   // belt and braces above the RLS policy
    .select('id, body, kind, created_at, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNote({ noteId, participantId }) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('participant_id', participantId);
  if (error) throw error;
}

// ---------------------------------------------------------------- findings --

export async function listFindings(sessionId) {
  const { data, error } = await supabase
    .from('findings')
    .select('id, theme, summary, observer_count, supporting_note_ids, has_disagreement, disagreement_note, rank, created_at')
    .eq('session_id', sessionId)
    .order('rank', { ascending: true });
  if (error) throw error;
  return data ?? [];
}


// Which observers contributed to each finding. IDS ONLY — the return type has
// no column that could carry a note body.
export async function getFindingObservers(sessionId) {
  const { data, error } = await supabase.rpc('get_finding_observers', { p_session_id: sessionId });
  if (error) throw error;
  return data ?? [];
}

// --------------------------------------------------------------- synthesis --

// The client sends the session id and NOTHING ELSE. The function reads
// participants and notes server-side with the service-role key, because a
// client that could assemble other participants' notes would already have
// violated the invariant above.
const CLIENT_COPY = {
  BAD_REQUEST:      'Something went wrong with that request. Your notes are saved.',
  UNAUTHORISED:     'Your session expired. Reload the page.',
  NOT_A_PARTICIPANT:'You are not a participant of this session.',
  TOO_FEW_OBSERVERS:'Synthesis needs at least two observers with notes.',
  LLM_BAD_JSON:     "Synthesis didn't complete. Your notes are saved. Try again.",
  LLM_TIMEOUT:      "Synthesis didn't complete. Your notes are saved. Try again.",
  INTERNAL:         "Synthesis didn't complete. Your notes are saved. Try again.",
};
const FALLBACK = "Synthesis didn't complete. Your notes are saved. Try again.";

export async function synthesise(sessionId) {
  const token = await getAccessToken();
  if (!token) throw new Error(CLIENT_COPY.UNAUTHORISED);

  let res;
  try {
    res = await fetch('/api/synthesise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch {
    throw new Error(FALLBACK);
  }

  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON body */ }

  if (!res.ok || !payload?.ok) {
    const code = payload?.code;
    throw new Error(CLIENT_COPY[code] ?? FALLBACK);
  }
  return payload;
}
