-- =============================================================================
-- GroveStudio — 08: sample spaces + saved studio audio.
--
-- Paste into the Supabase SQL editor and run once, after 07. Idempotent.
--
--   1. projects.sample        — a real space every signed-in user joins as a
--                               viewer automatically (join_sample_spaces()),
--                               so it shows up for everyone like the built-in
--                               Getting Started sample. "AI Tools" is flagged.
--   2. studio_artifacts       — generated studio output saved per space (the
--                               audio overview today), so it plays for every
--                               member instead of being regenerated per person.
-- =============================================================================

-- ---------- 1. sample spaces ----------
alter table public.projects add column if not exists sample boolean not null default false;

update public.projects set sample = true where id = 'bc2e0378-b9c7-4a02-aafb-306d39d126ee'; -- "AI Tools"

-- Called by the app on every sign-in: joins the caller to each sample space
-- (as a viewer: they can read, comment and use the studio, not edit notes).
create or replace function public.join_sample_spaces()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_count int := 0;
begin
  if auth.uid() is null then return 0; end if;
  select display_name into v_name from public.profiles where user_id = auth.uid();
  insert into public.project_members (project_id, user_id, display_name, colour_index, role)
  select p.id, auth.uid(), coalesce(nullif(trim(v_name), ''), 'Guest'), (floor(random() * 5))::int, 'viewer'
    from public.projects p
   where p.sample
     and not exists (
       select 1 from public.project_members m where m.project_id = p.id and m.user_id = auth.uid()
     );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.join_sample_spaces() from public;
grant execute on function public.join_sample_spaces() to authenticated;

-- ---------- 2. saved studio artifacts ----------
create table if not exists public.studio_artifacts (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  kind        text        not null check (kind in ('audio', 'summary', 'mindmap', 'video', 'infographic')),
  payload     jsonb       not null,
  created_by  uuid        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, kind)
);

alter table public.studio_artifacts enable row level security;

drop policy if exists studio_artifacts_member_select on public.studio_artifacts;
create policy studio_artifacts_member_select on public.studio_artifacts
  for select using (public.is_project_member(project_id));

drop policy if exists studio_artifacts_editor_insert on public.studio_artifacts;
create policy studio_artifacts_editor_insert on public.studio_artifacts
  for insert with check (public.can_edit_notes(project_id) and created_by = auth.uid());

drop policy if exists studio_artifacts_editor_update on public.studio_artifacts;
create policy studio_artifacts_editor_update on public.studio_artifacts
  for update using (public.can_edit_notes(project_id)) with check (public.can_edit_notes(project_id));

grant select, insert, update on public.studio_artifacts to authenticated;

notify pgrst, 'reload schema';

-- ---------- verify ----------
select
  (select count(*) from public.projects where sample) as sample_spaces_expected_1,
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'studio_artifacts') as studio_artifacts_expected_1;
