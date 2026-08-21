# Grove

Several people observe the same research session. Each writes notes in a
private lane — they can see that others are writing, never what they wrote.
One synthesis call merges every lane into findings ranked by how many
distinct observers independently noted each one, with disagreements flagged
rather than resolved.

Every AI notetaker computes from one audio stream. Grove computes from N
independent human interpretations. Corroboration across independent observers
is information no transcript contains.

## Stack

One repo, one host, one database, one AI key.

- Vite + React 18 + react-router v6. Plain CSS custom properties. No UI kit.
- Supabase: Postgres + anonymous auth. Polling sync by default (`VITE_USE_REALTIME` unset).
- One Vercel Python function, `api/synthesise.py`, standard library only.
- Anthropic Messages API (`claude-sonnet-5`), called only from the function.

## Run it

See `RUNBOOK.md` for the full deploy sequence (Supabase → GitHub → Vercel).
Local dev:

```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

`npm run dev` serves the SPA only. The synthesis endpoint needs `vercel dev`
(or the deployed URL) because it is a Python function.

## The independence invariant

Never write a query, component, API response, log line, tooltip or test
fixture that exposes another participant's note body. The roster shows counts
only. `src/lib/data.js` is the only module that talks to the database, and
`listMyNotes` is the only client read of note bodies — always filtered to the
caller's own participant id. RLS stage S5 makes it impossible, not just wrong.

## Project memory

`CLAUDE.md` (repo root) is the build memory — read it before changing
anything. `GROVE-MEMORY.md` is the living product memory — append what you
learn, prune what proved false.
