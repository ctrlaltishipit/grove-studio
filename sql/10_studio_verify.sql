-- =====================================================================
-- Grove Studio — verify 09_studio_rls.sql actually landed.
--
-- Read-only. Run it in the SQL editor after 09. It answers three
-- questions in one result, and every row must say PASS:
--
--   1. Is row-level security switched ON for the four Studio tables?
--      (A policy on a table with RLS off is decoration.)
--   2. Does each table carry the number of policies the file wrote?
--   3. Is there a policy anywhere that says `using (true)`?
--      That is the shape that leaks everything while looking installed.
--
-- The row counts are here so a "0 rows visible to a stranger" probe from
-- outside means something. Zero rows in the table would give the same
-- reassuring answer as a locked table, and only one of those is security.
-- =====================================================================

with rls as (
  select c.relname::text as tbl, c.relrowsecurity as on_
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('profiles', 'projects', 'project_members', 'space_notes')
),
pol as (
  select tablename::text as tbl,
         count(*)                                            as n,
         count(*) filter (where qual = 'true')                as wide_open
  from pg_policies
  where schemaname = 'public'
    and tablename in ('profiles', 'projects', 'project_members', 'space_notes')
  group by tablename
),
-- The counts 09 actually writes. They are not all the same, and the
-- differences are the design: `projects` has no INSERT policy because
-- create_project() is the only way to make a space (so a space always has an
-- owner), and no DELETE policy because spaces are not deleted from the client.
-- `project_members` has no INSERT policy for the same reason — join_project()
-- owns that path, and the privilege is revoked as well as unpolicied, so a
-- later file that adds a policy back still cannot insert.
expected (tbl, want) as (
  values ('profiles', 3), ('projects', 2), ('project_members', 3), ('space_notes', 4)
),
counts (tbl, rows_) as (
  select 'profiles',        (select count(*) from public.profiles)
  union all select 'projects',        (select count(*) from public.projects)
  union all select 'project_members',  (select count(*) from public.project_members)
  union all select 'space_notes',      (select count(*) from public.space_notes)
)
select
  e.tbl                                              as "table",
  coalesce(r.on_, false)                             as "rls on",
  coalesce(p.n, 0)                                   as "policies",
  coalesce(p.wide_open, 0)                           as "using(true)",
  c.rows_                                            as "rows in table",
  case
    when not coalesce(r.on_, false)      then 'FAIL — RLS is off; every row is public'
    when coalesce(p.wide_open, 0) > 0    then 'FAIL — a policy says using(true)'
    when coalesce(p.n, 0) <> e.want      then 'FAIL — policy count does not match 09'
    else                                      'PASS'
  end                                                as "verdict"
from expected e
left join rls r  on r.tbl = e.tbl
left join pol p  on p.tbl = e.tbl
join counts c    on c.tbl = e.tbl
order by e.tbl;
