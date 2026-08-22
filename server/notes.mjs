// =============================================================================
// GroveStudio server — per-user note access.
//
// THE ISOLATION GUARANTEE: every database read here is made WITH THE CALLING
// USER'S OWN JWT against PostgREST, so Postgres RLS decides what they can
// see — shared notes in their spaces plus their own private notes, nothing
// else. The service-role key is never used. A forged or foreign note id
// simply comes back empty.
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && ANON_KEY);
}

function headers(userToken) {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  };
}

// Verify the JWT actually belongs to a signed-in user; returns the user or null.
export async function verifyUser(userToken) {
  if (!userToken) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(userToken) });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? user : null;
}

async function rest(userToken, path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(userToken) });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function rpc(userToken, name, args = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(userToken),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`supabase rpc ${name} ${res.status}`);
  return res.json();
}

const MAX_NOTES = 100;
const MAX_CHARS = 60000;

const uuidRe = /^[0-9a-f-]{36}$/i;
const cleanIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).filter((x) => uuidRe.test(String(x))))];

// Resolve a studio scope ({noteIds} | {spaceIds} | everything) into the notes
// the CALLER is allowed to read, with space names attached.
export async function fetchScope(userToken, { noteIds, spaceIds } = {}) {
  const nIds = cleanIds(noteIds);
  const sIds = cleanIds(spaceIds);

  const spaces = await rpc(userToken, 'my_spaces');
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));

  let notes;
  if (nIds.length) {
    notes = await rest(userToken,
      `space_notes?id=in.(${nIds.join(',')})&select=id,project_id,title,body,visibility,updated_at&order=updated_at.desc&limit=${MAX_NOTES}`);
  } else {
    const targets = sIds.length ? sIds.filter((id) => spaceName.has(id)) : spaces.map((s) => s.id);
    if (!targets.length) return { notes: [], spaces, label: 'no spaces' };
    notes = await rest(userToken,
      `space_notes?project_id=in.(${targets.join(',')})&select=id,project_id,title,body,visibility,updated_at&order=updated_at.desc&limit=${MAX_NOTES}`);
  }

  // Keep only notes whose space the caller is actually in (belt over RLS).
  notes = notes.filter((n) => spaceName.has(n.project_id));

  const scopeSpaces = [...new Set(notes.map((n) => n.project_id))];
  const label =
    nIds.length ? `${notes.length} selected note${notes.length === 1 ? '' : 's'}`
      : sIds.length ? `${notes.length} notes across ${scopeSpaces.length} space${scopeSpaces.length === 1 ? '' : 's'}`
        : `${notes.length} notes across all your spaces`;

  return {
    notes: notes.map((n) => ({ ...n, spaceName: spaceName.get(n.project_id) ?? 'a space' })),
    spaces,
    label,
  };
}

// --------------------------------------------------------------- invites --

// Name + join code for one space the caller belongs to (null if not a member).
export async function spaceBrief(userToken, projectId) {
  const spaces = await rpc(userToken, 'my_spaces');
  const s = (spaces ?? []).find((x) => x.id === projectId);
  return s ? { name: s.name, joinCode: s.join_code } : null;
}

// The caller's own display name (for the "X invited you" line).
export async function callerName(userToken, user) {
  try {
    const rows = await rest(userToken, `profiles?user_id=eq.${user.id}&select=display_name`);
    return rows?.[0]?.display_name ?? '';
  } catch { return ''; }
}

// Add the invitee as a member if they already have an account (the RPC also
// pings them). Returns { invited, name?, already?, reason? }.
export async function inviteMember(userToken, projectId, email) {
  return rpc(userToken, 'invite_by_email', { p_project_id: projectId, p_email: email });
}

// One flat text corpus for prompting, capped so requests stay sane.
export function corpus(notes) {
  let out = '';
  for (const n of notes) {
    const chunk = `### Note: "${n.title}" (space: ${n.spaceName}, updated ${n.updated_at?.slice(0, 10) ?? '?'})\n${(n.body ?? '').trim() || '(empty)'}\n\n`;
    const remaining = MAX_CHARS - out.length;
    if (remaining <= 0) break;
    // Truncate rather than drop, so a single huge note never yields an
    // empty corpus (which would strand every studio tool).
    out += chunk.length > remaining ? chunk.slice(0, remaining) : chunk;
  }
  return out.trim();
}
