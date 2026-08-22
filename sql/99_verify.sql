-- ============================================================
-- Grove — 99_verify.sql
-- Run after EVERY stage of 03_rls.sql, and once more before the demo.
-- Each check says which stage it needs. Read the output. Do not skip it.
--
-- Two ways to run each check:
--   (a) THE REAL THING — the anon key over REST, from a shell. This is what
--       the browser does. The curl lines are in the comments.
--   (b) THE SQL EDITOR STAND-IN — `set local role` plus a fake JWT claim,
--       inside a transaction that is rolled back. auth.uid() reads the `sub`
--       of request.jwt.claims, which is exactly how PostgREST hands it in.
--       The SQL editor runs as postgres, which is a member of anon and
--       authenticated, so the role switch is allowed. ROLLBACK at the end
--       undoes every write. Checks that EXPECT an error run it inside a
--       DO block and record the outcome in a temp table, so one expected
--       failure does not abort the rest of the script.
--
-- Shell setup for (a). The anon key is public by design; the JWT is a
-- throwaway anonymous sign-in (Auth → Providers → Anonymous sign-ins: on).
-- Anonymous sign-ins carry the `authenticated` role in the JWT.
--
--   URL=https://<ref>.supabase.co
--   ANON=<VITE_SUPABASE_ANON_KEY>
--   JWT=$(curl -s -X POST "$URL/auth/v1/signup" -H "apikey: $ANON" \
--          -H "Content-Type: application/json" -d '{}' | jq -r .access_token)
--   H=(-H "apikey: $ANON" -H "Authorization: Bearer $JWT")
--
-- Checks that say "as observer B" need B's JWT instead: join GRVDEM in the
-- app and lift the access token from devtools (Application → Local Storage),
-- exactly as CHECK 5 describes.
--
-- Demo fixture ids (04_demo_seed.sql):
--   session   9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71   join code GRVDEM
--   observer A  a1111111-1111-4111-8111-111111111111  Priya R.
--   observer B  a2222222-2222-4222-8222-222222222222  Arjun M.
--   observer C  a3333333-3333-4333-8333-333333333333  Nikhil S.
-- ============================================================


-- ============================================================
-- CHECK 0 — the functions exist and are SECURITY DEFINER   (after 02)
-- Seven callable functions plus the colour trigger function. gen_join_code
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
         'join_session',
         'rls_status',
         'assign_colour_index'
       )
order  by p.proname;
-- Expected: exactly 8 rows, security_definer = true and search_path_pinned =
-- true on every one. Fewer rows means 02_functions.sql was not re-run after
-- the schema; a false means someone edited a function header. Stop and fix.

-- No SECURITY DEFINER function in public can return a note body, by
-- construction (02_functions.sql header rule). Two nets, and both must come
-- back empty:
--   · the declared result type names notes, a set, json, or an untyped
--     record — any of which could smuggle a body column through;
--   · the source reads a body column, selects `*`, or folds rows into json,
--     arrays or strings, which is how a body ends up in a column that is
--     not called body.
select p.proname,
       pg_get_function_result(p.oid) as returns,
       p.prosrc ~* '(body|select\s*\*|to_jsonb|row_to_json|jsonb_agg|string_agg|array_agg)'
         as source_flagged
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  p.prosecdef
  and  (   pg_get_function_result(p.oid) ~* '(notes|setof|json|jsonb|record)'
        or p.prosrc ~* '(body|select\s*\*|to_jsonb|row_to_json|jsonb_agg|string_agg|array_agg)' );
-- Expected: 0 rows. Any row here is a leak by construction. Do not widen the
-- patterns to make a row disappear; rewrite the function it names.

-- Row-level security is actually enabled — the same four booleans that
-- /api/health relays from public.rls_status().
select c.relname                                     as table_name,
       c.relrowsecurity                              as rls_enabled
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
  and  c.relname in ('sessions', 'participants', 'notes', 'findings')
order  by c.relname;
-- Expected after S5: 4 rows, rls_enabled = true on every one. Each stage of
-- 03_rls.sql flips one table: findings (S2), sessions (S3), participants
-- (S4), notes (S5). A false on notes after S5 means the rollback block was
-- run: no public URL until it reads true again (sql/README.md).


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
-- CHECK 4 — two joins through join_session() get colours 0 and 1  (after S4)
-- Joining is public.join_session() only: the client cannot send a
-- colour_index at all, and a plain (non security definer) trigger would see
-- zero rows under the caller's RLS at the moment of joining and hand both
-- joiners colour 0. Joining twice returns the one existing row. Everything
-- is rolled back.
-- (a) Join the same session from two incognito windows; the rail must show
--     two different colours. Two tabs of ONE profile are ONE anon user and
--     get the same participant row back, not an error.
-- (b)
-- ============================================================
begin;
insert into public.sessions (id, title, research_question, join_code, created_by)
values ('00000000-0000-4000-8000-0000000000c0', 'verify colour trigger',
        'do two joins get colours 0 and 1', 'CHECK4', gen_random_uuid());

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
set local role authenticated;
select display_name, colour_index from public.join_session(' check4 ', '  Verify A  ');
-- Expected: Verify A 0. Code and name are trimmed, code upper-cased.

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
select display_name, colour_index from public.join_session('CHECK4', 'Verify B');
-- Expected: Verify B 1.

