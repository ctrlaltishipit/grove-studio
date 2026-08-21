# Grove — deploy runbook (zero → live URL)

Follow in order. Nothing here is optional except the parts marked optional.
Budget: ~45 minutes the first time. Every command is copy-paste.

---

## Phase 0 — accounts (20 min, do these in parallel tabs)

1. **GitHub** — you have one. Create an empty repo named `grove-app`
   (Private is fine; do NOT add a README — the folder already has one).
2. **Supabase** — supabase.com → New project. Name `grove`, region
   `ap-south-1 (Mumbai)`, generate a strong DB password and save it in your
   password manager. Wait for provisioning (~2 min).
3. **Vercel** — vercel.com → sign up **with your GitHub account** (this is
   what makes deploys automatic).
4. **Google AI Studio** — aistudio.google.com → Get API key → Create key. The free tier is enough for the demo (note: free-tier content is used by Google to improve products; switch to a paid key before real customer research).

## Phase 1 — Supabase setup (10 min)

In the Supabase dashboard for your project:

1. **SQL Editor** → paste and run, IN THIS ORDER, one file at a time:
   - `sql/01_schema.sql`   (tables — run the whole file)
   - `sql/03_functions.sql` (roster functions — yes, before 02; 02 is only
     needed for Realtime and errors harmlessly if re-run)
   - `sql/02_publication.sql` (run it, then run its VERIFY query and read
     the output: findings, notes, participants, sessions)
   - `sql/05_seed_demo.sql`  (the demo fixture — verify the query at the
     bottom returns 8 / 8 / 8)
   - Do **NOT** run `04_rls_staged.sql` yet. RLS comes after the app works.
2. **Authentication → Sign In / Up → Anonymous sign-ins → Enable.** This is
   a toggle and it is mandatory; without it nobody can join.
3. **Project Settings → Data API**: copy the **Project URL** and the
   **anon public** key. **Settings → API keys**: copy the **service_role**
   key (keep it out of the repo, forever).

## Phase 2 — push the code (5 min)

In Terminal, from the `grove-app` folder on your Desktop:

```bash
cd ~/grove-submission
git init
git add .gitignore && git commit -m "gitignore first"
git add -A && git commit -m "Grove MVP"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/grove-app.git
git push -u origin main
```

(`.gitignore` is committed before anything else on purpose — no `.env` can
ever be committed by accident.)

## Phase 3 — Vercel deploy (10 min)

1. vercel.com → **Add New → Project** → Import `grove-app`.
2. Framework preset: **Vite** (it usually auto-detects).
3. **Environment Variables** — add ALL of these before the first deploy:

| Name | Value | Note |
|---|---|---|
| `VITE_SUPABASE_URL` | your Project URL | public, fine |
| `VITE_SUPABASE_ANON_KEY` | the anon public key | public by design |
| `SUPABASE_URL` | same Project URL | for the Python function |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key | SECRET — never VITE_ |
| `LLM_API_KEY` | your Google AI Studio key | SECRET — never VITE_ |
| `LLM_MODEL` | `gemini-2.5-flash` | optional, this is the default; `gemini-3.7-flash` also works |

   Leave `VITE_USE_REALTIME` **unset**. Polling is the shipping config.
4. **Deploy.** You now have `https://grove-app-<something>.vercel.app`.

## Phase 4 — verify (10 min, do every step)

1. Open the URL in a **fresh incognito window**. It loads, correct theme,
   no console errors.
2. `https://<your-url>/api/synthesise` in the browser → returns JSON with
   `METHOD_NOT_ALLOWED` (405). If you see the app's HTML instead, the
   rewrite is wrong — check `vercel.json` was deployed.
3. **Join** with code `GRVDEM` and your name → your empty lane appears,
   roster shows Priya 8 · Arjun 8 · Nikhil 8 (and you).
4. Type two notes. Refresh `/s/<id>` — it loads, does not 404, notes intact.
5. Press **Synthesise** → ranked findings in under 30 s, corroboration
   badges loudest, the cost-vs-wait disagreement in amber, single-observer
   findings honest grey.
6. Open a SECOND incognito window (or another browser) → Join `GRVDEM` with
   a different name → write a note → within 3 s the first window's roster
   count updates. **Neither window can see the other's note text** — check
   DevTools → Network → filter `notes` → inspect every payload.
7. In a THIRD window that never joined: open `/s/<session-id>/findings` —
   it loads read-only. That is the absent-stakeholder path.

## Phase 5 — RLS (only after Phase 4 is fully green)

Apply `sql/04_rls_staged.sql` ONE STAGE at a time (S2 → S3 → S4 → S5),
re-running the Phase 4 checks after each stage. If a stage breaks the demo
and 15 minutes don't fix it: disable RLS for that table (rollback block at
the bottom of the file), commit, and say so honestly in the deck.

## Phase 6 — demo prep

- Fresh session for the live part; keep GRVDEM as the safety net.
- Rehearse: create → two browsers join → both type → synthesise → findings.
- Record the Loom against the production URL, never localhost.
- Stop building 4 hours before the deadline. Deck, Loom, submit.

## If something fails

| Symptom | Cause | Fix |
|---|---|---|
| Join says "No session with that code" | seed not run / RLS too early | Re-run 05, keep RLS off |
| "Not configured" notice in app | VITE_ env vars missing | Add in Vercel → Redeploy |
| Synthesise → "didn't complete" | check Vercel → Functions → logs | Usually a missing server env var |
| /api/synthesise returns HTML | rewrite swallowed /api | vercel.json missing from deploy |
| Roster stuck at 0 for others | you're in two tabs of one profile | Use incognito + normal, or two browsers |
| 401 on synthesise | anonymous sign-in not enabled | Supabase Auth toggle, then reload |
