#!/usr/bin/env node
// Grove — independence audit. Node 20+, zero dependencies.
//
// GROVE-MASTER.md §14.1 (the independence gate) and §14.2 (the secret gate),
// made mechanical so they run on every push instead of relying on care.
// Exit 1 on ANY hit. Every hit prints as:  RULE n: path:line — text
//
//   node scripts/independence-audit.mjs            # root = parent of scripts/
//   node scripts/independence-audit.mjs <root>     # audit another checkout
//
// A MISSING file is never a hit for a rule about that file. A missing
// directory never skips a rule: the rule simply has nothing to scan.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
);

// Directories that are never part of the product and would only add noise
// (and, for .venv / node_modules, minutes) to a tree walk.
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.venv', '.vercel', '__pycache__',
  '.pytest_cache', 'test-results', 'playwright-report',
]);

const hits = [];

/* ----------------------------------------------------------------- helpers */

function hit(rule, file, line, text) {
  hits.push({ rule, file, line, text: String(text).trim().slice(0, 160) });
}

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return existsSync(abs(rel));
}

/** Reads a file as UTF-8; returns null for binaries (NUL in the first 8 KB). */
function readText(rel) {
  const buf = readFileSync(abs(rel));
  if (buf.subarray(0, 8192).includes(0)) return null;
  return buf.toString('utf8');
}

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function lineText(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  let end = text.indexOf('\n', index);
  if (end === -1) end = text.length;
  return text.slice(start, end);
}