select display_name, colour_index from public.join_session('CHECK4', 'Verify B renamed');
-- Expected: Verify B 1 — the SAME row. A second join changes nothing, not
-- even the display name.

reset role;
select display_name, colour_index
from   public.participants
where  session_id = '00000000-0000-4000-8000-0000000000c0'
order  by joined_at, display_name;
-- Expected: Verify A 0, Verify B 1. Two zeros means assign_colour_index lost
-- SECURITY DEFINER. Three rows means the second join inserted a duplicate.
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


-- ============================================================
-- CHECK 8 — the grants match the design   (after S4; notes rows after S5)
-- Straight from the catalogue, no role switch needed. This is the paper
-- form of CHECKs 9–11: the client roles cannot INSERT participants at all,
-- and can UPDATE only the columns the app has a reason to touch.
-- ============================================================
select has_table_privilege('anon',          'public.participants', 'insert') as anon_can_insert,
       has_table_privilege('authenticated', 'public.participants', 'insert') as authenticated_can_insert,
       has_function_privilege('authenticated', 'public.join_session(text, text)', 'execute') as authenticated_can_join,
       has_function_privilege('anon',          'public.join_session(text, text)', 'execute') as anon_can_join;
-- Expected: false · false · true · false. Joining is join_session(), and
-- only for a signed-in (anonymous or otherwise) user.

select tbl, col,
       has_column_privilege('authenticated', tbl, col, 'update') as authenticated_can_update,
       has_column_privilege('anon',          tbl, col, 'update') as anon_can_update
from (
  select 'public.participants' as tbl,
         unnest(array['display_name', 'last_seen_at', 'session_id', 'user_id', 'colour_index']) as col
  union all
  select 'public.notes',
         unnest(array['body', 'kind', 'session_id', 'participant_id'])
) cols
order by tbl, col;
-- Expected: true · true on display_name, last_seen_at (participants) and
-- body, kind (notes); false · false on the other five. A true on
-- participants.colour_index, participants.session_id, participants.user_id,
-- notes.session_id or notes.participant_id means the column-limited grant
-- in 03_rls.sql was widened. Stop and fix.


-- ============================================================
-- CHECK 9 — a direct INSERT on participants is rejected   (after S4)
-- The only way into a session is public.join_session(). The INSERT
-- privilege itself is revoked, so this fails on the grant before any
-- policy is consulted.
-- (a) As observer B:
--     curl -s -o /dev/null -w '%{http_code}\n' "$URL/rest/v1/participants" "${H[@]}" \
--       -H "Content-Type: application/json" \
--       -d '{"session_id":"9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71","display_name":"Direct","user_id":"<B user_id>"}'
--     Expected: 403 (code 42501, permission denied). Never 201. Any user_id
--     gives the same answer; the grant is checked before the row is looked at.
-- (b) The DO block records the outcome instead of erroring, so the script
--     carries on either way.
-- ============================================================
begin;
create temp table verify_out (check_name text, outcome text);

insert into public.sessions (id, title, research_question, join_code, created_by)
values ('00000000-0000-4000-8000-0000000000c1', 'verify write paths',
        'does the participants insert revoke hold', 'CHECK9', gen_random_uuid());

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  (select user_id from public.participants
             where id = 'a2222222-2222-4222-8222-222222222222'),
    'role', 'authenticated'
  )::text,
  true
);

do $$
begin
  begin
    set local role authenticated;
    insert into public.participants (session_id, display_name, user_id)
    values ('00000000-0000-4000-8000-0000000000c1', 'Direct insert', auth.uid());
    reset role;
    insert into verify_out values ('9 direct insert on participants',
      'FAILED: the row went in. The S4 revoke is missing.');
  exception
    when insufficient_privilege then
      insert into verify_out values ('9 direct insert on participants',
        'OK: rejected — ' || sqlerrm);
    when others then
      insert into verify_out values ('9 direct insert on participants',
        'UNEXPECTED: ' || sqlerrm);
  end;
end
$$;

select * from verify_out;
-- Expected: OK: rejected — permission denied for table participants.
rollback;


