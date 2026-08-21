# sql/ — schema, functions, staged RLS, seed, verification

Everything here runs in the Supabase SQL editor, which uses the service role
and bypasses row-level security. Files are numbered in run order. Spec:
GROVE-MASTER.md §12 (four tables, no fifth; two helper functions before RLS).

| File | What | When |
|---|---|---|
| `01_schema.sql` | Four tables, indexes, `gen_join_code()`, `touch_updated_at()`, and `trg_participants_colour`, the SECURITY DEFINER trigger that assigns `colour_index` server-side | First, whole file |
| `02_functions.sql` | `is_participant`, `get_roster`, `get_public_roster`, `get_finding_observers`, `lookup_session_by_code` — all SECURITY DEFINER, none able to return a note body | Second, whole file, RLS still off |
| `04_demo_seed.sql` | The GRVDEM fixture: 24 notes, three observers, one planted disagreement | Third, RLS still off. Re-run any time to reset |
| `03_rls.sql` | Row-level security in four stages: S2 findings → S3 sessions → S4 participants → S5 notes | One stage at a time, notes LAST, after the polling sync path works end to end |
| `99_verify.sql` | Anon-key checks, with curl and SQL-editor forms | After every stage of 03, and once more before the demo |

## Run order

1. `01_schema.sql` — whole file.
2. `02_functions.sql` — whole file.
3. `04_demo_seed.sql` — whole file. Check the verify query at its foot
   returns 8 / 8 / 8.
4. Get the app running against the project with RLS off. Create, join from
   two browser profiles, capture, synthesise. Only then:
5. `03_rls.sql`, one stage at a time: S2 findings, retest the whole app;
   S3 sessions, retest; S4 participants, retest; S5 notes, retest. Commit
   after each green run.
6. `99_verify.sql` after each stage. Every check says which stage it needs.

If a stage breaks the demo and fifteen minutes are gone, the rollback block at
the foot of `03_rls.sql` disables RLS on that table. Commit it and say so.

## Why there is no 02_publication.sql

Build 1 had a second file that added all four tables to the
`supabase_realtime` publication and set `replica identity full` on notes,
participants and findings, for the `VITE_USE_REALTIME` path. It is not carried.

Supabase Realtime applies row-level security to INSERT and UPDATE events, but
not to DELETE events: a delete is broadcast to every subscriber of the channel
regardless of policy. With `replica identity full`, the OLD row rides in that
payload, and for `notes` the old row includes `body`. So an observer deleting
a note would have pushed its text to every other participant's client, which
is exactly the leak the notes policies exist to prevent. The independence
invariant does not survive contact with a publication.

Therefore `notes` never enters a publication, under any flag. Polling is the
shipping path (GROVE-MEMORY.md §2). When v1 adds Realtime it arrives as
`07_realtime.sql`, which adds only `comments`, `actions` and `notifications`
to the publication, with default replica identity, and never touches
`notes`, `participants`, `sessions` or `findings`.

`99_verify.sql` CHECK 1 asserts that `notes` is absent from
`pg_publication_tables` and that its replica identity is still the default.
Run it whenever anyone has been near the Realtime settings.

## The rules this directory enforces

- A SECURITY DEFINER function's return type may never contain a column that
  can carry a note body. Every function in `02_functions.sql` returns ids,
  names, colours, counts or session metadata. `99_verify.sql` CHECK 0 greps
  the return types for `body`.
- `sessions_select` is not `using (true)`. Build 1's policy let any holder
  of the anon key list every session, title, research question and join code.
  Lookup-by-code goes through `lookup_session_by_code()` instead: exact code
  in, at most one row out.
- `colour_index` is assigned by the database. The trigger is SECURITY
  DEFINER because a plain trigger runs under the joiner's RLS, sees zero
  existing participants, and gives everyone colour 0.
- The notes policies in `03_rls.sql` are the independence invariant. MVP+
  files (05/06) must never modify them.

## Type generation

`scripts/gen-types.mjs` (`npm run gen:types`) regenerates `src/lib/types.ts`
from the project's public schema via the Supabase Management API. It needs
`SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` in the shell or in
`.env.local` (never committed). Until a project exists `src/lib/types.ts` is a
placeholder that re-exports the hand-written models in `src/lib/models.ts`.
Fallback if the API is unreachable:
`npx supabase@2 gen types typescript --project-id <ref> --schema public`.
