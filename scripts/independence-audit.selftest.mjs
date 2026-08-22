#!/usr/bin/env node
// =============================================================================
// Grove — proof that the independence audit actually bites.
//
// A gate nobody has tried to defeat is decoration. The first version of
// independence-audit.mjs reported "clean" on a codebase that leaked every
// observer's notes three different ways; an adversarial review found the
// bypasses by hand. This file turns that review into a test.
//
// Each case below builds a throwaway repo in a temp directory and runs the
// real audit against it (the audit takes its root as argv[2]). The CLEAN
// fixture must pass. Every seeded violation must produce a hit on the named
// rule — if a rule stops catching its bypass, this exits non-zero and CI
// fails, which is the whole point.
//
//   node scripts/independence-audit.selftest.mjs
// =============================================================================
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AUDIT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'independence-audit.mjs');

/* ---------------------------------------------------------------- fixtures */

// The minimal shape of a compliant Grove tree. Every case starts from this and
// changes exactly one thing, so a hit can only come from the seeded violation.
const CLEAN = {
  'src/lib/supabase.ts': `
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);
const client: SupabaseClient | null = configured ? createClient(url, key) : null;
function db(): SupabaseClient { if (!client) throw new Error('not configured'); return client; }
export const authClient = () => db().auth;
export async function listMyNotes(sessionId: string, participantId: string) {
  const { data } = await db().from('notes').select('id, body, kind, created_at').eq('session_id', sessionId).eq('participant_id', participantId);
  return data ?? [];
}
export async function getRoster(sessionId: string) {
  const { data } = await db().rpc('get_roster', { p_session_id: sessionId });
  return data ?? [];
}
`,
  'src/lib/auth.ts': `
import { authClient } from './supabase';
export async function getCachedUser() { const { data } = await authClient().getSession(); return data.session?.user ?? null; }
export async function ensureUser() { const u = await getCachedUser(); if (u) return u; const { data } = await authClient().signInAnonymously(); return data.user; }
`,
  'src/routes/Create.tsx': `
import { ensureUser } from '../lib/auth';
export function Create() { void ensureUser; return <main>Create a session</main>; }
`,
  'src/routes/Join.tsx': `
import { ensureUser } from '../lib/auth';
export function Join() { void ensureUser; return <main>Join a session</main>; }
`,
  'src/ds/RosterRail.tsx': `
export function RosterRail({ roster }: { roster: { participant_id: string; display_name: string; note_count: number }[] }) {
  return <aside>{roster.map((p) => <li key={p.participant_id}>{p.display_name}<span>{p.note_count}</span></li>)}</aside>;
}
`,
  'src/ds/RosterStrip.tsx': `
export function RosterStrip({ roster, onToggle }: { roster: { participant_id: string }[]; onToggle: () => void }) {
  return <div><button type="button" onClick={onToggle}>{roster.length} observers</button></div>;
}
`,
  'src/ds/ConvergenceGrid.tsx': `
export function ConvergenceGrid({ rows }: { rows: { id: string; theme: string }[] }) {
  return <table><tbody>{rows.map((r) => <tr key={r.id}><th scope="row"><button type="button" onClick={() => focusCard(r.id)}>{r.theme}</button></th><td><span /></td></tr>)}</tbody></table>;
}
function focusCard(id: string) { document.getElementById(id)?.focus(); }
`,
  'src/ds/Chip.tsx': `
export function Chip({ name, colourIndex }: { name: string; colourIndex: number }) {
  return <span className="chip" data-colour={colourIndex % 5}><span aria-hidden="true">{name.slice(0, 2)}</span></span>;
}
`,
  'api/synthesise.py': `
import json
NOTES = "/rest/v1/notes?session_id=eq."
def handler():
    return json.dumps({"ok": True})
`,
  'api/README.md': 'The only functions here are Python.\n',
  'sql/01_schema.sql': `
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  participant_id uuid not null,
  body text not null
);
`,
  'sql/02_functions.sql': `
create or replace function public.get_roster(p_session_id uuid)
returns table (participant_id uuid, display_name text, note_count int)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, count(n.id)::int
  from public.participants p
  left join public.notes n on n.participant_id = p.id and n.session_id = p.session_id
  where p.session_id = p_session_id
  group by p.id;
$$;
`,
  'sql/03_rls.sql': `
alter table public.notes enable row level security;
create policy notes_select_own on public.notes for select to anon, authenticated
  using ( participant_id in (select pp.id from public.participants pp where pp.user_id = auth.uid()) );
-- ROLLBACK (commented on purpose — uncomment one line at a time)
-- alter table public.notes disable row level security;
`,
  '.env.example': 'VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...\n',
};

