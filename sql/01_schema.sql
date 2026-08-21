-- ============================================================
-- Grove — 01_schema.sql
-- Run this WHOLE file first, in the Supabase SQL editor.
-- Idempotent enough to re-run during development.
--
-- Spec: GROVE-MASTER.md §12.1 — four tables, no fifth.
-- ============================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------- join code generation ----------
-- 6 chars, uppercase, unambiguous alphabet: no O/0, no I/1/L.
-- The client NEVER invents a code. This is a column default, so two
-- simultaneous creates cannot collide client-side.
create or replace function gen_join_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 31 chars
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.sessions s where s.join_code = code);
  end loop;
  return code;
end;
$$;

-- ---------- sessions ----------
create table if not exists public.sessions (
  id                uuid primary key default gen_random_uuid(),
  title             text        not null check (char_length(trim(title)) between 1 and 200),
  research_question text        not null check (char_length(trim(research_question)) between 1 and 500),
  join_code         text        not null unique default gen_join_code()
                                check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$'),
  created_by        uuid        not null,
  created_at        timestamptz not null default now(),
  status            text        not null default 'live'
                                check (status in ('live', 'synthesised'))
);

-- ---------- participants ----------
create table if not exists public.participants (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid        not null references public.sessions(id) on delete cascade,
  display_name  text        not null check (char_length(trim(display_name)) between 1 and 40),
  user_id       uuid        not null,
  colour_index  int         not null default 0 check (colour_index between 0 and 4),
  last_seen_at  timestamptz not null default now(),
  joined_at     timestamptz not null default now(),
  constraint participants_session_user_uniq unique (session_id, user_id)
);

-- ---------- colour_index is assigned HERE, never by the client ----------
-- GROVE-MASTER.md §12.1: colour_index is "(existing count) mod 5 by join
-- order". The client may send any value, or none; this trigger overwrites it,
-- so two people joining in the same second cannot both compute 0 from a stale
-- roster, and a client cannot choose its own colour.
--
-- SECURITY DEFINER is load-bearing, not hygiene. A plain trigger function runs
-- under the CALLER's row-level security. At the moment you join you are not
-- yet a participant, so participants_select (03_rls.sql, stage S4) shows you
-- zero rows, count(*) is 0, and every joiner is colour 0 — the "everyone is
-- colour 0" bug. Running as the definer (the table owner, who is not subject
-- to RLS) counts every row already in the session.
--
-- Within one multi-row INSERT (the demo seed) each row's BEFORE trigger sees
-- the rows inserted before it in the same statement, so three seeded
-- participants get 0, 1, 2 in VALUES order.
--
-- No grant/revoke: a trigger function cannot be called directly ("trigger
-- functions can only be called as triggers"), so there is no surface to close.
create or replace function public.assign_colour_index()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select count(*) % 5 into new.colour_index
  from public.participants
  where session_id = new.session_id;
  return new;
end;
$$;

drop trigger if exists trg_participants_colour on public.participants;
create trigger trg_participants_colour
  before insert on public.participants
  for each row execute function public.assign_colour_index();

-- ---------- notes ----------
create table if not exists public.notes (
  id             uuid        primary key default gen_random_uuid(),
  session_id     uuid        not null references public.sessions(id)     on delete cascade,
  participant_id uuid        not null references public.participants(id) on delete cascade,
  body           text        not null check (char_length(trim(body)) between 1 and 4000),
  kind           text        not null default 'observation'
                             check (kind in ('observation', 'quote', 'question')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- findings ----------
create table if not exists public.findings (
  id                  uuid        primary key default gen_random_uuid(),
  session_id          uuid        not null references public.sessions(id) on delete cascade,
  theme               text        not null check (char_length(trim(theme)) between 3 and 80),
  summary             text        not null check (char_length(trim(summary)) between 10 and 400),
  observer_count      int         not null default 1 check (observer_count >= 1),
  supporting_note_ids uuid[]      not null check (cardinality(supporting_note_ids) >= 1),
  has_disagreement    boolean     not null default false,
  disagreement_note   text,
  rank                int         not null default 1 check (rank >= 1),
  created_at          timestamptz not null default now(),
  constraint findings_disagreement_has_text
    check (has_disagreement = false
           or (disagreement_note is not null and char_length(trim(disagreement_note)) > 0)),
  constraint findings_rank_uniq unique (session_id, rank)
);

-- ---------- indexes ----------
create index if not exists idx_sessions_join_code     on public.sessions (join_code);
create index if not exists idx_participants_session   on public.participants (session_id);
create index if not exists idx_participants_user      on public.participants (user_id);
create index if not exists idx_participants_last_seen on public.participants (session_id, last_seen_at desc);
create index if not exists idx_notes_session_created  on public.notes (session_id, created_at desc);
create index if not exists idx_notes_participant      on public.notes (participant_id, created_at desc);
create index if not exists idx_findings_session_rank  on public.findings (session_id, rank asc);

-- ---------- updated_at trigger on notes ----------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_notes_touch on public.notes;
create trigger trg_notes_touch
  before update on public.notes
  for each row execute function touch_updated_at();

-- ---------- NO roster view, deliberately ----------
-- Postgres runs a view with the view OWNER's RLS context by default, so a
-- plain roster_view would BYPASS the caller's policies rather than enforce
-- them. Roster counts come from public.get_roster() in 02_functions.sql,
-- which returns integers and cannot return note text.
