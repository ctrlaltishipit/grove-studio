# scripts/

Tooling that runs from a shell, never from the app. Nothing here ships to the
client bundle or to Vercel (`vercel.json` excludes `scripts/**` from the
functions).

## independence-audit.mjs — `npm run audit`

The mechanical form of GROVE-MASTER.md §14.1 (the independence gate) and §14.2
(the secret gate). Node 20 or later, zero dependencies, no network. It walks the
repo and applies ten rules: database calls (`.from(`, `.rpc(`, `createClient(`)
live only in `src/lib/supabase.ts`; every `from('notes')` statement there is
filtered to `participant_id` and selects named columns, never `*`;
`signInAnonymously` appears exactly once (in `src/lib/auth.ts`) and `ensureUser`
is imported only by the Create and Join routes; `/rest/v1/notes` appears exactly
once in `api/synthesise.py` and nowhere else in `api/`; no `security definer`
SQL body mentions `body` and nothing adds `notes` to a Realtime publication;
only the three public `VITE_` variables exist; a built `dist/` carries no
server-secret name; the roster rail, roster strip, convergence grid cells and
observer chip carry no handlers or `title` tooltips beyond what §8 allows;
product copy in `.tsx` has no exclamation marks and none of the words Grove does
not use; and no file git would commit (except Markdown and `.env.example`)
contains a secret-shaped value. Every hit prints as `RULE n: path:line — text`
(secret values are redacted) and the exit code is 1; a clean tree prints
`independence audit: clean`. CI runs it after `npm run build` so the `dist/`
rule is exercised. Pass a path as the only argument to audit another checkout.

## gen-types.mjs — `npm run gen:types`

Regenerates the TypeScript `Database` types under `src/lib/` from the live
Supabase schema, so the client's row types are derived from the SQL in `sql/`
rather than typed by hand. It reads `SUPABASE_ACCESS_TOKEN` (a personal access
token) and `SUPABASE_PROJECT_REF` from your shell, as listed in the "tooling
only" block of `.env.example`; neither belongs in the repo or in any Vercel
environment. Run it after applying a schema change in numeric order and commit
the regenerated file with the SQL that caused it.

## gemini-probe.py

A pre-deploy check for the synthesis provider. Standard library only; run it
with `LLM_API_KEY` and `LLM_MODEL` in the environment. It lists the models the
key can see and reports whether `LLM_MODEL` is among them, then walks the same
schema ladder `api/synthesise.py` uses (`responseJsonSchema`, then the OpenAPI
`responseSchema`, then plain JSON) with one tiny `generateContent` call per
rung, printing the status, the latency and whether the reply parsed as JSON. It
prints nothing secret. If the model is not listed or every rung fails, fix the
Vercel environment before demo time rather than discovering it on stage.
