-- ============================================================
-- Grove — 02_publication.sql
-- Run this SECOND. Mandatory if VITE_USE_REALTIME will ever be true.
--
-- Forgetting this is a completely silent failure: subscribe() returns
-- SUBSCRIBED, the console is clean, and not one row event ever arrives.
-- ============================================================

alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.findings;
alter publication supabase_realtime add table public.sessions;

-- Makes the OLD row available on UPDATE/DELETE events.
alter table public.notes        replica identity full;
alter table public.participants replica identity full;
alter table public.findings     replica identity full;

-- ---------- VERIFY. Run this. Read the output. Do not skip it. ----------
select schemaname, tablename
from   pg_publication_tables
where  pubname = 'supabase_realtime'
order  by tablename;
-- Expected exactly: findings, notes, participants, sessions
-- "relation is already member of publication" on the alters above is harmless.
