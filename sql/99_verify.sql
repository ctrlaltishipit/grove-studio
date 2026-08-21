-- ============================================================
-- Grove — 99_verify.sql
-- Run after EVERY stage of 03_rls.sql, and once more before the demo.
-- Each check says which stage it needs. Read the output. Do not skip it.
--
-- Two ways to run each check:
--   (a) THE REAL THING — the anon key over REST, from a shell. This is what
--       the browser does. The curl lines are in the comments.
--   (b) THE SQL EDITOR STAND-IN — `set local role anon` plus a fake JWT claim,
--       inside a transaction that is rolled back. auth.uid() reads the `sub`
--       of request.jwt.claims, which is exactly how PostgREST hands it in.
--       The SQL editor runs as postgres, which is a member of anon, so the
--       role switch is allowed. ROLLBACK at the end undoes every write.
--
-- Shell setup for (a). The anon key is public by design; the JWT is a
-- throwaway anonymous sign-in (Auth → Providers → Anonymous sign-ins: on).
--
--   URL=https://<ref>.supabase.co
--   ANON=<VITE_SUPABASE_ANON_KEY>
--   JWT=$(curl -s -X POST "$URL/auth/v1/signup" -H "apikey: $ANON" \
--          -H "Content-Type: application/json" -d '{}' | jq -r .access_token)
--   H=(-H "apikey: $ANON" -H "Authorization: Bearer $JWT")
--
-- Demo fixture ids (04_demo_seed.sql):
--   session   9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71   join code GRVDEM
--   observer A  a1111111-1111-4111-8111-111111111111  Priya R.
--   observer B  a2222222-2222-4222-8222-222222222222  Arjun M.
--   observer C  a3333333-3333-4333-8333-333333333333  Nikhil S.
-- ============================================================


-- ============================================================
-- CHECK 0 — the functions exist and are SECURITY DEFINER   (after 02)
-- Five callable functions plus the colour trigger function. gen_join_code
-- and touch_updated_at also live in public but are not security definer and
-- are not listed here on purpose.
-- ============================================================
select p.proname,
       p.prosecdef                                   as security_definer,
       'search_path=public' = any (p.proconfig)      as search_path_pinned
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  p.proname in (
         'is_participant',
         'get_roster',
         'get_public_roster',
         'get_finding_observers',
         'lookup_session_by_code',
         'assign_colour_index'
       )
order  by p.proname;
-- Expected: exactly 6 rows, security_definer = true and search_path_pinned =
-- true on every one. Five rows means 02_functions.sql was not re-run after
-- the schema; a false means someone edited a function header. Stop and fix.

-- Belt and braces: no SECURITY DEFINER function in public returns a column
-- that could carry a note body. (02_functions.sql header rule.)
select p.proname, pg_get_function_result(p.oid) as returns
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  p.prosecdef
  and  pg_get_function_result(p.oid) ilike '%body%';
-- Expected: 0 rows. Any row here is a leak by construction.


-- ============================================================
-- CHECK 1 — notes is NOT in the realtime publication   (after 01, and always)
-- See sql/README.md for why 02_publication.sql from Build 1 was not carried:
-- Realtime does not apply RLS to DELETE events, and with replica identity
-- full the old row, body included, rides in the payload.
-- ============================================================
select * from pg_publication_tables where pubname = 'supabase_realtime';
-- Expected in MVP: 0 rows. After v1's 07_realtime.sql: comments, actions,
-- notifications only. `notes` must NEVER appear. Nor should participants,
-- sessions or findings in MVP; polling is the shipping path.

select count(*) = 0 as notes_not_published
from   pg_publication_tables
where  pubname = 'supabase_realtime' and tablename = 'notes';
-- Expected: true. If false:
--   alter publication supabase_realtime drop table public.notes;
-- and find out who added it.

select c.relname, c.relreplident
from   pg_class c join pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public' and c.relname = 'notes';
-- Expected: relreplident = 'd' (default, primary key only). 'f' (full) means
-- 02_publication.sql was run; revert with
--   alter table public.notes replica identity default;


-- ============================================================
-- CHECK 2 — lookup by code works for a stranger   (after 02; re-run after S3)
-- (a) curl -s "$URL/rest/v1/rpc/lookup_session_by_code" "${H[@]}" \
--       -H "Content-Type: application/json" -d '{"p_code":" grvdem "}'
--     Expected: one object, id 9e1c7f30-…, join_code "GRVDEM" (normalised).
-- (b)
-- ============================================================
begin;
set local role anon;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000dead","role":"anon"}';
select id, title, status, join_code from public.lookup_session_by_code(' grvdem ');
-- Expected: 1 row, join_code GRVDEM. Whitespace and case are normalised.
select id from public.lookup_session_by_code('ZZZZZZ');
-- Expected: 0 rows. No error, no hint.
rollback;


