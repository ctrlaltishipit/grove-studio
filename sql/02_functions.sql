-- ============================================================
-- Grove — 02_functions.sql
-- Run this SECOND, at stage S0, while RLS is still OFF.
--
-- Shipping these now means turning RLS on later needs no client change.
--
-- THE RULE FOR EVERY FUNCTION IN THIS FILE:
--   a SECURITY DEFINER function's return type may never contain a column
--   that can carry a note body.
-- A SECURITY DEFINER function runs as its owner and bypasses the caller's
-- row-level security, so its signature IS its security boundary. Return
-- integers, ids, names, colours, session metadata. Never text that could
-- have come from public.notes.body. If a future function needs a body, it
-- is not SECURITY DEFINER, full stop.
--
-- Spec: GROVE-MASTER.md §12.1 — "It returns integers. It is structurally
-- incapable of returning note text."
-- ============================================================

-- Is the current anon user a participant of this session?
-- SECURITY DEFINER so it can read participants without recursing into the
-- participants policy (the classic RLS infinite-recursion trap).
create or replace function public.is_participant(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participants pp
    where pp.session_id = p_session_id
      and pp.user_id    = auth.uid()
  );
$$;

revoke all on function public.is_participant(uuid) from public;
grant execute on function public.is_participant(uuid) to anon, authenticated;


-- Roster counts under RLS. Returns integers. CANNOT return note text.
-- This is the narrowest possible surface for the roster: a SECURITY DEFINER
-- function whose return type has no text column carrying a note body.
create or replace function public.get_roster(p_session_id uuid)
returns table (
  participant_id uuid,
  display_name   text,
  colour_index   int,
  note_count     int,
  last_seen_at   timestamptz,
  joined_at      timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.colour_index,
         coalesce(count(n.id), 0)::int,
         p.last_seen_at, p.joined_at
  from public.participants p
  left join public.notes n on n.participant_id = p.id
  where p.session_id = p_session_id
    and public.is_participant(p_session_id)   -- caller must be in the session
  group by p.id
  order by p.joined_at asc;
$$;

revoke all on function public.get_roster(uuid) from public;
grant execute on function public.get_roster(uuid) to anon, authenticated;


-- Public roster for the findings page (absent-stakeholder path).
-- Returns display name + colour + count for a SYNTHESISED session only,
-- to anyone holding the link. Still no note bodies, ever.
create or replace function public.get_public_roster(p_session_id uuid)
returns table (
  participant_id uuid,
  display_name   text,
  colour_index   int,
  note_count     int
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.colour_index, coalesce(count(n.id), 0)::int
  from public.participants p
  left join public.notes n on n.participant_id = p.id
  where p.session_id = p_session_id
    and exists (select 1 from public.sessions s
                where s.id = p_session_id and s.status = 'synthesised')
  group by p.id
  order by p.joined_at asc;
$$;

revoke all on function public.get_public_roster(uuid) from public;
grant execute on function public.get_public_roster(uuid) to anon, authenticated;


-- Which observers contributed to each finding, for the convergence grid and
-- the contributor initials on a finding card.
-- Returns IDS ONLY. There is no column here that could carry a note body,
-- which is why the findings page can render this without ever being able to
-- read another observer's text.
create or replace function public.get_finding_observers(p_session_id uuid)
returns table (
  finding_id     uuid,
  participant_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, n.participant_id
  from public.findings f
  join public.notes n on n.id = any (f.supporting_note_ids)
  where f.session_id = p_session_id
    and exists (select 1 from public.sessions s
                where s.id = p_session_id and s.status = 'synthesised')
  group by f.id, n.participant_id;
$$;

revoke all on function public.get_finding_observers(uuid) from public;
grant execute on function public.get_finding_observers(uuid) to anon, authenticated;


-- Look a session up BY CODE before you are a participant of it.
-- This replaces Build 1's `sessions_select using (true)` policy, which let any
-- holder of the anon key list every session. The join code is the capability:
-- you must already hold the exact code to get exactly one row back, and the
-- row tells you nothing you could not learn by joining. No enumeration path:
-- no wildcard, no prefix, no "list mine", at most one row.
--
-- The code is normalised to upper(trim(p_code)) so " grvdem " and "GRVDEM"
-- resolve the same way the code input on S3 (GROVE-MASTER.md §8.15) does.
-- join_code is returned so the client can echo the canonical form; the
-- caller already holds it, so nothing new is revealed.
--
-- Return type: session metadata only. No note body can appear here.
create or replace function public.lookup_session_by_code(p_code text)
returns table (
  id                uuid,
  title             text,
  research_question text,
  status            text,
  join_code         text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.title, s.research_question, s.status, s.join_code
  from public.sessions s
  where s.join_code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.lookup_session_by_code(text) from public;
grant execute on function public.lookup_session_by_code(text) to anon, authenticated;
