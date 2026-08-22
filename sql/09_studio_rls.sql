-- ============================================================
-- Grove Studio — row level security for spaces and notes.
--
-- THE ONE RULE THIS FILE EXISTS TO ENFORCE:
--   A note whose visibility is 'private' is readable by its author and by
--   NOBODY else — not another member, not the space owner, not by any route,
--   including a hand-crafted PostgREST request with the public key.
--   A note whose visibility is 'shared' is readable by every member of that
--   space, which is what the person chose when they shared it.
--
-- Run AFTER 08_studio.sql, and after the app works with RLS off.
-- Run each stage separately and re-test in between.
--
-- This file MUST NOT touch the policies on public.notes (the session lanes).
-- Those live in 03_rls.sql and are a separate promise.
-- ============================================================

-- ---------- STAGE T1: profiles ----------
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
-- Your own profile, and the profiles of people you actually share a space
-- with. Not every user in the database — a signed-in stranger has no business
-- enumerating names and avatars.
create policy profiles_select on public.profiles
  for select to authenticated
  using ( user_id = auth.uid() or public.shares_a_space_with(user_id) );

drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles
  for insert to authenticated with check ( user_id = auth.uid() );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );


-- ---------- STAGE T2: projects ----------
alter table public.projects enable row level security;

-- You can read a space you belong to. Lookup by join code goes through
-- join_project(), which is SECURITY DEFINER — so a code still works for a
-- non-member, but the table itself is not browsable.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated using ( public.is_project_member(id) );

-- No INSERT policy: create_project() is the only way in, so a space always
-- has an owner. No DELETE policy: spaces are not deleted from the client.
revoke insert, delete on public.projects from anon, authenticated;

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using ( exists (select 1 from public.project_members m
                   where m.project_id = projects.id and m.user_id = auth.uid()
                     and m.role = 'owner') );
revoke update on public.projects from anon, authenticated;
grant  update (name, description) on public.projects to authenticated;


-- ---------- STAGE T3: project_members ----------
alter table public.project_members enable row level security;

drop policy if exists pmembers_select on public.project_members;
create policy pmembers_select on public.project_members
  for select to authenticated
  using ( public.is_project_member(project_id) or user_id = auth.uid() );

-- join_project() is the only write path, exactly as join_session() is for
-- sessions. Revoking the privilege (not just omitting a policy) means a later
-- file that re-adds a policy still cannot insert.
revoke insert on public.project_members from anon, authenticated;

drop policy if exists pmembers_update on public.project_members;
create policy pmembers_update on public.project_members
  for update to authenticated using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
-- project_id, user_id, colour_index and role are not grantable, so a member
-- cannot move themselves between spaces or promote themselves to owner.
revoke update on public.project_members from anon, authenticated;
grant  update (display_name, last_seen_at) on public.project_members to authenticated;

drop policy if exists pmembers_delete on public.project_members;
create policy pmembers_delete on public.project_members
  for delete to authenticated using ( user_id = auth.uid() );   -- leaving a space


-- ---------- STAGE T4: space_notes — THE PRIVATE/SHARED BOUNDARY ----------
-- Run this last and re-test immediately: as member B, a private note of A's
-- must be invisible by every route.
alter table public.space_notes enable row level security;

drop policy if exists space_notes_select on public.space_notes;
create policy space_notes_select on public.space_notes
  for select to authenticated
  using (
    -- your own note, private or shared
    author_id in (select m.id from public.project_members m where m.user_id = auth.uid())
    -- or a shared note in a space you belong to
    or (visibility = 'shared' and public.is_project_member(project_id))
  );

drop policy if exists space_notes_insert on public.space_notes;
create policy space_notes_insert on public.space_notes
  for insert to authenticated
  with check (
    -- the author row must be YOURS and must belong to THIS space, so a note
    -- can never be written into a space you are not a member of
    exists (select 1 from public.project_members m
             where m.id = space_notes.author_id
               and m.user_id = auth.uid()
               and m.project_id = space_notes.project_id)
  );

drop policy if exists space_notes_update on public.space_notes;
create policy space_notes_update on public.space_notes
  for update to authenticated
  using (
    exists (select 1 from public.project_members m
             where m.id = space_notes.author_id
               and m.user_id = auth.uid()
               and m.project_id = space_notes.project_id)
  )
  with check (
    exists (select 1 from public.project_members m
             where m.id = space_notes.author_id
               and m.user_id = auth.uid()
               and m.project_id = space_notes.project_id)
  );

-- project_id and author_id are not grantable: a note cannot be moved to
-- another space or re-attributed to someone else, whatever a policy says.
revoke update on public.space_notes from anon, authenticated;
grant  update (title, body, visibility, shared_at) on public.space_notes to authenticated;

drop policy if exists space_notes_delete on public.space_notes;
create policy space_notes_delete on public.space_notes
  for delete to authenticated
  using (
    author_id in (select m.id from public.project_members m where m.user_id = auth.uid())
  );


-- ============================================================
-- VERIFY — do not skip. As member B, with the public key and B's JWT:
--
--   -- must return ZERO of A's private notes:
--   select id, title, body from space_notes where project_id = '<space>';
--   -- must return only shared ones plus B's own.
--
--   -- must be rejected (privilege revoked):
--   insert into project_members (project_id, user_id, display_name)
--     values ('<space>', '<B>', 'sneak');
--
--   -- must be rejected (column not grantable):
--   update space_notes set project_id = '<other space>' where id = '<B own note>';
--
-- If a private note of A's is readable by B, the promise on the tin is false
-- and this must not ship.
-- ============================================================

-- ---------- ROLLBACK (uncomment one line at a time if a stage breaks) ----------
-- alter table public.space_notes     disable row level security;
-- alter table public.project_members disable row level security;
-- alter table public.projects        disable row level security;
-- alter table public.profiles        disable row level security;
-- grant insert on public.project_members to authenticated;
-- grant update on public.space_notes     to authenticated;
