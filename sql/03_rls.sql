-- ============================================================
-- Grove — 03_rls.sql
-- DO NOT run this file in one go. Apply ONE STAGE at a time, in order,
-- retesting the whole app after each stage and committing after each green run.
-- Run sql/99_verify.sql after every stage.
--
--   S2 findings  →  S3 sessions  →  S4 participants  →  S5 notes
--
-- If a stage breaks the demo and you cannot fix it in 15 minutes:
--   alter table public.<table> disable row level security;
-- commit, move on, and say so honestly in the deck. A working demo with RLS
-- off beats a broken demo with perfect policies.
--
-- Prerequisite: 02_functions.sql has already been run.
-- Do NOT enable any of this before the polling sync path works end to end.
-- ============================================================


-- ============================================================
-- STAGE S2 — findings
-- Read: PUBLIC, once the session is synthesised. This is the
--       absent-stakeholder path: the findings link must load without
--       joining, signing up or entering a code.
--       PRIVACY TRADEOFF, stated explicitly: anyone with the link can read
--       the findings of a synthesised session. Note bodies stay private (S5).
-- Write: nobody from the client. Only api/synthesise.py, which uses the
--        service-role key and bypasses RLS entirely.
-- ============================================================
alter table public.findings enable row level security;

drop policy if exists findings_select on public.findings;
create policy findings_select
  on public.findings
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = findings.session_id
        and s.status = 'synthesised'
    )
  );
-- Deliberately NO insert/update/delete policy for anon.


-- ============================================================
-- STAGE S3 — sessions
-- Read: participants of the session, the person who created it, and anyone
--       once it is synthesised (the absent-stakeholder path, matching S2).
--       Looking a session up BY CODE before you are a participant of it
--       goes through public.lookup_session_by_code() in 02_functions.sql:
--       SECURITY DEFINER, exact code in, at most one row out. The join code
--       is still the capability; the table is no longer a directory.
-- Write: create your own; update only what you created.
-- ============================================================
alter table public.sessions enable row level security;

-- Build 1 shipped `using ( true )` here, reasoning that you must be able to
-- look a session up by code before you are in it. True, but `using (true)`
-- let any holder of the anon key — which is public by design — list EVERY
-- session: title, research question and join code, in one unauthenticated
-- request. That turned "the join code is the capability" into a public
-- directory of capabilities. Lookup-by-code now has its own narrow function;
-- the table itself is readable only by the people in the room, the person
-- who opened it, or anyone once the session is synthesised.
drop policy if exists sessions_select on public.sessions;
create policy sessions_select
  on public.sessions for select to anon, authenticated
  using ( public.is_participant(id) or created_by = auth.uid() or status = 'synthesised' );

drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert
  on public.sessions for insert to anon, authenticated
  with check ( created_by = auth.uid() );

drop policy if exists sessions_update on public.sessions;
create policy sessions_update
  on public.sessions for update to anon, authenticated
  using      ( created_by = auth.uid() )
  with check ( created_by = auth.uid() );
-- No DELETE policy. Sessions are not deleted from the client.


-- ============================================================
-- STAGE S4 — participants
-- Read: participants of the same session (this powers the roster).
-- Write: the client does not INSERT here at all. Joining goes through
--        public.join_session() (02_functions.sql), SECURITY DEFINER, the
--        only write path; the INSERT privilege itself is revoked below.
--        UPDATE is limited to display_name and last_seen_at on your own
--        row, so session_id, user_id and colour_index are immutable from
--        the client. DELETE: your own row.
-- colour_index is set by trg_participants_colour (01_schema.sql), which is
-- SECURITY DEFINER precisely so that this stage's select policy does not
-- hide the existing rows from the count at the moment you join.
-- ============================================================
alter table public.participants enable row level security;

drop policy if exists participants_select on public.participants;
create policy participants_select
  on public.participants for select to anon, authenticated
  using ( public.is_participant(session_id) or user_id = auth.uid() );
  -- the `or user_id = auth.uid()` arm matters at the moment you join,
  -- when your own row is what makes is_participant() true.

