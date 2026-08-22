-- ============================================================
-- GroveStudio — 06_grovestudio.sql
-- The one add-on the redesigned app needs on top of the spaces
-- backend (profiles / projects / project_members / space_notes).
--
-- Paste this WHOLE file into the Supabase SQL editor and run it
-- once. Idempotent — safe to re-run.
--
-- It adds:
--   1. projects.kind            private | shared spaces
--   2. tasks                    the board + "Assigned to you"
--   3. notifications            the bell, written via an RPC that
--                               verifies membership server-side
--   4. note_comments            the conversation thread in a note
--   5. co-editing policy        members edit SHARED notes; a trigger
--                               pins author/project/visibility
--   6. heartbeat RPC            last_seen_at without a broad UPDATE
--   7. realtime publication     best-effort, polling covers the rest
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 1. private vs shared spaces ----------
alter table public.projects
  add column if not exists kind text not null default 'shared';

do $$ begin
  alter table public.projects
    add constraint projects_kind_check check (kind in ('private', 'shared'));
exception when duplicate_object then null; end $$;

-- The space creator may set the kind (and rename their space). The RLS policy
-- needs a matching table-level UPDATE grant, or PostgREST returns 42501.
drop policy if exists projects_owner_update on public.projects;
create policy projects_owner_update on public.projects
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant update on public.projects to authenticated;

