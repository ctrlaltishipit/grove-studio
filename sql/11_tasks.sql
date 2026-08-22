-- =====================================================================
-- Grove Studio — tasks (A15)
--
-- A note is where a team works out what it thinks. A task is the part of
-- that thinking somebody has to go and do. This file gives tasks their own
-- rows so they can be counted, assigned, chased and shown on a board,
-- instead of living as a line of prose nobody re-reads.
--
-- Two rules shape everything below.
--
-- 1. A task can only be created on a SHARED note. A task carries its note's
--    title into the assignee's dashboard, so a task on a private note would
--    leak that note's title to someone who cannot read the note. Rather than
--    strip the title later, the constraint is enforced at creation.
--
-- 2. No client ever writes a notification. A person can only insert rows for
--    themselves under RLS, and a notification is by definition a row about
--    someone else. Every write goes through a SECURITY DEFINER function that
--    checks the caller and the assignee are members of the same space first.
--    The INSERT privilege is revoked as well as unpolicied, so a later file
--    that adds a policy back still cannot write one.
--
-- Run after 09_studio_rls.sql. Safe to re-run.
-- =====================================================================

-- ---------- drop first ----------
--
-- Postgres refuses to change a function's return type with CREATE OR REPLACE,
-- so re-running this file over an earlier version of itself would fail on
-- my_notifications() alone and leave the rest half-applied. Dropping first
-- makes the file idempotent in the way it claims to be.
drop function if exists public.my_notifications(int);
drop function if exists public.my_tasks();
drop function if exists public.my_task_counts();
drop function if exists public.list_note_tasks(uuid);


-- ---------- tables ----------

create table if not exists public.note_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id)        on delete cascade,
  note_id     uuid not null references public.space_notes(id)     on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 200),
  detail      text not null default '' check (char_length(detail) <= 2000),
  -- null is a real state and it means something: nobody has picked this up.
  -- It is not the same as unstarted, and the board shows it differently.
  assignee_id uuid references public.project_members(id) on delete set null,
  created_by  uuid not null references public.project_members(id) on delete cascade,
  status      text not null default 'todo' check (status in ('todo','doing','blocked','done')),
  due_date    date,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists note_tasks_note_idx     on public.note_tasks (note_id, position);
create index if not exists note_tasks_assignee_idx on public.note_tasks (assignee_id, status);
create index if not exists note_tasks_project_idx  on public.note_tasks (project_id);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  kind        text not null check (kind in ('assigned','reassigned','unassigned','due_soon','completed')),
  task_id     uuid references public.note_tasks(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  -- One notification per (kind, task, day). Without this a save loop that
  -- fires twice puts the same line in someone's dashboard twice, and a
  -- dashboard that repeats itself stops being read.
  dedupe_key  text not null unique,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, read_at, created_at desc);


-- ---------- helpers ----------

