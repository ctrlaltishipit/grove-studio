# GroveStudio

Notes that don't stop at being notes. Write together in shared spaces —
live, like a doc. Keep private spaces only you can see. A board turns notes
into assigned, deadlined tasks; assignments notify their owner instantly;
gentle check-ins keep work moving. The Studio (ask, summaries, audio/video overviews, mind maps,
infographics) is live — grounded per-user in only the notes you can read,
powered by Gemini (ask/summary/mind map/audio) and Claude (video slides,
infographics).

## Stack

- Vite + React 18 + react-router v6. Plain CSS custom properties, no UI kit.
- Supabase: Postgres + RLS, Google OAuth + anonymous guest auth, realtime
  broadcast/presence for live co-writing, polling as the sync safety net.
- A studio sidecar (`server/*.mjs`, Express) holds the AI keys: Gemini +
  Claude. Vite proxies `/api` to it; `npm run dev` starts both.
- Fonts: Inter / Source Serif 4 / JetBrains Mono.
- Dictation via the browser's Web Speech API — nothing uploaded, ever.

## Run

See `SETUP.md`. Short version:

```bash
npm install
npm run dev        # → http://localhost:3000
```

Fill `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and paste
`sql/06_grovestudio.sql` into the Supabase SQL editor once.

## Layout

- `src/lib/api.js` — the only module that talks to the database.
- `src/lib/live.js` — presence + broadcast + polling for an open space.
- `src/lib/dictation.js` — speech-to-text, appended, never auto-submitted.
- `src/routes/` — Landing, SignIn, Home (dashboard), Space (notes / board / studio).
- `sql/06_grovestudio.sql` — the redesign's backend add-on (idempotent).

`GROVE-MEMORY.md` is the living product memory — read it before changing
strategy-level things; append what you learn.