-- ---------- 2. tasks ----------
create table if not exists public.tasks (
  id               uuid        primary key default gen_random_uuid(),
  project_id       uuid        not null references public.projects(id) on delete cascade,
  note_id          uuid        references public.space_notes(id) on delete set null,
  title            text        not null check (char_length(trim(title)) between 1 and 300),
  label            text        not null default 'Task' check (char_length(label) between 1 and 40),
  status           text        not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  progress         int         not null default 0 check (progress between 0 and 100),
  assignee_user    uuid,
  assigned_by_user uuid        not null,
  due_date         date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_tasks_project  on public.tasks (project_id, created_at asc);
create index if not exists idx_tasks_assignee on public.tasks (assignee_user, due_date asc);

-- A Jira-style four-column board (To do / In progress / In review / Done).
-- create-table-if-not-exists won't alter an existing constraint, so swap it.
do $$ begin
  alter table public.tasks drop constraint if exists tasks_status_check;
  alter table public.tasks add constraint tasks_status_check
    check (status in ('todo', 'doing', 'review', 'done'));
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- RLS lets any member update a task (move, progress, reassign). This trigger
-- pins what must not drift: a task never changes project, and the assigner
-- column only ever becomes the acting user.
create or replace function public.tasks_pin_columns()
returns trigger language plpgsql as $$
begin
  if new.project_id is distinct from old.project_id then
    raise exception 'a task cannot move between spaces';
  end if;
  if new.assigned_by_user is distinct from old.assigned_by_user
     and new.assigned_by_user is distinct from auth.uid() then
    raise exception 'assigned_by_user can only become the acting user';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_pin on public.tasks;
create trigger trg_tasks_pin
  before update on public.tasks
  for each row execute function public.tasks_pin_columns();

alter table public.tasks enable row level security;

drop policy if exists tasks_member_select on public.tasks;
create policy tasks_member_select on public.tasks
  for select using (public.is_project_member(project_id));

drop policy if exists tasks_member_insert on public.tasks;
create policy tasks_member_insert on public.tasks
  for insert with check (
    public.is_project_member(project_id) and assigned_by_user = auth.uid()
  );

drop policy if exists tasks_member_update on public.tasks;
create policy tasks_member_update on public.tasks
  for update
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists tasks_member_delete on public.tasks;
create policy tasks_member_delete on public.tasks
  for delete using (public.is_project_member(project_id));

grant select, insert, update, delete on public.tasks to authenticated;

-- ---------- 3. notifications ----------
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,
  actor_name text,
  kind       text        not null default 'share'
                         check (kind in ('assign', 'checkin', 'blocked', 'share', 'done', 'studio')),
  text       text        not null check (char_length(text) between 1 and 500),
  sub        text        check (sub is null or char_length(sub) <= 500),
  project_id uuid,
  note_id    uuid,
  task_id    uuid,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_own_delete on public.notifications;
create policy notifications_own_delete on public.notifications
  for delete using (user_id = auth.uid());

-- NO insert policy: rows are written only by notify_users(), which verifies
-- membership and derives actor_name server-side (no impersonation).
drop policy if exists notifications_insert on public.notifications;

grant select, update, delete on public.notifications to authenticated;

create or replace function public.notify_users(
  p_user_ids uuid[],
  p_kind     text,
  p_text     text,
  p_sub      text default null,
  p_project_id uuid default null,
  p_note_id  uuid default null,
  p_task_id  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_target uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select display_name into v_actor from public.profiles where user_id = auth.uid();
  foreach v_target in array p_user_ids loop
    if v_target = auth.uid() or public.shares_a_space_with(v_target) then
      insert into public.notifications
        (user_id, actor_name, kind, text, sub, project_id, note_id, task_id)
      values
        (v_target, v_actor, p_kind, p_text, p_sub, p_project_id, p_note_id, p_task_id);
    end if;
  end loop;
end;
$$;

revoke all on function public.notify_users(uuid[], text, text, text, uuid, uuid, uuid) from public;
grant execute on function public.notify_users(uuid[], text, text, text, uuid, uuid, uuid) to authenticated;

-- ---------- 4. note comments (the conversation thread) ----------
create table if not exists public.note_comments (
  id          uuid        primary key default gen_random_uuid(),
  note_id     uuid        not null references public.space_notes(id) on delete cascade,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  author_user uuid        not null,
  body        text        not null check (char_length(trim(body)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists idx_note_comments_note on public.note_comments (note_id, created_at asc);

alter table public.note_comments enable row level security;

drop policy if exists note_comments_member_select on public.note_comments;
create policy note_comments_member_select on public.note_comments
  for select using (public.is_project_member(project_id));

drop policy if exists note_comments_member_insert on public.note_comments;
create policy note_comments_member_insert on public.note_comments
  for insert with check (
    public.is_project_member(project_id) and author_user = auth.uid()
  );

drop policy if exists note_comments_own_delete on public.note_comments;
create policy note_comments_own_delete on public.note_comments
  for delete using (author_user = auth.uid());

grant select, insert, delete on public.note_comments to authenticated;

-- ---------- 5. co-editing: members may edit SHARED notes ----------
-- RLS WITH CHECK cannot see the OLD row, so a trigger pins ownership: only
-- the author may move a note, change its author, or flip its visibility.
drop policy if exists space_notes_coedit on public.space_notes;
create policy space_notes_coedit on public.space_notes
  for update
  using (visibility = 'shared' and public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

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
       or new.visibility is distinct from old.visibility then
      raise exception 'only the author may move, re-own or re-share a note';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_space_notes_pin on public.space_notes;
create trigger trg_space_notes_pin
  before update on public.space_notes
  for each row execute function public.space_notes_pin_columns();

-- ---------- 6. heartbeat without a broad UPDATE grant ----------
-- (Replaces any earlier broad self-update policy: a row UPDATE would also
-- allow role self-promotion. The RPC touches exactly one column.)
drop policy if exists project_members_heartbeat on public.project_members;

create or replace function public.touch_last_seen(p_project_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.project_members
     set last_seen_at = now()
   where project_id = p_project_id
     and user_id = auth.uid();
$$;

revoke all on function public.touch_last_seen(uuid) from public;
grant execute on function public.touch_last_seen(uuid) to authenticated;

-- ---------- 6b. share a space straight to a person ----------
-- Any member may add a person by the email they sign in with. Definer:
-- it reads auth.users (email lookup) and writes the membership + a ping.
create or replace function public.invite_by_email(p_project_id uuid, p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_name text;
  v_space text;
  v_actor text;
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'only members can invite to this space';
  end if;

  select u.id into v_target
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_target is null then
    return json_build_object('invited', false, 'reason', 'no-account');
  end if;

  select coalesce(p.display_name, split_part(p_email, '@', 1)) into v_name
  from public.profiles p where p.user_id = v_target;
  if v_name is null then v_name := split_part(trim(p_email), '@', 1); end if;

  select name into v_space from public.projects where id = p_project_id;
  select display_name into v_actor from public.profiles where user_id = auth.uid();

  if exists (select 1 from public.project_members
             where project_id = p_project_id and user_id = v_target) then
    return json_build_object('invited', true, 'name', v_name, 'already', true);
  end if;

  insert into public.project_members (project_id, user_id, display_name, colour_index, role)
  values (
    p_project_id, v_target, v_name,
    (select count(*) from public.project_members where project_id = p_project_id) % 5,
    'member'
  );

  insert into public.notifications (user_id, actor_name, kind, text, sub, project_id)
  values (
    v_target, v_actor, 'share',
    coalesce(v_actor, 'Someone') || ' shared “' || coalesce(v_space, 'a space') || '” with you',
    'You are now a member — it is in your sidebar.',
    p_project_id
  );

  return json_build_object('invited', true, 'name', v_name, 'already', false);
end;
$$;

revoke all on function public.invite_by_email(uuid, text) from public;
grant execute on function public.invite_by_email(uuid, text) to authenticated;

-- ---------- 7. realtime publication (best effort) ----------
do $$ begin
  alter publication supabase_realtime add table public.space_notes;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.note_comments;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ---------- VERIFY ----------
-- Expect: 3 / 1 / 3.
select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('tasks', 'notifications', 'note_comments')) as new_tables_expected_3,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'kind') as kind_column_expected_1,
  (select count(*) from information_schema.routines
    where routine_schema = 'public'
      and routine_name in ('notify_users', 'touch_last_seen', 'invite_by_email')) as rpcs_expected_3;
