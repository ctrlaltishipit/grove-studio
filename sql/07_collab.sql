-- =============================================================================
-- GroveStudio — 07: collaboration.
--
-- Paste into the Supabase SQL editor (dashboard → SQL Editor → New query) and
-- run once, after 06. Idempotent: re-running is harmless.
--
-- Adds, on top of the spaces backend + 06:
--   1. note_versions      — version history (who wrote what, when) + rollback
--   2. inline comments    — a comment may anchor to a line of the note
--   3. @mentions          — new notification kinds: mention, comment
--   4. granular roles     — owner | editor | member (= editor) | viewer,
--                           owner-only set_member_role(); viewers read only
--   5. per-note lock      — space_notes.edit_mode: everyone | author
-- =============================================================================

-- ---------- 1. version history ----------
create table if not exists public.note_versions (
  id          uuid        primary key default gen_random_uuid(),
  note_id     uuid        not null references public.space_notes(id) on delete cascade,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  author_user uuid        not null,
  title       text        not null default '',
  body        text        not null default '',
  summary     text        check (summary is null or char_length(summary) <= 200),
  created_at  timestamptz not null default now()
);

create index if not exists idx_note_versions_note on public.note_versions (note_id, created_at desc);

alter table public.note_versions enable row level security;

drop policy if exists note_versions_member_select on public.note_versions;
create policy note_versions_member_select on public.note_versions
  for select using (public.is_project_member(project_id));

drop policy if exists note_versions_member_insert on public.note_versions;
create policy note_versions_member_insert on public.note_versions
  for insert with check (
    public.is_project_member(project_id) and author_user = auth.uid()
  );

grant select, insert on public.note_versions to authenticated;

-- ---------- 2. inline comments: optional line anchor ----------
alter table public.note_comments add column if not exists anchor_line int;
alter table public.note_comments add column if not exists anchor_text text;

-- ---------- 3. notification kinds: mention, comment ----------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('assign', 'checkin', 'blocked', 'share', 'done', 'studio', 'mention', 'comment'));

-- ---------- 4. granular roles ----------
-- Replace whatever check constrains project_members.role with the new set.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.project_members'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.project_members drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.project_members add constraint project_members_role_check
  check (role in ('owner', 'editor', 'member', 'viewer'));

-- Can this member write notes in the space? (owner, editor, legacy member)
create or replace function public.can_edit_notes(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
     where project_id = p_project_id
       and user_id = auth.uid()
       and role in ('owner', 'editor', 'member')
  );
$$;
revoke all on function public.can_edit_notes(uuid) from public;
grant execute on function public.can_edit_notes(uuid) to authenticated;

-- Owners set other members' roles. Nobody can promote to owner or demote an
-- owner through this path.
create or replace function public.set_member_role(p_project_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('editor', 'viewer') then
    raise exception 'role must be editor or viewer';
  end if;
  if not exists (
    select 1 from public.project_members
     where project_id = p_project_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'only the space owner can change roles';
  end if;
  update public.project_members
     set role = p_role
   where project_id = p_project_id
     and user_id = p_user_id
     and role <> 'owner';
end;
$$;
revoke all on function public.set_member_role(uuid, uuid, text) from public;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- Co-editing is for members who can write; viewers read.
drop policy if exists space_notes_coedit on public.space_notes;
create policy space_notes_coedit on public.space_notes
  for update
  using (visibility = 'shared' and public.can_edit_notes(project_id))
  with check (public.can_edit_notes(project_id));

-- ---------- 5. per-note lock ----------
alter table public.space_notes add column if not exists edit_mode text not null default 'everyone';
alter table public.space_notes drop constraint if exists space_notes_edit_mode_check;
alter table public.space_notes add constraint space_notes_edit_mode_check
  check (edit_mode in ('everyone', 'author'));

-- The pin trigger from 06, extended: only the author may change edit_mode,
-- and an author-only note rejects edits from anyone else.
create or replace function public.space_notes_pin_columns()
returns trigger language plpgsql as $$
declare
  v_author_user uuid;
begin
  select pm.user_id into v_author_user
  from public.project_members pm where pm.id = old.author_id;
  if v_author_user is distinct from auth.uid() then
    if new.author_id is distinct from old.author_id
       or new.project_id is distinct from old.project_id
       or new.visibility is distinct from old.visibility
       or new.edit_mode is distinct from old.edit_mode then
      raise exception 'only the author may move, re-own, re-share or lock a note';
    end if;
    if old.edit_mode = 'author' then
      raise exception 'this note is set to author-only editing';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_space_notes_pin on public.space_notes;
create trigger trg_space_notes_pin
  before update on public.space_notes
  for each row execute function public.space_notes_pin_columns();

-- Ask PostgREST to pick up the new table/columns right away.
notify pgrst, 'reload schema';

-- ---------- verify ----------
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'note_versions') as note_versions_expected_1,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'note_comments' and column_name = 'anchor_line') as anchor_column_expected_1,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'space_notes' and column_name = 'edit_mode') as edit_mode_expected_1;
