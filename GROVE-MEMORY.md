# GROVE-MEMORY.md — the self-learning memory file

> Purpose: one file the whole team (and any AI agent) reads first and appends
> to as we learn. The end goal is the objective; everything in here either
> serves it or gets pruned. Newest learnings at the top of each section.
> Update discipline: date every entry, IST. Never delete a falsified belief —
> move it to §6 with what replaced it.

## 0. The objective (stable)

Make corroboration across independent human observers a product: capture in
private lanes, merge on demand, rank findings by distinct-observer count,
flag disagreement without resolving it. First for UX research / discovery
teams and consultancies; hackathon demo is milestone one, not the product.

## 1. Current state — update every session

- 2026-08-21 (late) · THE FORK: a second, parallel build discovered in the
  folder — FastAPI+HTMX on branch `python` (Gemini synthesis, edge-tts
  podcast, mind map stretch, solo mode), governed by GROVE-MASTER.md v2.
  Neither build deployed. Nine-review panel verdict (3 lenses x 3 model
  tiers): Plan A "finish FastAPI" dead (0/9 votes, 23.2/50). Plan B "ship
  verified React" 40.4/50, 4 votes. Plan C "insurance then converge"
  37.8/50, 5 votes. Adopted: B with C's option, split BY PERSON — founder
  deploys React tonight then does deck/Loom only; FastAPI continues only if
  someone else drives it, and claims the demo slot only by passing the full
  definition-of-done at T-6h. Full analysis: the Grove Dossier artifact.
- 2026-08-21 · Full React repo built and verified in cloud session (Vite
  SPA, 5 SQL files, Vercel function wired, build passes 107KB gz,
  independence audit clean). Delivered as grove-app.zip + RUNBOOK.md in
  chat. Deployed URL: PENDING — the only remaining hard gate.
- 2026-08-21 · Demo seed fixture written (`sql/05_seed_demo.sql`, join code
  GRVDEM, 24 notes / 3 observers, planted cost-vs-wait-time disagreement).
- 2026-08-21 · Strategy, PRD, BRD, TDD, design system, competitor scan,
  pitch deck: DONE (see `grove app/` docs pack). Team details still placeholders.

## 2. Locked decisions (do not relitigate without new evidence)

- Private lanes; NO shared editing, no CRDT/Yjs/OT — product and engineering
  reasons converge (collaborative inhibition d=0.54; OT bugs a decade in).
- Grove computes observer_count and rank from note ids; the model never does.
- No audio transcription, ever. It is the commoditised part, a closing
  distribution channel (Teams/Meet bot blocking), and a litigation surface.
- Polling ships as default; Realtime stays behind VITE_USE_REALTIME.
- No fifth table in MVP. Kanban/actions live in MVP+ (see §4), not now.
- The one claim we make: findings ranked by count of distinct human
  observers — absent across all 30 products scanned. "Private lanes" alone
  is NOT novel (Optimal Workshop, TeamRetro, Delve do versions of it).

## 3. Beliefs we hold with evidence (cite before pitching)

- Independent-then-pool beats together-in-a-room (Diehl & Stroebe 1987;
  Luo et al. 2024 meta-analysis; Lorenz et al. 2011). See SOURCES.md.
- The merge step itself is an UNTESTED hypothesis — the literature supports
  independent capture, not AI merging. Say so when asked.
- Real competitive threat: Condens (one visibility flag away), ~2 quarters.

## 4. Ideas parked with intent (the user's asks live here)

- 2026-08-21 · Trello-style Kanban "Decisions board": post-synthesis, turn
  each finding into an action card with an owner; assign/reassign across
  columns (To decide / Doing / Done). This is the consultancy-facing value
  step — findings → owned actions. Needs a fifth table (`actions`) and real
  auth. MVP+ headline feature. DO NOT build before the deadline.
- 2026-08-21 · Evernote-grade note organisation inside a lane: `kind` tags
  exist today (observation/quote/question); MVP+ adds filter/group by kind,
  pinning, and search within own lane. Cross-lane organisation stays
  impossible pre-synthesis by design.
- Projects layer: sessions grouped under a project with a rolling evidence
  base across sessions (v1.0, after MVP+).
- 2026-08-21 · Founder vision additions, phased: accountability loop
  (findings -> action cards, owners, deadlines, reminder scheduler, AI
  follow-up agent that chases status and escalates bottlenecks) = MVP+
  headline. Mind-map/infographic + ~7-min audio overview (edge-tts exists
  in the FastAPI branch; browser SpeechSynthesis fallback) = v1.0.
  "See others typing live" REJECTED for capture (destroys the moat;
  commodity elsewhere) — resolved as: independent input, collaborative
  output.

## 5. Known risks and traps (check before every deploy)

- Env var with VITE_ prefix = public. Never VITE_LLM_API_KEY.
- `/(.*)`` as Vercel rewrite swallows /api/*. The negative lookahead in
  vercel.json is load-bearing.
- Two tabs of one browser profile = one anon user. Multi-user tests need
  two profiles/incognito.
- `alter publication supabase_realtime add table ...` missing = silent dead
  Realtime. Applies only if the flag is ever flipped.
- Vercel Hobby is non-commercial. The moment Grove takes money → Pro.

## 6. Falsified beliefs (kept as scar tissue)

- "Private lanes are our novelty" — falsified 2026-08-21 by 30-product scan.
  Replaced by: distinct-observer ranking is the novelty.
- "Buddy is a good name" — replaced by Grove: the product refuses to be
  agreeable; a buddy is agreeable by definition.
- "$37bn wasted meetings" and kin — untraceable; never cite.

## 7. Open questions for the founder (answer → move up)

- Pricing hypothesis for consultancies: per-seat or per-session?
- Which 3 design-partner teams do we pilot with post-hackathon?
- Team details for the deck (group number, leader, WhatsApp) — still blank.