-- ============================================================
-- CHECK 10 — a note cannot borrow a participant row from another session,
--            and CHECK 11 — notes.session_id is not writable   (after S5)
-- B joins a SECOND session legitimately first, so Build 1's policy
-- (your participant row + any session you are in, checked separately)
-- would have allowed both writes. The shipped policy and the column grant
-- must reject them.
-- (a) As observer B:
--     curl -s "$URL/rest/v1/notes" "${H[@]}" -H "Content-Type: application/json" \
--       -d '{"session_id":"<session A>","participant_id":"a2222222-2222-4222-8222-222222222222","body":"x"}'
--     Expected: 403, new row violates row-level security policy.
--     curl -s -X PATCH "$URL/rest/v1/notes?id=eq.<own note id>" "${H[@]}" \
--       -H "Content-Type: application/json" -d '{"session_id":"<session A>"}'
--     Expected: 403 (code 42501): session_id is outside the column grant.
-- (b)
-- ============================================================
begin;
create temp table verify_out (check_name text, outcome text);

insert into public.sessions (id, title, research_question, join_code, created_by)
values ('00000000-0000-4000-8000-0000000000c2', 'verify note scope',
        'can a note cross sessions', 'CHECKA', gen_random_uuid());

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  (select user_id from public.participants
             where id = 'a2222222-2222-4222-8222-222222222222'),
    'role', 'authenticated'
  )::text,
  true
);

-- CHECK 10: B is in both sessions; the participant row named in the insert
-- is B's own — but it belongs to GRVDEM, not to CHECKA. Must be rejected.
do $$
begin
  begin
    set local role authenticated;
    perform public.join_session('CHECKA', 'Arjun M.');   -- legitimate second join
    insert into public.notes (session_id, participant_id, body)
    values ('00000000-0000-4000-8000-0000000000c2',
            'a2222222-2222-4222-8222-222222222222', 'x');
    reset role;
    insert into verify_out values ('10 cross-session note insert',
      'FAILED: the note went in under a foreign session. S5 policy is loose.');
  exception
    when insufficient_privilege then
      insert into verify_out values ('10 cross-session note insert',
        'OK: rejected — ' || sqlerrm);
    when others then
      insert into verify_out values ('10 cross-session note insert',
        'UNEXPECTED: ' || sqlerrm);
  end;
end
$$;

-- CHECK 11: B PATCHes their own note's session_id. The column is outside
-- the UPDATE grant, so this dies on permission, not on policy.
do $$
declare
  v_note uuid;
begin
  begin
    set local role authenticated;
    select n.id into v_note
    from   public.notes n
    where  n.participant_id = 'a2222222-2222-4222-8222-222222222222'
    order  by n.created_at
    limit  1;
    update public.notes
    set    session_id = '00000000-0000-4000-8000-0000000000c2'
    where  id = v_note;
    reset role;
    insert into verify_out values ('11 patch notes.session_id',
      'FAILED: session_id moved. The notes column grant was widened.');
  exception
    when insufficient_privilege then
      insert into verify_out values ('11 patch notes.session_id',
        'OK: rejected — ' || sqlerrm);
    when others then
      insert into verify_out values ('11 patch notes.session_id',
        'UNEXPECTED: ' || sqlerrm);
  end;
end
$$;

select * from verify_out;
-- Expected, two rows, both OK:
--   10 … new row violates row-level security policy for table "notes"
--   11 … permission denied for table notes
-- A "permission denied" on 10 is also a rejection, but says the INSERT
-- grant on notes is gone entirely — the capture pad would be broken; look
-- at CHECK 8 and the S5 grants.

-- The legitimate writes still work, same role, still B:
set local role authenticated;
with ping as (
  update public.participants
  set    last_seen_at = now()
  where  user_id = auth.uid()
    and  session_id = '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71'
  returning 1
)
select count(*) as presence_pings from ping;
-- Expected: 1. The presence ping survives the column-limited grant.
with edit as (
  update public.notes
  set    kind = kind
  where  participant_id = 'a2222222-2222-4222-8222-222222222222'
  returning 1
)
select count(*) as own_notes_touched from edit;
-- Expected: 8. Editing body and kind on your own notes still works.
reset role;
rollback;


-- ============================================================
-- CHECK 12 — rls_status() lists exactly four rows   (after 02; watch after S5)
-- This is the function /api/health calls with the service role. Anyone may
-- call it; it returns booleans and table names, nothing else.
-- (a) curl -s -X POST "$URL/rest/v1/rpc/rls_status" "${H[@]}" \
--       -H "Content-Type: application/json" -d '{}'
--     Expected: four objects — sessions, participants, notes, findings —
--     and after S5 every "enabled" is true.
-- (b)
-- ============================================================
begin;
set local role anon;
select * from public.rls_status();
-- Expected: 4 rows, in the order sessions, participants, notes, findings.
-- After S5: enabled = true on all four. "rls": {"notes": true} in
-- /api/health is this row. No public URL until it is true.
rollback;