-- The caller's membership row in one space, or null. Every task function
-- starts here: it is both the permission check and the actor's identity.
create or replace function public.my_membership(p_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.project_members
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.my_membership(uuid) from public;
grant execute on function public.my_membership(uuid) to authenticated;


-- Write one notification. Internal: no grant to any client role, so it can
-- only be reached from the SECURITY DEFINER functions below.
create or replace function public.notify_member(
  p_member_id uuid, p_kind text, p_task_id uuid, p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  if p_member_id is null then return; end if;
  select user_id into v_user from public.project_members where id = p_member_id;
  if v_user is null then return; end if;
  -- Nobody needs to be told about their own action.
  if v_user = auth.uid() then return; end if;
  insert into public.notifications (user_id, kind, task_id, payload, dedupe_key)
  values (v_user, p_kind, p_task_id, p_payload,
          p_kind || ':' || coalesce(p_task_id::text, 'none') || ':' || current_date::text)
  on conflict (dedupe_key) do nothing;
end $$;

revoke all on function public.notify_member(uuid, text, uuid, jsonb) from public;


-- ---------- create ----------

create or replace function public.create_task(
  p_note_id     uuid,
  p_title       text,
  p_assignee_id uuid    default null,
  p_due_date    date    default null,
  p_detail      text    default ''
) returns public.note_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
  v_vis     text;
  v_title   text;
  v_me      uuid;
  v_pos     int;
  v_task    public.note_tasks;
begin
  -- Named columns, never `select *`: this function runs as its owner, so a
  -- star here would pull the note body past RLS into a variable. It would
  -- not be returned, but the way a leak starts is a value being in scope.
  select project_id, visibility, title into v_project, v_vis, v_title
  from public.space_notes where id = p_note_id;
  if v_project is null then raise exception 'no such note' using errcode = '42704'; end if;

  -- Rule 1, enforced where it cannot be forgotten.
  if v_vis <> 'shared' then
    raise exception 'tasks belong on shared notes' using errcode = '42501';
  end if;

  v_me := public.my_membership(v_project);
  if v_me is null then raise exception 'not a member' using errcode = '42501'; end if;

  -- An assignee must be a member of THIS space. Without this check any uuid
  -- would do, and a task could be parked against a stranger's id.
  if p_assignee_id is not null
     and not exists (select 1 from public.project_members
                     where id = p_assignee_id and project_id = v_project) then
    raise exception 'assignee is not in this space' using errcode = '42501';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
  from public.note_tasks where note_id = p_note_id;

  insert into public.note_tasks (project_id, note_id, title, detail, assignee_id, created_by, due_date, position)
  values (v_project, p_note_id, trim(p_title), coalesce(p_detail, ''), p_assignee_id, v_me, p_due_date, v_pos)
  returning * into v_task;

  perform public.notify_member(
    p_assignee_id, 'assigned', v_task.id,
    jsonb_build_object('title', v_task.title, 'note_title', v_title,
                       'project_id', v_project, 'note_id', p_note_id,
                       'due_date', v_task.due_date));
  return v_task;
end $$;

revoke all on function public.create_task(uuid, text, uuid, date, text) from public;
grant execute on function public.create_task(uuid, text, uuid, date, text) to authenticated;


-- ---------- update ----------

-- One function for every edit, because assignment changes and status changes
-- both need a notification decided from the BEFORE and AFTER rows together.
-- Splitting them into two functions would mean reading the row twice and
-- getting the transition wrong on a race.
create or replace function public.update_task(
  p_task_id     uuid,
  p_title       text    default null,
  p_assignee_id uuid    default null,
  p_due_date    date    default null,
  p_status      text    default null,
  p_detail      text    default null,
  p_clear_assignee boolean default false,
  p_clear_due      boolean default false
) returns public.note_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_project  uuid;
  v_old_assignee uuid;
  v_old_status   text;
  v_new  public.note_tasks;
  v_note_title text;
  v_me   uuid;
begin
  select project_id, assignee_id, status into v_old_project, v_old_assignee, v_old_status
  from public.note_tasks where id = p_task_id;
  if v_old_project is null then raise exception 'no such task' using errcode = '42704'; end if;

  v_me := public.my_membership(v_old_project);
  if v_me is null then raise exception 'not a member' using errcode = '42501'; end if;

  if p_assignee_id is not null
     and not exists (select 1 from public.project_members
                     where id = p_assignee_id and project_id = v_old_project) then
    raise exception 'assignee is not in this space' using errcode = '42501';
  end if;

  update public.note_tasks set
    title       = coalesce(nullif(trim(p_title), ''), title),
    detail      = coalesce(p_detail, detail),
    assignee_id = case when p_clear_assignee then null
                       else coalesce(p_assignee_id, assignee_id) end,
    due_date    = case when p_clear_due then null
                       else coalesce(p_due_date, due_date) end,
    status      = coalesce(p_status, status),
    -- Completion is stamped once. Re-opening clears it, so "finished on"
    -- always refers to the run of work that actually finished.
    completed_at = case when coalesce(p_status, status) = 'done'
                        then coalesce(completed_at, now()) else null end,
    updated_at  = now()
  where id = p_task_id
  returning * into v_new;

  -- Only the title. The body of this note has no business being in scope
  -- inside a function that runs as the table owner.
  select title into v_note_title from public.space_notes where id = v_new.note_id;

  if v_new.assignee_id is distinct from v_old_assignee then
    perform public.notify_member(
      v_new.assignee_id,
      case when v_old_assignee is null then 'assigned' else 'reassigned' end,
      v_new.id,
      jsonb_build_object('title', v_new.title, 'note_title', v_note_title,
                         'project_id', v_new.project_id, 'note_id', v_new.note_id,
                         'due_date', v_new.due_date));
    -- The person it was taken from is told too. Silently moving work off
    -- someone's board is how a task gets dropped by both people.
    perform public.notify_member(
      v_old_assignee, 'unassigned', v_new.id,
      jsonb_build_object('title', v_new.title, 'note_title', v_note_title,
                         'project_id', v_new.project_id, 'note_id', v_new.note_id));
  elsif v_new.status = 'done' and v_old_status <> 'done' then
    perform public.notify_member(
      v_new.created_by, 'completed', v_new.id,
      jsonb_build_object('title', v_new.title, 'note_title', v_note_title,
                         'project_id', v_new.project_id, 'note_id', v_new.note_id));
  end if;

  return v_new;
end $$;

revoke all on function public.update_task(uuid, text, uuid, date, text, text, boolean, boolean) from public;
grant execute on function public.update_task(uuid, text, uuid, date, text, text, boolean, boolean) to authenticated;


-- ---------- reorder + delete ----------

create or replace function public.move_task(p_task_id uuid, p_status text, p_position int)
returns public.note_tasks
language plpgsql
security definer
set search_path = public
as $$
declare v_project uuid;
begin
  select project_id into v_project from public.note_tasks where id = p_task_id;
  if v_project is null then raise exception 'no such task' using errcode = '42704'; end if;
  if public.my_membership(v_project) is null then
    raise exception 'not a member' using errcode = '42501';
  end if;
  return public.update_task(p_task_id, null, null, null, p_status, null, false, false);
end $$;

revoke all on function public.move_task(uuid, text, int) from public;
grant execute on function public.move_task(uuid, text, int) to authenticated;


create or replace function public.delete_task(p_task_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_project uuid;
begin
  select project_id into v_project from public.note_tasks where id = p_task_id;
  if v_project is null then return; end if;
  if public.my_membership(v_project) is null then
    raise exception 'not a member' using errcode = '42501';
  end if;
  delete from public.note_tasks where id = p_task_id;
end $$;

revoke all on function public.delete_task(uuid) from public;
grant execute on function public.delete_task(uuid) to authenticated;


-- ---------- reads ----------

-- The board for one note.
create or replace function public.list_note_tasks(p_note_id uuid)
returns table (
  id uuid, title text, detail text, status text, due_date date, position int,
  assignee_id uuid, assignee_name text, assignee_colour int,
  created_by uuid, created_at timestamptz, updated_at timestamptz, completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.title, t.detail, t.status, t.due_date, t.position,
         t.assignee_id, m.display_name, m.colour_index,
         t.created_by, t.created_at, t.updated_at, t.completed_at
  from public.note_tasks t
  left join public.project_members m on m.id = t.assignee_id
  where t.note_id = p_note_id
    and public.my_membership(t.project_id) is not null
  order by array_position(array['todo','doing','blocked','done'], t.status), t.position, t.created_at;
$$;

revoke all on function public.list_note_tasks(uuid) from public;
grant execute on function public.list_note_tasks(uuid) to authenticated;


-- Everything assigned to me, everywhere. This is the home dashboard.
-- It returns the space and note names so a task is never context-free —
-- "write the summary" means nothing without "on Clinic booking".
create or replace function public.my_tasks()
returns table (
  id uuid, title text, detail text, status text, due_date date,
  project_id uuid, project_name text, note_id uuid, note_title text,
  assigned_by text, created_at timestamptz, updated_at timestamptz, completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.title, t.detail, t.status, t.due_date,
         p.id, p.name, n.id, n.title,
         c.display_name, t.created_at, t.updated_at, t.completed_at
  from public.note_tasks t
  join public.projects       p on p.id = t.project_id
  join public.space_notes    n on n.id = t.note_id
  join public.project_members c on c.id = t.created_by
  where t.assignee_id in (
    select id from public.project_members where user_id = auth.uid()
  )
  order by
    case t.status when 'blocked' then 0 when 'doing' then 1 when 'todo' then 2 else 3 end,
    t.due_date nulls last, t.created_at;
$$;

revoke all on function public.my_tasks() from public;
grant execute on function public.my_tasks() to authenticated;


-- How much is waiting for me, per space. Feeds the sidebar counts.
create or replace function public.my_task_counts()
returns table (project_id uuid, open_count bigint, overdue_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.project_id,
         count(*) filter (where t.status <> 'done'),
         count(*) filter (where t.status <> 'done' and t.due_date < current_date)
  from public.note_tasks t
  where t.assignee_id in (select id from public.project_members where user_id = auth.uid())
  group by t.project_id;
$$;

revoke all on function public.my_task_counts() from public;
grant execute on function public.my_task_counts() to authenticated;


-- Named columns, not `setof public.notifications`. `setof` a table means the
-- function's shape follows the table's: add a column there one day and it
-- starts being returned here without anyone deciding that it should.
create or replace function public.my_notifications(p_limit int default 30)
-- The payload column stays jsonb in the table, but it does not leave this
-- function as jsonb. A definer function returning jsonb is an open pipe: the
-- day somebody adds a body to a payload, nothing here would object. Five
-- named scalars can only ever carry the five things they are named after.
returns table (
  id uuid, kind text, task_id uuid,
  task_title text, note_title text, project_id uuid, note_id uuid, due_date date,
  read_at timestamptz, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.kind, n.task_id,
         n.payload ->> 'title',
         n.payload ->> 'note_title',
         (n.payload ->> 'project_id')::uuid,
         (n.payload ->> 'note_id')::uuid,
         (n.payload ->> 'due_date')::date,
         n.read_at, n.created_at
  from public.notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit least(coalesce(p_limit, 30), 100);
$$;

revoke all on function public.my_notifications(int) from public;
grant execute on function public.my_notifications(int) to authenticated;


create or replace function public.mark_notifications_read() returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.mark_notifications_read() from public;
grant execute on function public.mark_notifications_read() to authenticated;


-- ---------- RLS ----------

alter table public.note_tasks    enable row level security;
alter table public.notifications enable row level security;

-- Read a task if you are in its space. Everything else goes through the
-- functions above, so the write privileges are revoked outright: a task
-- must not be creatable without the shared-note check, and a notification
-- must not be creatable by a client at all.
drop policy if exists note_tasks_select on public.note_tasks;
create policy note_tasks_select on public.note_tasks
  for select to authenticated
  using ( public.is_project_member(project_id) );

revoke insert, update, delete on public.note_tasks    from anon, authenticated;
revoke insert, update, delete on public.notifications from anon, authenticated;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using ( user_id = auth.uid() );

grant select on public.note_tasks    to authenticated;
grant select on public.notifications to authenticated;

-- =====================================================================
-- ---------- ROLLBACK (uncomment one line at a time if a stage breaks) ----------
-- alter table public.notifications disable row level security;
-- alter table public.note_tasks    disable row level security;
-- drop table if exists public.notifications;
-- drop table if exists public.note_tasks;
-- =====================================================================
