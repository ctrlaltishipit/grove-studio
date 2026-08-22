-- ============================================================
-- Grove — 04_rls_staged.sql
-- DO NOT run this file in one go. Apply ONE STAGE at a time, in order,
-- retesting the whole app after each stage and committing after each green run.
--
--   S2 findings  →  S3 sessions  →  S4 participants  →  S5 notes
--
-- If a stage breaks the demo and you cannot fix it in 15 minutes:
--   alter table public.<table> disable row level security;
-- commit, move on, and say so honestly in the deck. A working demo with RLS
-- off beats a broken demo with perfect policies.
--
-- Prerequisite: 03_functions.sql has already been run.
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
-- Any signed-in anon user may SELECT a session: you must be able to look a
-- session up BY CODE before you are a participant of it. The join code is
-- the capability.
-- ============================================================
alter table public.sessions enable row level security;

drop policy if exists sessions_select on public.sessions;
create policy sessions_select
  on public.sessions for select to anon, authenticated
  using ( true );

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
-- Write: your own row only.
-- ============================================================
alter table public.participants enable row level security;

drop policy if exists participants_select on public.participants;
create policy participants_select
  on public.participants for select to anon, authenticated
  using ( public.is_participant(session_id) or user_id = auth.uid() );
  -- the `or user_id = auth.uid()` arm matters at the moment you join,
  -- when your own row is what makes is_participant() true.

drop policy if exists participants_insert on public.participants;
create policy participants_insert
  on public.participants for insert to anon, authenticated
  with check ( user_id = auth.uid() );

drop policy if exists participants_update on public.participants;
create policy participants_update
  on public.participants for update to anon, authenticated
  using      ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

drop policy if exists participants_delete on public.participants;
create policy participants_delete
  on public.participants for delete to anon, authenticated
  using ( user_id = auth.uid() );


-- ============================================================
-- STAGE S5 — notes   ← THE INDEPENDENCE INVARIANT, ENFORCED IN THE DATABASE
-- You may read ONLY your own notes. Not "you should not"; you CANNOT.
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
    participant_id in (
      select pp.id from public.participants pp where pp.user_id = auth.uid()
    )
    and public.is_participant(session_id)
  );

drop policy if exists notes_update_own on public.notes;
create policy notes_update_own
  on public.notes for update to anon, authenticated
  using      ( participant_id in (select pp.id from public.participants pp where pp.user_id = auth.uid()) )
  with check ( participant_id in (select pp.id from public.participants pp where pp.user_id = auth.uid()) );

drop policy if exists notes_delete_own on public.notes;
create policy notes_delete_own
  on public.notes for delete to anon, authenticated
  using ( participant_id in (select pp.id from public.participants pp where pp.user_id = auth.uid()) );


-- ============================================================
-- ROLLBACK, if a stage breaks the demo and 15 minutes are gone
-- ============================================================
-- alter table public.notes        disable row level security;
-- alter table public.participants disable row level security;
-- alter table public.sessions     disable row level security;
-- alter table public.findings     disable row level security;
