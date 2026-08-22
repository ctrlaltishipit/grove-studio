// =============================================================================
// GroveStudio studio server — Express sidecar started alongside Vite by
// `npm run dev` (the MT_V2 shape: Vite proxies /api here). Hosts everything
// the SPA can't do in the browser: the Gemini + Claude calls, with the AI
// keys living only in this process.
//
// AUTH: every /api/studio route requires the caller's Supabase JWT. Notes are
// fetched under that JWT so RLS decides visibility — user-to-user isolation
// is enforced by the database, not by this code being careful.
// =============================================================================

import express from 'express';
import { pathToFileURL } from 'node:url';
import { verifyUser, fetchScope, supabaseConfigured, spaceBrief, callerName, inviteMember } from './notes.mjs';
import { geminiConfigured } from './gemini.mjs';
import { claudeConfigured } from './claude.mjs';
import { emailConfigured, sendInviteEmail } from './email.mjs';
import * as studio from './studio.mjs';

// Invite links point here. APP_URL wins when set; otherwise production
// (Vercel) uses the real domain and local dev uses the Vite port.
const APP_URL = process.env.APP_URL
  || (process.env.VERCEL ? 'https://www.grovestudio.io' : 'http://localhost:3000');
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// The built-in sample space (mirrors src/lib/demoData.js). It has no DB row
// or membership, but invites to it still send a real email — the demo's
// share flow works end-to-end, and the SAMPLE code drops recipients into
// the sample, which every signed-in account sees.
const DEMO_SPACE = { id: 'demo-grovestudio', name: 'Getting started with GroveStudio', joinCode: 'SAMPLE' };

const PORT = Number(process.env.STUDIO_PORT || 8787);
const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/studio/health', (_req, res) => {
  res.json({
    ok: true,
    supabase: supabaseConfigured(),
    gemini: geminiConfigured(),
    claude: claudeConfigured(),
    email: emailConfigured(),
  });
});

// ---- auth + scope middleware ----------------------------------------------

async function withUser(req, res, next) {
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const user = await verifyUser(token);
    if (!user) return res.status(401).json({ error: 'Sign in to use the studio.' });
    req.userToken = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function needs(engine) {
  return (_req, res, next) => {
    if (engine === 'gemini' && !geminiConfigured()) {
      return res.status(503).json({ error: 'Gemini is not configured — set LLM_API_KEY in .env.local and restart.' });
    }
    if (engine === 'claude' && !claudeConfigured()) {
      return res.status(503).json({ error: 'Claude is not configured — set ANTHROPIC_API_KEY in .env.local and restart.' });
    }
    next();
  };
}

async function loadScope(req, res) {
  const scope = await fetchScope(req.userToken, req.body?.scope ?? {});
  if (!scope.notes.length) {
    res.status(422).json({ error: 'No readable notes in this scope — write a note or widen the selection.' });
    return null;
  }
  return scope;
}

const route = (engine, fn) => [
  needs(engine),
  async (req, res) => {
    try {
      const scope = await loadScope(req, res);
      if (!scope) return;
      res.json(await fn(scope, req));
    } catch (e) {
      console.error(`[studio] ${req.path} failed:`, e.message);
      res.status(500).json({ error: e.message });
    }
  },
];

// ---- the six tools ---------------------------------------------------------

app.post('/api/studio/summary', withUser, ...route('gemini', (scope) => studio.summary(scope)));
app.post('/api/studio/notebrief', withUser, ...route('gemini', (scope) => studio.notebrief(scope)));
app.post('/api/studio/ask', withUser, ...route('gemini', (scope, req) =>
  studio.ask(scope, req.body?.question ?? '', req.body?.history ?? [])));
app.post('/api/studio/mindmap', withUser, ...route('gemini', (scope) => studio.mindmap(scope)));
app.post('/api/studio/audio', withUser, ...route('gemini', (scope) => studio.audio(scope)));
app.post('/api/studio/video', withUser, needs('gemini'), ...route('claude', (scope) => studio.video(scope)));
app.post('/api/studio/infographic', withUser, ...route('claude', (scope) => studio.infographic(scope)));

// ---- invite a person to a space by email -----------------------------------
// Adds them as a member if they already have an account, and emails them a
// join link + code (once SMTP is configured). Works either way.
app.post('/api/invite', withUser, async (req, res) => {
  try {
    const projectId = String(req.body?.projectId ?? '');
    const email = String(req.body?.email ?? '').trim();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'That doesn’t look like an email address.' });

    const isDemo = projectId === DEMO_SPACE.id;
    const brief = isDemo
      ? { name: DEMO_SPACE.name, joinCode: DEMO_SPACE.joinCode }
      : await spaceBrief(req.userToken, projectId);
    if (!brief) return res.status(403).json({ error: 'You can only invite people to a space you belong to.' });

    // Membership add (existing accounts) — best effort, never blocks the
    // email. The sample has no membership to add to.
    let member = { invited: false };
    if (!isDemo) {
      try { member = await inviteMember(req.userToken, projectId, email); } catch { /* email still goes */ }
    }

    let emailed = false;
    let emailError = null;
    if (emailConfigured()) {
      try {
        const inviterName = await callerName(req.userToken, req.user);
        const joinUrl = `${APP_URL}/app?join=${encodeURIComponent(brief.joinCode)}`;
        await sendInviteEmail({ to: email, inviterName, spaceName: brief.name, code: brief.joinCode, joinUrl });
        emailed = true;
      } catch (e) {
        emailError = e.message;
        console.warn('[invite] email send failed:', e.message);
      }
    }

    res.json({
      ok: true,
      emailed,
      emailConfigured: emailConfigured(),
      emailError,
      alreadyMember: !!member.already,
      addedMember: !!member.invited && !member.already,
      name: member.name ?? null,
      spaceName: brief.name,
      code: brief.joinCode,
    });
  } catch (e) {
    console.error('[invite] failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Listen only when run directly (`npm run studio` / `npm run dev`). On Vercel
// this module is imported by api/index.mjs, which serves the app per-request —
// binding a port there would be meaningless.
const runDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (runDirectly) {
  app.listen(PORT, () => {
    console.log(`[studio] serving on http://localhost:${PORT} · supabase:${supabaseConfigured()} gemini:${geminiConfigured()} claude:${claudeConfigured()}`);
  });
}

export default app;
