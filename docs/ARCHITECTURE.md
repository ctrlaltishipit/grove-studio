# Architecture

One repo, one host, one database, one AI key. Anything that adds a second of
anything must argue for its life.

```
GitHub main ──push──▶ Vercel (one project)
   ├─ static SPA (Vite + React 18 + TypeScript)   rewrite /((?!api/).*) → /index.html   ← load-bearing
   ├─ api/synthesise.py   POST {session_id}   the ONLY cross-lane read; service role + LLM key
   ├─ api/followup.py     GET (Vercel Cron)   reminders → notifications rows        (Phase 7)
   ├─ api/notify.py       POST (user JWT)     cross-user in-app notifications       (Phase 7)
   ├─ api/health.py       GET                 {configured, missing: [names]}
   └─ api/_supa.py        shared stdlib helpers — a leading underscore is not a route
Browser (anon key only) ──polls every 3 s under RLS──▶ Supabase Postgres + Auth
api/*.py ──service role──▶ Supabase ──▶ Gemini generateContent
```

## Trust boundaries
- The browser holds the **anon key only** — publishable by design; Row Level Security is the boundary.
- `api/*.py` is the only place the **service-role key** and the **LLM key** exist. Nothing is prefixed `VITE_` except the two Supabase values and the realtime flag.
- The function never trusts an id it did not verify: the client sends `{ session_id }` and nothing else; the caller's JWT is resolved by GoTrue; participation is checked with the service role; every note id the model cites is checked against the notes we read ourselves before it can count.

## The independence invariant, enforced three times
1. **Database (cannot):** `notes` policies let a participant read, write and delete their own rows and nobody else's — by any route, including a hand-crafted PostgREST call. `sql/03_rls.sql`, stage S5, applied last.
2. **The one DB module (does not):** `src/lib/supabase.ts` is the only file that calls `.from()` / `.rpc()`. Its single read of `notes.body` is filtered to the current participant. Everything about other observers comes from SECURITY DEFINER functions that return names, colours and integers (`get_roster`, `get_public_roster`) or ids (`get_finding_observers`) and are structurally incapable of returning note text. `scripts/independence-audit.mjs` fails CI on any violation.
3. **The UI (will not):** roster items have no click, hover, title or sheet at any breakpoint; grid cells carry no tooltip; a note card exists only in the observer's own lane.

`notes` is never added to a Realtime publication: Supabase Realtime does not apply RLS to DELETE events, and with replica identity full the old row — including the body — would ride in the payload. Capture polls.

## Synthesis, and why the number is ours
`api/synthesise.py` reads every lane with the service role, relabels observers `Observer 1…N` (display names and participant uuids never reach the model), and makes **one** `generateContent` call walking a schema ladder (`responseJsonSchema` → `responseSchema` → plain JSON). The model returns *which note ids support each theme*. Our code drops ids it never sent, maps the rest to participants, counts **distinct** participants, and ranks: observer count ↓, supporting notes ↓, disagreement first, model order. `observer_count` and `rank` are never accepted from the model. Re-synthesis replaces findings; it never appends.

## Data
MVP: `sessions`, `participants`, `notes`, `findings` + five SECURITY DEFINER functions (`is_participant`, `get_roster`, `get_public_roster`, `get_finding_observers`, `lookup_session_by_code`) and one SECURITY DEFINER trigger that assigns `colour_index` server-side. MVP+ adds `profiles`, `workspaces`, `memberships`, `projects`, `actions`, `action_checkins`, `comments`, `notifications`, `followup_runs` — workspace-scoped policies that never touch the `notes` policies. See `sql/README.md` for the run order.

## Sync
3-second polling + a 5-second heartbeat during capture (`src/lib/sync.ts`), with catch-up on `visibilitychange`/`online`. Realtime is reserved, behind `VITE_USE_REALTIME`, for post-synthesis surfaces (comments, board, inbox) — "independent input, collaborative output".

## Tests and gates
- `tests/python` — the engine's contract (validator, ranking, hallucinated-id discard, distinct counting, the ladder, every status code) against the real handler.
- `tests/unit` — lib utilities; `auth` asserts that nothing but `ensureUser()` ever signs in.
- `scripts/independence-audit.mjs` — ten rules, run in CI and before every push; rule 10 is the format-agnostic secret gate.
- `RUNBOOK.md §4` — the incognito checklist on the production URL; `sql/99_verify.sql` after each RLS stage.
