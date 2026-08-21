# Grove v1 — runbook: from an empty Supabase project to a live URL

Everything here is done in a browser; nothing needs a CLI. Times are honest
estimates. Do the steps in order — each one is a gate for the next.

## 0. Accounts you need (once)
- GitHub (the repo), **Vercel** (vercel.com → *Continue with GitHub*, Hobby),
  **Supabase** (free tier: two projects), **Google AI Studio** key
  (aistudio.google.com → *Get API key*). See `docs/API-KEYS.md` for which key
  is asked for in which phase.

## 1. Supabase — the database (15 min)
1. New project · region **Mumbai (ap-south-1)** · save the database password somewhere safe (you will not need it for Grove).
2. **Authentication → Providers → Anonymous sign-ins: ON.** (Guests join by code with no account.)
3. **SQL Editor**, run the files from `sql/` in this order, one file per run, reading the result of each:
   1. `01_schema.sql` — four tables, the join-code generator, the colour trigger.
   2. `02_functions.sql` — the five SECURITY DEFINER functions (roster counts, stakeholder roster, finding observers, is_participant, lookup by code).
   3. `04_demo_seed.sql` — the `GRVDEM` demo session (3 observers, 24 notes, one planted disagreement).
   4. **Not yet:** `03_rls.sql`. RLS is hardening applied to a working app. Run it in §5.
4. **Settings → API**: copy *Project URL*, *anon public* key, *service_role* key. The service_role key is a secret — it only ever goes into Vercel (§3) and `.env.local`.

## 2. Local run (5 min, optional but recommended)
1. Copy `.env.example` to `.env.local`; fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`, `LLM_MODEL`.
2. `npm install` then `npm run dev` → http://localhost:5173. `/api/*` does not run under Vite; synthesis is tested on the Vercel preview URL (§3).
3. `npm test` (unit), `npm run test:py` (the engine's contract), `npm run audit` (the independence audit) must all pass before a push.

## 3. Vercel — the live URL (10 min)
1. Push the repo to GitHub. **Confirm `.gitignore` was committed before any `.env` file existed** — `git log --oneline | tail -1` is the ignore commit.
2. Vercel → *Add New → Project* → import the repo. Framework preset **Vite**. Build `npm run build`, output `dist`.
3. Environment Variables (Production + Preview):

   | Name | Value | Secret? |
   |---|---|---|
   | `VITE_SUPABASE_URL` | Project URL | no (public by design) |
   | `VITE_SUPABASE_ANON_KEY` | anon public key | no (public by design) |
   | `SUPABASE_URL` | Project URL | — |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **yes** |
   | `LLM_API_KEY` | AI Studio key | **yes** |
   | `LLM_MODEL` | see `docs/API-KEYS.md` (current default is in `api/synthesise.py`) | — |
   | `CRON_SECRET` | `openssl rand -hex 32` (Phase 7) | **yes** |
   | `APP_URL` | the deployment URL (Phase 7) | — |

   Never create a variable starting with `VITE_` for a secret. Leave `VITE_USE_REALTIME` unset.
4. Deploy. Rename the project to something readable (Settings → General).

## 4. Verify on the production URL — do not skip (10 min)
Open a **fresh incognito window** (and a second browser or device for the multi-user steps — two tabs of one profile share the same anonymous identity and prove nothing).

1. `https://<app>/api/synthesise` → JSON `{"ok":false,"code":"METHOD_NOT_ALLOWED",…}`, not HTML. (Proves the SPA rewrite is not swallowing `/api/*`.)
2. `https://<app>/api/health` → `"configured": true, "missing": []`.
3. Home → Join → code `GRVDEM` → a display name → the roster reads **Priya R. 8 · Arjun M. 8 · Nikhil S. 8** and your own row.
4. Refresh `/s/<id>` — it loads, no 404.
5. Second browser: join `GRVDEM` with another name. Write a note in each. Counts move within 3 s in both. DevTools → Network → filter `notes`: **every response contains only your own note bodies**.
6. Synthesise → under 30 s → a 3-of-4 insurance-step finding at the top, an amber cost-vs-wait disagreement, grey single-observer findings, the convergence grid, the receipt.
7. A third browser that never joined opens `/s/<id>/findings` — it loads with no sign-in and no request to `/auth/v1/`.
8. `npm run audit` green and `git grep -nE "(service_role|AIza|AQ\.)" -- . ':!*.md' ':!.env.example'` prints nothing.

## 5. Row Level Security — one stage at a time (15 min)
Only after §4 is green. Open `sql/03_rls.sql` and run **one stage per SQL-editor run**, re-doing §4 steps 3–7 after each. The rollback block at the bottom of the file undoes a stage if anything breaks; give each stage 15 minutes, then roll back rather than debug under pressure.

- S2 `findings` → S3 `sessions` → S4 `participants` → S5 `notes` (last — it is the private lane).
- After S5, run `sql/99_verify.sql` as described in `sql/README.md`: as observer B you must see **zero** of observer A's notes by any route.

## 6. Demo-day hazards
- Free Supabase projects **pause after a week idle** — open the live URL the morning of the demo.
- Anonymous sign-in is capped at ~30/hour/IP — pre-join every demo identity the day before, and demo from two networks (one on mobile data).
- Vercel Hobby keeps function logs for **one hour** — read a failure's log while it is fresh.
- `LLM_MODEL` is an env var on purpose: if Google retires an id, change the variable and redeploy — no code change.

## 7. What changes in MVP+ (Phases 5–7)
`sql/05_mvp_plus.sql` → `sql/06_mvp_plus_rls.sql` → `sql/07_realtime.sql`; Supabase Auth: *Enable manual linking*, the Google provider, URL configuration; Vercel: `CRON_SECRET`, `APP_URL`, and the cron appears in the project's *Cron Jobs* tab after the next deploy. Each phase's section is appended here when it ships.