/* ------------------------------------------------------------------- cases */
// Each: the rule that must fire, a name, and the files it adds/overwrites.
const CASES = [
  [2, 'backtick from(`notes`) with no participant filter', {
    'src/lib/supabase.ts': CLEAN['src/lib/supabase.ts'].replace(
      "await db().from('notes').select('id, body, kind, created_at').eq('session_id', sessionId).eq('participant_id', participantId)",
      'await db().from(`notes`).select(`id, body`).eq(`session_id`, sessionId)',
    ),
  }],
  [2, 'participants select embedding notes(body)', {
    'src/lib/supabase.ts': `${CLEAN['src/lib/supabase.ts']}
export async function roster(sessionId: string) {
  const { data } = await db().from('participants').select('id, display_name, notes(id, body)').eq('session_id', sessionId);
  return data ?? [];
}
`,
  }],
  [2, 'select("*") on notes', {
    'src/lib/supabase.ts': `${CLEAN['src/lib/supabase.ts']}
export async function dump(sessionId: string) {
  const { data } = await db().from('notes').select('*').eq('session_id', sessionId).eq('participant_id', 'x');
  return data ?? [];
}
`,
  }],
  [2, 'from() with a non-literal table name', {
    'src/lib/supabase.ts': `${CLEAN['src/lib/supabase.ts']}
export async function any(table: string) { const { data } = await db().from(table).select('id'); return data ?? []; }
`,
  }],
  [1, 'raw fetch to /rest/v1/notes from a route', {
    'src/routes/Leak.tsx': `
export async function Leak() {
  const res = await fetch(\`\${import.meta.env.VITE_SUPABASE_URL}/rest/v1/notes?select=body\`);
  return <pre>{JSON.stringify(await res.json())}</pre>;
}
`,
  }],
  [1, 'realtime channel on notes outside the DB module', {
    'src/routes/Live.tsx': `
import { authClient } from '../lib/supabase';
export function Live() {
  void authClient;
  return <div>live</div>;
}
const sub = () => ({}).channel?.('notes').on('postgres_changes', { table: 'notes' }, () => {});
void sub;
`,
  }],
  [1, 'the raw Supabase client is exported', {
    'src/lib/supabase.ts': CLEAN['src/lib/supabase.ts'].replace(
      'const client: SupabaseClient | null',
      'export const supabase: SupabaseClient | null',
    ).replace(/\bclient\b(?!:)/g, 'supabase'),
  }],
  [4, 'a TypeScript function under api/', {
    'api/dump.ts': `
export default async function handler() {
  const r = await fetch(process.env.SUPABASE_URL + '/rest/v1/notes?select=body', {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY! },
  });
  return new Response(await r.text());
}
`,
  }],
  [5, 'security definer returning setof public.notes', {
    'sql/90_leak.sql': `
create or replace function public.all_notes(p_session uuid)
returns setof public.notes
language sql stable security definer set search_path = public
as $$
  select * from public.notes where session_id = p_session;
$$;
`,
  }],
  [5, 'security definer with a single-quoted body selecting body', {
    'sql/91_leak.sql': `
create or replace function public.peek(p_session uuid)
returns text
language sql stable security definer set search_path = public
as 'select string_agg(body, chr(10)) from public.notes where session_id = p_session';
`,
  }],
  [5, 'alter publication … add table notes, split over lines', {
    'sql/92_pub.sql': `
alter publication supabase_realtime
  add table public.notes;
`,
  }],
  [5, 'replica identity full on notes', {
    'sql/93_replica.sql': 'alter table public.notes replica identity full;\n',
  }],
  [11, 'a view over notes', {
    'sql/94_view.sql': 'create view public.all_notes as select id, participant_id, body from public.notes;\n',
  }],
  [11, 'row level security disabled in live SQL', {
    'sql/95_off.sql': 'alter table public.notes disable row level security;\n',
  }],
  [11, 'an open using (true) policy on notes', {
    'sql/96_open.sql': "create policy notes_select_all on public.notes for select using (true);\n",
  }],
  [11, 'bypassrls granted to anon', {
    'sql/97_bypass.sql': 'alter role anon bypassrls;\n',
  }],
  [11, 'grant select on notes', {
    'sql/98_grant.sql': 'grant select on public.notes to anon;\n',
  }],
  [8, 'a hover handler on the roster rail', {
    'src/ds/RosterRail.tsx': CLEAN['src/ds/RosterRail.tsx'].replace(
      '<li key={p.participant_id}>',
      '<li key={p.participant_id} onPointerEnter={() => preview(p.participant_id)}>',
    ),
  }],
  [8, 'a title attribute on a grid row', {
    'src/ds/ConvergenceGrid.tsx': CLEAN['src/ds/ConvergenceGrid.tsx'].replace(
      '<tr key={r.id}>',
      '<tr key={r.id} title={r.theme}>',
    ),
  }],
  [10, 'an API key committed in a source file', {
    // Assembled at runtime so this file contains no literal that matches the
    // secret scan. Excluding the self-test from the scan instead would carve
    // out exactly the file a real key would hide in.
    'src/lib/keys.ts': `export const KEY = '${['AQ', '.', `Ab8RN6Jz${'A'.repeat(42)}`].join('')}';\n`,
  }],
];

