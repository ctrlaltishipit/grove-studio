# GroveStudio — local setup

## Run it

```bash
npm install
npm run dev        # → http://localhost:3000
```

`.env.local` needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (already
filled in on this machine). The app fails loudly on the sign-in screen if
they're missing.

## One backend step still pending

The live Supabase project already has the spaces backend (projects, members,
notes with private/shared visibility). The redesign adds boards, assignments
and notifications on top. **Paste `sql/06_grovestudio.sql` into the Supabase
SQL editor (dashboard → SQL Editor → New query → run) once.** It is
idempotent. Until then the app runs fine but shows a setup note where the
board and bell would be, and co-editing someone else's shared note is
view-only.

What the file adds:

- `projects.kind` — private vs shared spaces
- `tasks` — the board and the dashboard's "Assigned to you"
- `notifications` — the bell, assignment + check-in pings
- an RLS policy letting members co-edit **shared** notes (private notes stay
  author-only)
- a heartbeat policy and best-effort realtime publication

## Google sign-in

The Google provider is already enabled on the Supabase project, so "Continue
with Google" works out of the box **if** the redirect back to
`http://localhost:3000` is allowed:

- Supabase dashboard → Authentication → URL Configuration
- Site URL `http://localhost:3000` (or add `http://localhost:3000/**` to
  Additional Redirect URLs alongside the production URL).

Guest sign-in (anonymous auth, already enabled) needs nothing and is the
quickest way to test — including multi-user: open a second browser or
incognito window, join with the space's six-character code, and watch live
presence + co-writing. Two tabs of the SAME browser profile share one
identity — that proves nothing.

## The Studio

The Studio is the right-hand rail (persistent; minimizes to a floating button).
It grounds every generation in **only the notes the signed-in user can read** —
the sidecar fetches notes under that user's own Supabase JWT, so RLS enforces
isolation. Scope defaults to the space you're viewing (or all your spaces on
the dashboard); click the circle on any space/note card to narrow it, and
multi-select across cards.

Engines (keys in `.env.local`, read only by the sidecar, never shipped to the
browser):

- **Gemini** (`LLM_API_KEY`) — Ask, Summary, Mind map, and the Audio overview
  (two-host script + multi-speaker TTS, assembled to a WAV in-process).
- **Claude** (`ANTHROPIC_API_KEY`) — the Video overview slides and the
  Infographic (each artboard is model-authored HTML, sanitized server-side and
  rendered in a sandboxed iframe). The video's slide narration is voiced by
  Gemini.

`npm run dev` starts BOTH the Vite app and the studio sidecar (via
`concurrently`); Vite proxies `/api` to it. If the AI keys are missing the app
still runs — the studio shows a clear message instead of generating.

## Email invites (SMTP)

Inviting someone by email (from a space's **Share**, or the dashboard **Share**)
adds them to the space if they already have an account **and** emails them a
join link + the space's code. The link (`/app?join=CODE`) prefills the join
box; a recipient with no account signs in first (Google or guest), then the
code drops them in.

Sending needs SMTP creds in `.env.local` (server-only — read by the sidecar,
never shipped to the browser):

```
APP_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false          # true for port 465
SMTP_USER=you@example.com
SMTP_PASS=your-app-password
SMTP_FROM=GroveStudio <you@example.com>
```

Any SMTP provider works (Gmail app password, SendGrid/Mailgun/Postmark, …).
`/api/studio/health` reports `email: true` once they're set. **Until then,
invites still work** — existing users are added and the UI shows the code to
share by hand; no email is sent. The pipeline is verified end-to-end, so once
your creds are in, real mail goes out.

## Dictation

The mic button in the note editor uses the browser's Web Speech API
(Chrome/Edge/Safari; Firefox doesn't ship it, so the button doesn't render
there). Speech is appended to the note through the same path as typing —
saved, broadcast live, never auto-submitted. The mic stops when the tab is
hidden and after 60s of continuous listening.

## What's wired vs. preview

| Area | Status |
|---|---|
| Google + guest auth, profiles | real |
| Spaces (private/shared), join codes | real |
| Notes, autosave, live co-writing, presence, dictation | real |
| Board, assignments, notifications, check-ins | real once sql/06 is applied |
| Studio (ask, summary, audio, video, mind map, infographic) | real — needs the AI keys below and the studio sidecar (started by `npm run dev`) |

## Deploy

`vercel.json` still routes `/api/*` to the Python function and everything
else to the SPA. The old deploy sequence in `RUNBOOK.md` still applies for
hosting; the SQL list there predates the redesign — `sql/06_grovestudio.sql`
is the only file the redesign needs on top of the already-applied backend.
