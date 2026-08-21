# Grove

Notes from three people who could not see each other. Grove ranks findings by
how many observers independently noted them.

- `GROVE-MEMORY.md` — the living memory file. Read it first; append, dated.
- `RUNBOOK.md` — every account, key and step from an empty Supabase project to a live URL.
- `docs/` — design system, architecture, API keys.
- `sql/` — schema, functions, staged RLS, seeds. Run in numeric order; RLS last.
- `api/` — stdlib-only Python functions for Vercel. The only place secrets exist.
- `src/lib/supabase.ts` — the ONE module that talks to the database.

Scripts: `npm run dev` · `npm run build` · `npm test` · `npm run test:py` · `npm run audit` · `npm run e2e`.
