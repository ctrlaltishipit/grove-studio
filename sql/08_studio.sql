-- ============================================================
-- Grove Studio — spaces, notes and profiles.
--
-- The model, stated once:
--   A PROJECT (a "space") is collaborative. Its members see each other.
--   A NOTE inside it is either 'private' (its author, and nobody else, ever)
--   or 'shared' (every member, live). A private note can be promoted to
--   shared by its author; a shared note can never be demoted back, because
--   people have already read it and un-ringing that bell is a lie.
--
--   This sits alongside — not instead of — the sessions/participants/notes
--   tables. Those remain the corroboration mode: everyone writes in a private
--   lane, Synthesise counts DISTINCT observers. Nothing here weakens that.
--
-- Run AFTER 01–04. Idempotent enough to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles ----------
-- Display name and avatar for the greeting and for member chips. Never any
-- note content. Populated on first sign-in from the OAuth identity.
create table if not exists public.profiles (
  user_id      uuid primary key,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_url   text not null default '' check (char_length(avatar_url) <= 500),
  created_at   timestamptz not null default now()
);

-- ---------- projects (spaces) ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  join_code   text not null unique default gen_join_code()
                   check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$'),
  created_by  uuid not null,
  created_at  timestamptz not null default now()
);

-- ---------- project_members ----------
create table if not exists public.project_members (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  colour_index int  not null default 0 check (colour_index between 0 and 4),
  role         text not null default 'member' check (role in ('owner','member')),
  last_seen_at timestamptz not null default now(),
  joined_at    timestamptz not null default now(),
  -- One membership per person per space. A duplicate would inflate every count.
  constraint project_members_uniq unique (project_id, user_id)
);

-- colour_index is assigned server-side, exactly as participants.colour_index is:
-- a client counting rows it cannot see under RLS would hand everyone colour 0.
create or replace function public.assign_member_colour() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select count(*) % 5 into new.colour_index
  from public.project_members where project_id = new.project_id;
  return new;
end $$;

drop trigger if exists trg_members_colour on public.project_members;
create trigger trg_members_colour before insert on public.project_members
  for each row execute function public.assign_member_colour();

-- ---------- space_notes ----------
-- Deliberately a single body column rather than a block tree: the product
-- needs writing and reading, not a document editor, and every block model
-- brings ordering, concurrency and migration cost with it.
create table if not exists public.space_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id  uuid not null references public.project_members(id) on delete cascade,
  title      text not null default 'Untitled note' check (char_length(title) <= 120),
  body       text not null default '' check (char_length(body) <= 20000),
  visibility text not null default 'private' check (visibility in ('private','shared')),
  shared_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_space_notes_touch on public.space_notes;
create trigger trg_space_notes_touch before update on public.space_notes
  for each row execute function public.touch_updated_at();

create index if not exists idx_projects_code       on public.projects (join_code);
create index if not exists idx_pmembers_project    on public.project_members (project_id);
create index if not exists idx_pmembers_user       on public.project_members (user_id);
create index if not exists idx_space_notes_project on public.space_notes (project_id, updated_at desc);
create index if not exists idx_space_notes_author  on public.space_notes (author_id);

-- ============================================================
-- Functions. Same rule as sql/02_functions.sql: a SECURITY DEFINER
-- function's return type may never contain a column that can carry
-- another person's private note text.
-- ============================================================

create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project_id and m.user_id = auth.uid()
  );
$$;
revoke all on function public.is_project_member(uuid) from public;
grant execute on function public.is_project_member(uuid) to anon, authenticated;


-- Do I share at least one space with this person? Used by the profiles policy
-- so a signed-in stranger cannot enumerate every user's name and avatar.
-- SECURITY DEFINER so the policy does not recurse into project_members' own RLS.
create or replace function public.shares_a_space_with(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.project_members mine
      join public.project_members theirs on theirs.project_id = mine.project_id
     where mine.user_id = auth.uid()
       and theirs.user_id = p_user_id
  );
$$;
revoke all on function public.shares_a_space_with(uuid) from public;
grant execute on function public.shares_a_space_with(uuid) to authenticated;