-- ============================================================
-- CHECK 3 — sessions?select=join_code as a stranger → 0 rows   (after S3)
-- THE CHECK THAT BUILD 1 FAILED. A fresh anonymous user who is in no session
-- must not be able to list any live session, let alone its join code.
-- (a) curl -s "$URL/rest/v1/sessions?select=join_code,title&status=eq.live" "${H[@]}"
--     Expected: []   (an empty JSON array, HTTP 200)
-- (b)
-- ============================================================
begin;
set local role anon;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000dead","role":"anon"}';
select join_code, title from public.sessions where status = 'live';
-- Expected: 0 rows. GRVDEM is live and must NOT be here.
select count(*) as synthesised_visible_by_design from public.sessions where status = 'synthesised';
-- Expected: the number of synthesised sessions, possibly 0. These are public
-- on purpose (absent-stakeholder path, same rule as findings_select).
rollback;


-- ============================================================
-- CHECK 4 — two joins after S4 get colours 0 and 1   (after S4)
-- A plain (non security definer) trigger would see zero rows under the
-- caller's RLS at the moment of joining and hand both joiners colour 0.
-- Both inserts below send colour_index = 4 on purpose; the trigger must
-- ignore it. Everything is rolled back.
-- (a) Join the same session from two incognito windows; the rail must show
--     two different colours. Two tabs of ONE profile are ONE anon user and
--     will hit the (session_id, user_id) unique constraint instead.
-- (b)
-- ============================================================
begin;
insert into public.sessions (id, title, research_question, created_by)
values ('00000000-0000-4000-8000-0000000000c0', 'verify colour trigger',
        'do two joins get colours 0 and 1', gen_random_uuid());

set local role anon;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"anon"}';
insert into public.participants (session_id, display_name, user_id, colour_index)
values ('00000000-0000-4000-8000-0000000000c0', 'Verify A', '00000000-0000-4000-8000-0000000000a1', 4);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"anon"}';
insert into public.participants (session_id, display_name, user_id, colour_index)
values ('00000000-0000-4000-8000-0000000000c0', 'Verify B', '00000000-0000-4000-8000-0000000000a2', 4);

reset role;
select display_name, colour_index
from   public.participants
where  session_id = '00000000-0000-4000-8000-0000000000c0'
order  by joined_at, display_name;
-- Expected: Verify A 0, Verify B 1. Two zeros means assign_colour_index lost
-- SECURITY DEFINER. Two fours means the trigger is missing.
rollback;


-- ============================================================
-- CHECK 5 — as observer B, notes by session → only B's   (after S5)
-- THE INDEPENDENCE INVARIANT. Observer B asks for every note in the session
-- and gets back exactly their own eight.
-- (a) Sign in as B in the app (join GRVDEM, then read your participant row's
--     user_id from the Supabase table editor), or simply use the app's own
--     JWT from devtools. Then:
--     curl -s "$URL/rest/v1/notes?select=participant_id,body&session_id=eq.9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71" "${H[@]}"
--     Expected: 8 objects, every participant_id = a2222222-….
-- (b) The seed assigns random user_ids, so the stand-in reads B's from the
--     table before switching role.
-- ============================================================
begin;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  (select user_id from public.participants
             where id = 'a2222222-2222-4222-8222-222222222222'),
    'role', 'anon'
  )::text,
  true
);
set local role anon;

select participant_id, count(*) as notes
from   public.notes
where  session_id = '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71'
group  by participant_id;
-- Expected: exactly 1 row: a2222222-… 8. Three rows means S5 is not applied.

select count(*) = 0 as no_foreign_bodies
from   public.notes
where  session_id = '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71'
  and  participant_id <> 'a2222222-2222-4222-8222-222222222222';
-- Expected: true.

-- ------------------------------------------------------------
-- CHECK 6 — participants embedding leaks nothing   (after S5, same role)
-- PostgREST resource embedding joins through the notes.participant_id FK.
-- (a) curl -s "$URL/rest/v1/participants?select=display_name,colour_index,notes(id,body)&session_id=eq.9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71" "${H[@]}"
--     Expected: 3 participants visible (B is in the room), but `notes` is a
--     list of 8 for Arjun M. and [] for Priya R. and Nikhil S.
-- (b) The same join the embed performs, still as B:
-- ------------------------------------------------------------
select p.display_name, p.colour_index, count(n.id) as embedded_notes
from   public.participants p
left   join public.notes n on n.participant_id = p.id
where  p.session_id = '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71'
group  by p.display_name, p.colour_index
order  by p.display_name;
-- Expected: Arjun M. 1 8 · Nikhil S. 2 0 · Priya R. 0 0.
-- The roster still works, via the function that cannot return text:
select display_name, note_count from public.get_roster('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71');
-- Expected: Priya R. 8, Arjun M. 8, Nikhil S. 8 (counts for everyone, text for no one).
rollback;


-- ============================================================
-- CHECK 7 — a stranger gets nothing from the room   (after S5)
-- ============================================================
begin;
set local role anon;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000dead","role":"anon"}';
select (select count(*) from public.notes)        as notes_visible,
       (select count(*) from public.participants) as participants_visible,
       (select count(*) from public.sessions where status = 'live') as live_sessions_visible;
-- Expected: 0 · 0 · 0.
select count(*) as roster_rows from public.get_roster('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71');
-- Expected: 0. get_roster checks is_participant() itself.
rollback;
