# api/

`index.mjs` is the one Vercel serverless function. It imports the Express
sidecar from `server/index.mjs` and serves ALL `/api/*` routes in production —
the studio tools, `/api/invite` (SMTP email), and `/api/studio/health`.
`vercel.json` rewrites every `/api/*` request to it.

Locally this file is unused: `npm run dev` starts the same Express app as a
listening sidecar on :8787 and Vite proxies `/api` to it.

The old `synthesise.py` (and root `requirements.txt`) belonged to the
pre-redesign app and were removed — no code calls `/api/synthesise` any more,
and with it gone no `SUPABASE_SERVICE_ROLE_KEY` exists anywhere in the deploy.