/** Relative POSIX paths of every file under `dir` ('' = ROOT), sorted. */
function walk(dir, out = []) {
  const here = dir ? abs(dir) : ROOT;
  if (!existsSync(here)) return out;
  for (const entry of readdirSync(here, { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out.sort();
}

/** Every line of `rel` as [lineNumber, text]; [] for binaries. */
function eachLine(rel) {
  const text = readText(rel);
  if (text === null) return [];
  return text.split('\n').map((l, i) => [i + 1, l.replace(/\r$/, '')]);
}

/** Like eachLine, but with comments blanked for JS/TS sources: a comment that
 *  names a forbidden call is not a call. Line numbers are unchanged. */
function eachCodeLine(rel) {
  const text = readText(rel);
  if (text === null) return [];
  const code = /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel) ? stripComments(text) : text;
  return code.split('\n').map((l, i) => [i + 1, l.replace(/\r$/, '')]);
}

/**
 * Blanks out // and /* *\/ comments in TS/TSX source, preserving length and
 * newlines so line numbers survive. Quote state is tracked so a `//` inside a
 * string is left alone; an apostrophe in JSX text only opens a string state
 * until the end of that line, so at worst a comment is NOT stripped — the
 * conservative failure. A `//` preceded by ':' is a URL, not a comment.
 */
function stripComments(src) {
  let out = '';
  let quote = null;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += d ?? '';
        i += 2;
        continue;
      }
      if (c === quote || (c === '\n' && quote !== '`')) quote = null;
      i++;
      continue;
    }
    if (c === '/' && d === '/' && src[i - 1] !== ':') {
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (c === '/' && d === '*') {
      out += '  ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < src.length) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    out += c;
    i++;
  }
  return out;
}

const SRC_ALL = walk('src');
const SRC_TS = SRC_ALL.filter((f) => /\.(ts|tsx)$/.test(f));
const SRC_TSX = SRC_ALL.filter((f) => f.endsWith('.tsx'));

/* ------------------------------------------------------------------ RULE 1
 * `.from(`, `.rpc(`, `createClient(` may appear only in src/lib/supabase.ts.
 * GROVE-MASTER.md §14.1 (2): one module talks to the database.
 * `Array.from(` is the language, not a query, and is exempt. Comments are
 * not calls and are ignored. */
for (const f of SRC_TS) {
  if (f === 'src/lib/supabase.ts') continue;
  for (const [n, l] of eachCodeLine(f)) {
    const code = l.replace(/\bArray\.from\(/g, '');
    if (/\.from\(|\.rpc\(|createClient\(/.test(code)) hit(1, f, n, l);
  }
}

/* ------------------------------------------------------------------ RULE 2
 * In src/lib/supabase.ts every statement containing from('notes') must also
 * contain .eq('participant_id' and a select('…') with an explicit column list.
 * A statement is the text from .from('notes') to the next ';' (comments
 * blanked first, so a ';' in a comment cannot end it early).
 * GROVE-MASTER.md §14.1 (2).
 *
 * Two readings that keep the invariant intact without false alarms:
 *   - select(NOTE_COLS) is accepted when NOTE_COLS is a const string in the
 *     same file; that string is then checked exactly like a literal.
 *   - an .insert(…) whose payload carries participant_id writes into the
 *     current lane by construction (RLS checks the row); PostgREST ignores
 *     filters on POST, so .eq('participant_id' is not demanded of it.
 *   - a write (.insert/.update/.delete/.upsert) with no .select( at all
 *     returns no columns (Prefer: return=minimal) and is accepted; a read
 *     cannot exist without .select(, so reads stay strict. */
if (exists('src/lib/supabase.ts')) {
  const f = 'src/lib/supabase.ts';
  const code = stripComments(readText(f) ?? '');

  /** The first argument of the first .select( in `stmt`, resolved to a string. */
  const selectColumns = (stmt) => {
    const at = /\.select\(\s*/.exec(stmt);
    if (!at) return { missing: true };
    const rest = stmt.slice(at.index + at[0].length);
    const lit = /^(['"`])([\s\S]*?)\1/.exec(rest);
    if (lit) return { shown: `'${lit[2]}'`, cols: lit[2] };
    const ident = /^([A-Za-z_$][\w$]*)\s*[,)]/.exec(rest);
    if (ident) {
      const def = new RegExp(`\\b(?:const|let|var)\\s+${ident[1]}\\b[^=;]*=\\s*(['"\`])([\\s\\S]*?)\\1`).exec(code);
      return { shown: ident[1], cols: def ? def[2] : null };
    }
    return { shown: rest.split(')')[0].trim(), cols: null };
  };

  const re = /\.from\(\s*['"]notes['"]\s*\)/g;
  let m;
  while ((m = re.exec(code))) {
    const semi = code.indexOf(';', m.index);
    const stmt = code.slice(m.index, semi === -1 ? code.length : semi);
    const problems = [];

    const filtered = /\.eq\(\s*['"]participant_id['"]/.test(stmt);
    const laneInsert = /\.insert\(/.test(stmt) && /\bparticipant_id\s*:/.test(stmt);
    if (!filtered && !laneInsert) problems.push("no .eq('participant_id'");

    const sel = selectColumns(stmt);
    const isWrite = /\.(insert|update|delete|upsert)\(/.test(stmt);
    if (sel.missing) {
      if (!isWrite) problems.push('no select(…)');
    } else if (sel.cols === null) problems.push(`select(${sel.shown}) is not a string literal or a const string in this file`);
    else if (sel.cols.trim() === '' || sel.cols.includes('*') || sel.cols.includes('${')) {
      problems.push(`select(${sel.shown}) is not an explicit column list`);
    }

    if (problems.length) hit(2, f, lineOf(code, m.index), `from('notes') statement: ${problems.join('; ')}`);
  }
}

/* ------------------------------------------------------------------ RULE 3
 * signInAnonymously exactly once across src/**, in src/lib/auth.ts.
 * ensureUser may be imported only by src/routes/Create.tsx and src/routes/Join.tsx
 * (any other reference to it outside src/lib/auth.ts is a hit, so a namespace
 * import cannot route around the rule). Comments are not calls and are ignored. */
{
  const AUTH = 'src/lib/auth.ts';
  const ENSURE_USER_ALLOWED = new Set([AUTH, 'src/routes/Create.tsx', 'src/routes/Join.tsx']);
  const authOccurrences = [];
  for (const f of SRC_ALL) {
    for (const [n, l] of eachCodeLine(f)) {
      if (l.includes('signInAnonymously')) {
        if (f === AUTH) authOccurrences.push([n, l]);
        else hit(3, f, n, l);
      }
      if (/\bensureUser\b/.test(l) && !ENSURE_USER_ALLOWED.has(f)) hit(3, f, n, l);
    }
  }
  if (exists(AUTH)) {
    const count = authOccurrences.length;
    if (count === 0) hit(3, AUTH, 1, 'signInAnonymously appears 0 times (expected exactly once)');
    if (count > 1) {
      for (const [n, l] of authOccurrences) {
        hit(3, AUTH, n, `signInAnonymously appears ${count} times (expected exactly once): ${l}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ RULE 4
 * The string /rest/v1/notes may appear in api/**\/*.py only inside
 * api/synthesise.py, and there exactly once. GROVE-MASTER.md §14.1 (2). */
for (const f of walk('api').filter((p) => p.endsWith('.py'))) {
  const text = readText(f);
  if (text === null) continue;
  const occ = [...text.matchAll(/\/rest\/v1\/notes/g)];
  if (f !== 'api/synthesise.py') {
    for (const o of occ) hit(4, f, lineOf(text, o.index), lineText(text, o.index));
  } else if (occ.length === 0) {
    hit(4, f, 1, '/rest/v1/notes appears 0 times (expected exactly once)');
  } else if (occ.length > 1) {
    for (const o of occ) {
      hit(4, f, lineOf(text, o.index), `/rest/v1/notes appears ${occ.length} times (expected exactly once): ${lineText(text, o.index)}`);
    }
  }
}

/* ------------------------------------------------------------------ RULE 5
 * In sql/**\/*.sql no `security definer` function body may contain the word
 * `body` (the roster is counts only — GROVE-MASTER.md §14.1 (3)), and no line
 * may add notes to a publication (GROVE-MEMORY.md §5). SQL `--` comments are
 * not code and are ignored inside bodies. */
for (const f of walk('sql').filter((p) => p.endsWith('.sql'))) {
  const text = readText(f);
  if (text === null) continue;
  for (const [n, l] of eachLine(f)) {
    if (/alter\s+publication\b.*\badd\s+table\b.*notes/i.test(l)) hit(5, f, n, l);
  }
  const starts = [...text.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\b/gi)].map((m) => m.index);
  starts.forEach((start, k) => {
    const limit = k + 1 < starts.length ? starts[k + 1] : text.length;
    const asRe = /\bas\s+(\$[A-Za-z0-9_]*\$)/gi;
    asRe.lastIndex = start;
    const am = asRe.exec(text);
    if (!am || am.index >= limit) return; // no dollar-quoted body
    const tag = am[1];
    const bodyStart = am.index + am[0].length;
    const bodyEnd = text.indexOf(tag, bodyStart);
    if (bodyEnd === -1) return;
    const semi = text.indexOf(';', bodyEnd + tag.length);
    const stmtEnd = semi === -1 ? text.length : semi;
    const attrs = `${text.slice(start, am.index)} ${text.slice(bodyEnd + tag.length, stmtEnd)}`;
    if (!/\bsecurity\s+definer\b/i.test(attrs)) return;
    const firstLine = lineOf(text, bodyStart);
    text.slice(bodyStart, bodyEnd).split('\n').forEach((bl, j) => {
      if (/\bbody\b/i.test(bl.replace(/--.*$/, ''))) hit(5, f, firstLine + j, bl);
    });
  });
}

/* ------------------------------------------------------------------ RULE 6
 * No VITE_ identifier other than the three public ones, in src/** or
 * .env.example. Anything VITE_-prefixed is in the client bundle.
 * GROVE-MASTER.md §12.5; GROVE-MEMORY.md §5. */
{
  const ALLOWED = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_USE_REALTIME']);
  const targets = [...SRC_ALL, ...(exists('.env.example') ? ['.env.example'] : [])];
  for (const f of targets) {
    for (const [n, l] of eachLine(f)) {
      for (const m of l.matchAll(/\bVITE_\w+/g)) {
        if (!ALLOWED.has(m[0])) hit(6, f, n, `${m[0]} — ${l}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ RULE 7
 * If dist/ exists, no secret NAME may appear in dist/assets/*.js. A name in
 * the bundle means a server-only variable was read on the client. */
if (exists('dist')) {
  for (const f of walk('dist/assets').filter((p) => p.endsWith('.js'))) {
    const text = readText(f);
    if (text === null) continue;
    for (const m of text.matchAll(/service_role|LLM_API_KEY|CRON_SECRET|SUPABASE_SERVICE_ROLE_KEY/g)) {
      const from = Math.max(0, m.index - 40);
      hit(7, f, lineOf(text, m.index), `…${text.slice(from, m.index + m[0].length + 40)}…`);
    }
  }
}

/* ------------------------------------------------------------------ RULE 8
 * Interaction architecture, GROVE-MASTER.md §4.4 / §8.7 / §8.8 / §8.13:
 * the roster and the chip are not interactive; no tooltips anywhere. */
{
  const rail = 'src/ds/RosterRail.tsx';
  if (exists(rail)) {
    for (const [n, l] of eachLine(rail)) {
      if (/onClick|onMouseEnter|onMouseOver|title=|href=/.test(l)) hit(8, rail, n, l);
    }
  }

  const strip = 'src/ds/RosterStrip.tsx';
  if (exists(strip)) {
    const text = readText(strip) ?? '';
    // The strip's ONLY permitted handler is the collapse toggle. It legitimately
    // appears in both the collapsed and the expanded render, so the rule is
    // "every onClick is onClick={onToggle}", not "at most one onClick".
    for (const m of text.matchAll(/onClick\s*=\s*\{?\s*([A-Za-z_$][\w$.]*|\([^)]*\)\s*=>[^}]*)/g)) {
      if (m[1] !== 'onToggle') {
        hit(8, strip, lineOf(text, m.index), `onClick other than onToggle: ${lineText(text, m.index)}`);
      }
    }
    for (const m of text.matchAll(/on(MouseEnter|MouseOver|MouseDown|TouchStart|Focus|DoubleClick|ContextMenu)\s*=/g)) {
      hit(8, strip, lineOf(text, m.index), `hover/press handler on the roster strip: ${lineText(text, m.index)}`);
    }
    for (const [n, l] of eachLine(strip)) {
      if (l.includes('title=')) hit(8, strip, n, l);
    }
  }

  const grid = 'src/ds/ConvergenceGrid.tsx';
  if (exists(grid)) {
    const text = readText(grid) ?? '';
    for (const m of text.matchAll(/<td\b/g)) {
      // Walk to the end of the opening tag, ignoring '>' inside {…} expressions.
      let depth = 0;
      let i = m.index + 3;
      while (i < text.length) {
        const c = text[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
        i++;
      }
      if (text.slice(m.index, i).includes('title=')) hit(8, grid, lineOf(text, m.index), lineText(text, m.index));
    }
  }

  const chip = 'src/ds/Chip.tsx';
  if (exists(chip)) {
    for (const [n, l] of eachLine(chip)) {
      if (/title=|\bon[A-Z][A-Za-z]*\s*[=:]/.test(l)) hit(8, chip, n, l);
    }
  }
}

/* ------------------------------------------------------------------ RULE 9
 * Product copy, GROVE-MASTER.md §4.5 / §9.4: no exclamation marks in JSX
 * strings or text (a `!` followed by a quote, `<` or `{` — i.e. the end of a
 * string or text node — counts; `!==`, `!=` and `!x` in code do not), and none
 * of the words Grove does not use. Comments are not copy and are skipped. */
for (const f of SRC_TSX) {
  const raw = readText(f);
  if (raw === null) continue;
  const code = stripComments(raw);
  for (const m of code.matchAll(/![ \t\r\n]*['"`<{]/g)) {
    hit(9, f, lineOf(code, m.index), `exclamation mark: ${lineText(raw, m.index)}`);
  }
  const rawLines = raw.split('\n');
  code.split('\n').forEach((l, i) => {
    const w = /podcast|ai-narrated|studio quality|magic/i.exec(l);
    if (w) hit(9, f, i + 1, `"${w[0]}": ${rawLines[i]}`);
  });
}

/* ----------------------------------------------------------------- RULE 10
 * The secret gate, GROVE-MASTER.md §14.2, format-agnostic. Every text file
 * git would commit (tracked, plus untracked files git does not ignore),
 * except *.md and .env.example. Matched values are redacted in the output. */
{
  const ASSIGN = /(service_role|SERVICE_ROLE_KEY|LLM_API_KEY|CRON_SECRET)\s*[:=]\s*["']?[A-Za-z0-9_.\-]{20,}/g;
  const TOKEN = /\b(AIza[0-9A-Za-z_-]{30,}|AQ\.[A-Za-z0-9_-]{40,}|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{40,}\.)/g;

  let files = null;
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, stdio: 'ignore' });
    files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
    }).toString('utf8').split('\0').filter(Boolean);
  } catch {
    files = null;
  }
  if (files === null) {
    // Not a git repo: walk the tree. .env files are never shipped; skip them
    // here so a local secret is not echoed into a log.
    files = walk('').filter((f) => !/(^|\/)\.env(\..*)?$/.test(f));
  }

  const redact = (l) =>
    l
      .replace(ASSIGN, (m) => `${m.slice(0, 12)}…[redacted]`)
      .replace(TOKEN, (m) => `${m.slice(0, 6)}…[redacted]`);

  for (const f of files) {
    if (f.endsWith('.md') || f === '.env.example' || !exists(f)) continue;
    for (const [n, l] of eachLine(f)) {
      ASSIGN.lastIndex = 0;
      TOKEN.lastIndex = 0;
      if (ASSIGN.test(l) || TOKEN.test(l)) hit(10, f, n, redact(l));
    }
  }
}

/* ----------------------------------------------------------------- report */

hits.sort((a, b) => a.rule - b.rule || a.file.localeCompare(b.file) || a.line - b.line);
for (const h of hits) console.log(`RULE ${h.rule}: ${h.file}:${h.line} — ${h.text}`);

if (hits.length) {
  console.log(`independence audit: ${hits.length} hit${hits.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('independence audit: clean');