-- NO participants_insert policy, on purpose, and no INSERT privilege
-- either. Build 1 had `with check (user_id = auth.uid())`, which let the
-- client write its own session_id and display_name straight onto the table.
-- Joining is public.join_session() (02_functions.sql) and nothing else.
-- Revoking the privilege outright means a later file that re-added a policy
-- would still hit the missing grant.
drop policy if exists participants_insert on public.participants;
revoke insert on public.participants from anon, authenticated;

-- UPDATE: your own row, and only the two columns the client has any reason
-- to touch — display_name (rename) and last_seen_at (presence ping).
-- Revoking the table-level privilege and granting it back per column makes
-- session_id, user_id and colour_index immutable from the client whatever
-- any policy says.
drop policy if exists participants_update on public.participants;
create policy participants_update
  on public.participants for update to anon, authenticated
  using      ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

revoke update on public.participants from anon, authenticated;
grant  update (display_name, last_seen_at) on public.participants to anon, authenticated;

drop policy if exists participants_delete on public.participants;
create policy participants_delete
  on public.participants for delete to anon, authenticated
  using ( user_id = auth.uid() );


-- ============================================================
-- MVP+ files (05/06) must never modify these policies.
-- The notes policies below ARE the independence invariant
-- (GROVE-MASTER.md §4.2). Later files may add tables — actions, comments,
-- notifications — and their own policies. They must not drop, replace,
-- loosen, widen or add to anything on public.notes, and they must not add a
-- SECURITY DEFINER function that returns notes.body. If a later feature
-- appears to need another observer's note text, it is the feature that is
-- wrong.
-- ============================================================

-- ============================================================
-- STAGE S5 — notes   ← THE INDEPENDENCE INVARIANT, ENFORCED IN THE DATABASE
-- You may read ONLY your own notes. Not "you should not"; you CANNOT.
-- Every write policy requires the participant row to be YOURS and to belong
-- to the NOTE'S session. Build 1 checked those two facts separately, which
-- let a member of two sessions file a note in one under their participant
-- row from the other.
-- ============================================================
alter table public.notes enable row level security;

drop policy if exists notes_select_own on public.notes;
create policy notes_select_own
  on public.notes for select to anon, authenticated
  using (
    participant_id in (
      select pp.id from public.participants pp where pp.user_id = auth.uid()
    )
  );

drop policy if exists notes_insert_own on public.notes;
create policy notes_insert_own
  on public.notes for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.participants pp
      where pp.id         = notes.participant_id
        and pp.user_id    = auth.uid()
        and pp.session_id = notes.session_id
    )
  );

drop policy if exists notes_update_own on public.notes;
create policy notes_update_own
  on public.notes for update to anon, authenticated
  using (
    exists (
      select 1 from public.participants pp
      where pp.id         = notes.participant_id
        and pp.user_id    = auth.uid()
        and pp.session_id = notes.session_id
    )
  )
  with check (
    exists (
      select 1 from public.participants pp
      where pp.id         = notes.participant_id
        and pp.user_id    = auth.uid()
        and pp.session_id = notes.session_id
    )
  );

drop policy if exists notes_delete_own on public.notes;
create policy notes_delete_own
  on public.notes for delete to anon, authenticated
  using (
    exists (
      select 1 from public.participants pp
      where pp.id         = notes.participant_id
        and pp.user_id    = auth.uid()
        and pp.session_id = notes.session_id
    )
  );

-- UPDATE on notes is limited to body and kind. session_id and
-- participant_id are not grantable from the client, so a note cannot be
-- moved to another session or re-attributed, whatever any policy says.
-- id, created_at and updated_at belong to the database (trg_notes_touch
-- sets updated_at).
revoke update on public.notes from anon, authenticated;
grant  update (body, kind) on public.notes to anon, authenticated;


-- ============================================================
-- ROLLBACK, if a stage breaks the demo and 15 minutes are gone
-- ============================================================
-- alter table public.notes        disable row level security;
-- alter table public.participants disable row level security;
-- alter table public.sessions     disable row level security;
-- alter table public.findings     disable row level security;
--
-- The grants S4 and S5 narrowed, should the rollback need them too. The
-- shipping client never inserts into participants directly and never
-- updates a column outside the grants, so disabling RLS alone is normally
-- enough; re-grant only if you have also rolled the client back to direct
-- table writes.
-- grant insert on public.participants to anon, authenticated;
-- grant update on public.participants to anon, authenticated;
-- grant update on public.notes        to anon, authenticated;