/* -------------------------------------------------------------------- run */

function build(extra = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'grove-audit-'));
  for (const [rel, body] of Object.entries({ ...CLEAN, ...extra })) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

function runAudit(dir) {
  try {
    return { code: 0, out: execFileSync('node', [AUDIT, dir], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

let failures = 0;

// 1. The clean fixture must pass, or every case below proves nothing.
{
  const dir = build();
  const { code, out } = runAudit(dir);
  rmSync(dir, { recursive: true, force: true });
  if (code === 0) {
    console.log('  ok   clean fixture passes');
  } else {
    failures += 1;
    console.log('  FAIL clean fixture was flagged — the audit has a false positive:');
    for (const l of out.trim().split('\n')) console.log(`         ${l}`);
  }
}

// 2. Every seeded violation must be caught, by the rule that owns it.
for (const [rule, name, files] of CASES) {
  const dir = build(files);
  const { code, out } = runAudit(dir);
  rmSync(dir, { recursive: true, force: true });
  const caught = code !== 0 && new RegExp(`^RULE ${rule}:`, 'm').test(out);
  if (caught) {
    console.log(`  ok   rule ${String(rule).padEnd(2)} catches: ${name}`);
  } else {
    failures += 1;
    const why = code === 0 ? 'audit reported CLEAN' : `hit, but not on rule ${rule}`;
    console.log(`  FAIL rule ${String(rule).padEnd(2)} MISSED:  ${name} — ${why}`);
    for (const l of out.trim().split('\n').slice(0, 4)) console.log(`         ${l}`);
  }
}

console.log(
  failures
    ? `\naudit self-test: ${failures} of ${CASES.length + 1} checks failed — a bypass is open`
    : `\naudit self-test: ${CASES.length + 1} checks passed`,
);
process.exit(failures ? 1 : 0);