-- The ONLY write path into project_members. Direct INSERT is revoked in
-- 09_studio_rls.sql, so the join code — not the project uuid — is the
-- capability, and a project id leaking never lets anyone into the space.
create or replace function public.join_project(p_code text, p_display_name text)
returns table (
  id uuid, project_id uuid, display_name text, user_id uuid,
  colour_index int, role text, last_seen_at timestamptz, joined_at timestamptz
)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_proj uuid;
  v_name text := left(trim(p_display_name), 40);
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if v_name is null or v_name = '' then raise exception 'display name required'; end if;

  select p.id into v_proj from public.projects p
   where p.join_code = upper(trim(p_code)) limit 1;
  if v_proj is null then raise exception 'no space with that code'; end if;

  return query
    select m.id, m.project_id, m.display_name, m.user_id,
           m.colour_index, m.role, m.last_seen_at, m.joined_at
      from public.project_members m
     where m.project_id = v_proj and m.user_id = v_uid;
  if found then return; end if;

  return query
    insert into public.project_members as m (project_id, user_id, display_name)
    values (v_proj, v_uid, v_name)
    on conflict on constraint project_members_uniq
    do update set last_seen_at = now()
    returning m.id, m.project_id, m.display_name, m.user_id,
              m.colour_index, m.role, m.last_seen_at, m.joined_at;
end $$;
revoke all on function public.join_project(text, text) from public;
grant execute on function public.join_project(text, text) to authenticated;

-- Creating a space makes you its owner in one transaction, so a space can
-- never exist with nobody in it.
create or replace function public.create_project(p_name text, p_display_name text)
returns table (id uuid, name text, join_code text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if trim(coalesce(p_name,'')) = '' then raise exception 'name required'; end if;

  insert into public.projects (name, created_by)
  values (left(trim(p_name), 120), v_uid)
  returning projects.id into v_id;

  insert into public.project_members (project_id, user_id, display_name, role)
  values (v_id, v_uid, left(trim(coalesce(p_display_name, 'Me')), 40), 'owner');

  return query select p.id, p.name, p.join_code from public.projects p where p.id = v_id;
end $$;
revoke all on function public.create_project(text, text) from public;
grant execute on function public.create_project(text, text) to authenticated;

-- Member roster for a space: names, colours, and a count of SHARED notes only.
-- There is no column here that could carry a private note's text.
create or replace function public.get_space_members(p_project_id uuid)
returns table (
  member_id uuid, user_id uuid, display_name text, colour_index int,
  role text, shared_notes int, last_seen_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.id, m.user_id, m.display_name, m.colour_index, m.role,
         coalesce((
           select count(*)::int from public.space_notes n
            where n.author_id = m.id and n.visibility = 'shared'
         ), 0),
         m.last_seen_at
    from public.project_members m
   where m.project_id = p_project_id
     and public.is_project_member(p_project_id)
   order by m.joined_at asc;
$$;
revoke all on function public.get_space_members(uuid) from public;
grant execute on function public.get_space_members(uuid) to anon, authenticated;

-- Every space this person belongs to, with counts for the home screen.
create or replace function public.my_spaces()
returns table (
  id uuid, name text, join_code text, member_count int,
  shared_notes int, my_private_notes int, last_activity timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.join_code,
         (select count(*)::int from public.project_members m2 where m2.project_id = p.id),
         (select count(*)::int from public.space_notes n
           where n.project_id = p.id and n.visibility = 'shared'),
         (select count(*)::int from public.space_notes n
           where n.project_id = p.id and n.visibility = 'private' and n.author_id = m.id),
         greatest(p.created_at, coalesce((
           select max(n.updated_at) from public.space_notes n where n.project_id = p.id
         ), p.created_at))
    from public.projects p
    join public.project_members m
      on m.project_id = p.id and m.user_id = auth.uid()
   order by 7 desc;
$$;
revoke all on function public.my_spaces() from public;
grant execute on function public.my_spaces() to authenticated;

-- ---------- verify ----------
-- select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname='public' and proname in
--   ('is_project_member','shares_a_space_with','join_project','create_project',
--    'get_space_members','my_spaces','assign_member_colour')
--  order by proname;   -- expect 7 rows
