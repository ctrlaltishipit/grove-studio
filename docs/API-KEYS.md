# API keys and accounts — what, where, when

Grove needs four services and no others. Every secret lives in exactly one of
two places: `.env.local` on your machine (git-ignored) or the Vercel project's
Environment Variables. **Never in `.env.example`, never in a commit, never in
chat.** The secret gate in `scripts/independence-audit.mjs` and CI refuses to
merge a key-shaped string.

## The schedule — when you are asked for what

| Phase | You create | You paste (where) | Why now |
|---|---|---|---|
| **Part 0 — tonight's submission** | Vercel account (vercel.com → Continue with GitHub). Supabase project (ap-south-1) with **Authentication → Anonymous sign-ins** enabled. | Into the Vercel project env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY` (the AI Studio key), `LLM_MODEL` (see RUNBOOK for the current model id). | The live URL is the hard submission gate. |
| **Phase 1 — v1 schema** | A *second* Supabase project for v1 (free tier allows two) with Anonymous sign-ins on. A Personal Access Token (Supabase → Account → Access tokens). | URL + anon key → `.env.local` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; service_role → `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`; PAT → `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` in `.env.local` (used once by `npm run gen:types`). | Schema, RLS and generated TypeScript types. |
| **Phase 4 — first v1 deploy** | A second Vercel project pointing at the v1 repo. `CRON_SECRET` = output of `openssl rand -hex 32`. `APP_URL` = the deployment URL. | Vercel env: the six Part-0 names plus `CRON_SECRET`, `APP_URL`. | Walking skeleton on a public URL. |
| **Phase 5 — sign-in for workspace members** | Supabase → Authentication → **Enable manual linking**. Google Cloud console → OAuth client (Web) with redirect `https://<project-ref>.supabase.co/auth/v1/callback`; paste its id/secret into Supabase → Auth → Providers → Google. Add the Vercel URL to Auth → URL configuration. | Supabase dashboard only. Nothing enters the repo. | Magic link + Google for permanent accounts. |
| **Phase 7 — follow-up agent** | Nothing new. Vercel Cron reads `CRON_SECRET` from Phase 4. | — | Daily reminders, in-app only. |
| Never | No email, WhatsApp, Slack, payment or analytics keys — by decision (22 Aug 2026). | — | — |

## Which variable is public and which is secret

| Variable | Reaches the browser? | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | **Yes — by design.** Vite inlines every `VITE_`-prefixed variable into the bundle. | The anon key is publishable; Row Level Security is the boundary, not key secrecy. |
| `VITE_USE_REALTIME` | Yes | Leave unset in production (polling is the shipping path). |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Never | Only `api/*.py` reads them. The service role bypasses RLS. |
| `LLM_API_KEY`, `LLM_MODEL` | Never | Google AI Studio key; the model id is an env var so a retired id is fixed without a deploy. |
| `CRON_SECRET`, `APP_URL`, `ALLOWED_ORIGIN` | Never | Guard and base URL for `api/followup.py`. |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | Never | Tooling only (`scripts/gen-types.mjs`); your shell, not Vercel. |

**If you ever type `VITE_LLM_API_KEY` (or any `VITE_` secret): stop, delete the variable, and rotate the key.** It is already in a build artefact.

## Rotating a key
1. Create the new key in the provider's console.
2. Update the Vercel env var and `.env.local`.
3. Redeploy (Vercel env changes need a redeploy, not just a save).
4. Delete the old key in the provider's console.

## Cost and data notes
- Google AI Studio free tier: content may be used by Google to improve products. Fine for the demo seed; switch the key to a paid tier before real customer research flows through.
- `gemini-2.5-flash` and `gemini-2.5-flash-lite` are **no longer available to new keys** (verified 22 Aug 2026, HTTP 404). Use a 3.x Flash model; RUNBOOK.md names the current default.
- Supabase free tier: two projects; a project pauses after a week idle — open the live URL the morning of any demo.
- Vercel Hobby: non-commercial use only; cron once a day; function logs kept one hour.
