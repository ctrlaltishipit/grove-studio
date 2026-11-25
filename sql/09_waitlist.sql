-- =============================================================================
-- GroveStudio: 09, the early access list and newsletter sign-ups.
--
-- Paste into the Supabase SQL editor (dashboard, SQL Editor, New query) and
-- run once. Idempotent: re-running is harmless.
--
-- The public website posts to /api/waitlist, which calls join_waitlist().
-- Nobody can read the table through the API: RLS is on with no policies, and
-- the only way in is the function below, which can add or update one email.
-- Read the list in the dashboard (Table editor, waitlist).
-- =============================================================================

create table if not exists public.waitlist (
  id          bigint      generated always as identity primary key,
  email       text        not null unique
                          check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name        text        check (name is null or char_length(name) <= 80),
  team        text        check (team is null or char_length(team) <= 80),
  newsletter  boolean     not null default false,
  source      text        check (source is null or char_length(source) <= 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;

create or replace function public.join_waitlist(
  p_email text,
  p_name text default null,
  p_team text default null,
  p_newsletter boolean default false,
  p_source text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_new boolean;
begin
  if char_length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  insert into public.waitlist (email, name, team, newsletter, source)
  values (
    v_email,
    nullif(left(trim(coalesce(p_name, '')), 80), ''),
    nullif(left(trim(coalesce(p_team, '')), 80), ''),
    coalesce(p_newsletter, false),
    nullif(left(trim(coalesce(p_source, '')), 40), '')
  )
  on conflict (email) do update
    set newsletter = public.waitlist.newsletter or excluded.newsletter,
        name       = coalesce(excluded.name, public.waitlist.name),
        team       = coalesce(excluded.team, public.waitlist.team),
        updated_at = now()
  returning (xmax = 0) into v_new;

  return jsonb_build_object('ok', true, 'new', v_new);
end;
$$;

revoke all on function public.join_waitlist(text, text, text, boolean, text) from public;
grant execute on function public.join_waitlist(text, text, text, boolean, text) to anon, authenticated;
