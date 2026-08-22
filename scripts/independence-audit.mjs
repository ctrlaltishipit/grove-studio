#!/usr/bin/env node
// Grove — independence audit. Node 20+, zero dependencies.
//
// GROVE-MASTER.md §14.1 (the independence gate) and §14.2 (the secret gate),
// made mechanical so they run on every push instead of relying on care.
// Exit 1 on ANY hit. Every hit prints as:  RULE n: path:line — text
//
//   node scripts/independence-audit.mjs            # root = parent of scripts/
//   node scripts/independence-audit.mjs <root>     # audit another checkout
//   node scripts/independence-audit.selftest.mjs   # prove each rule catches its bypass
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
const notes = [];

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

/** Index of the matching closer for the bracket at `open`, skipping strings. */
function matchingClose(code, open) {
  const closer = { '(': ')', '{': '}', '[': ']' }[code[open]];
  let depth = 0;
  let quote = null;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === code[open]) depth++;
    else if (c === closer && --depth === 0) return i;
  }
  return code.length;
}

/**
 * Where the JS/TS statement that starts at `from` ends: at a ';' at depth 0,
 * at a ')' or '}' that closes an ENCLOSING block, or at a newline followed by
 * a statement keyword — the ASI case, where a chain simply stops and the next
 * line starts a new statement without any semicolon. Strings are skipped.
 */
function statementEnd(code, from) {
  let depth = 0;
  let quote = null;
  let i = from;
  while (i < code.length) {
    const c = code[i];
    if (quote) {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i++; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      if (depth === 0) return i;
      depth--;
    } else if (c === ';' && depth === 0) return i;
    else if (c === '\n' && depth === 0) {
      const rest = code.slice(i + 1, i + 240);
      if (/^\s*(?:const|let|var|return|await|export|if|for|while|throw|function|class)\b/.test(rest)) return i;
      if (/^\s*[})]/.test(rest)) return i;
    }
    i++;
  }
  return code.length;
}

/** Every JSX opening tag: { name, start, end (index of its '>'), attrs }. */
function openingTags(code) {
  const tags = [];
  for (const m of code.matchAll(/<([A-Za-z][\w.:-]*)/g)) {
    let depth = 0;
    let quote = null;
    let i = m.index + m[0].length;
    for (; i < code.length; i++) {
      const c = code[i];
      if (quote) {
        if (c === '\\') { i++; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth <= 0) break;
    }
    tags.push({ name: m[1], start: m.index, end: i, attrs: code.slice(m.index + m[0].length, i) });
  }
  return tags;
}

/* --------------------------------------------------------- SQL helpers
 * Rules 5 and 11 must see SQL the way Postgres does: comments are not code,
 * and a statement does not care which line it wraps onto. So: blank -- and
 * nested slash-star comments (strings respected), then collapse whitespace
 * runs to single spaces while keeping a map back to original offsets, and
 * match patterns against the collapsed text. */

function stripSqlComments(src) {
  let out = '';
  let quote = false;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (quote) {
      out += c;
      if (c === "'") quote = false;
      i++;
      continue;
    }
    if (c === '-' && d === '-') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && d === '*') {
      let depth = 1;
      out += '  ';
      i += 2;
      while (i < src.length && depth > 0) {
        if (src[i] === '/' && src[i + 1] === '*') { depth++; out += '  '; i += 2; continue; }
        if (src[i] === '*' && src[i + 1] === '/') { depth--; out += '  '; i += 2; continue; }
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }
    if (c === "'") quote = true;
    out += c;
    i++;
  }
  return out;
}

/** Whitespace runs collapsed to one space; map[i] = original offset of char i. */
function collapse(text) {
  let out = '';
  const map = [];
  let ws = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f' || c === '\v') {
      if (!ws) { out += ' '; map.push(i); ws = true; }
      continue;
    }
    ws = false;
    out += c;
    map.push(i);
  }
  return { text: out, map };
}

/** A comment-stripped, collapsed view of one SQL file with line lookups into the original. */
function sqlView(rel) {
  const raw = readText(rel);
  if (raw === null) return null;
  const sq = collapse(stripSqlComments(raw));
  const orig = (i) => sq.map[Math.min(Math.max(i, 0), sq.map.length - 1)] ?? 0;
  return {
    text: sq.text,
    at: (i) => lineOf(raw, orig(i)),
    show: (i) => lineText(raw, orig(i)).trim(),
  };
}

/** Every `create function` in collapsed SQL `s`, with its body parsed from a
 *  $tag$…$tag$ OR a single-quoted '…' body, and the attribute text around it. */
function sqlFunctions(s) {
  const out = [];
  const starts = [...s.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+(?:"?[\w]+"?\.)?("?\w+"?)\s*\(/gi)];
  starts.forEach((m, k) => {
    const limit = k + 1 < starts.length ? starts[k + 1].index : s.length;
    const name = m[1].replace(/"/g, '').toLowerCase();
    const asRe = /\bas\s+(\$[A-Za-z0-9_]*\$|')/gi;
    asRe.lastIndex = m.index + m[0].length;
    const am = asRe.exec(s);
    if (!am || am.index >= limit) return; // no SQL body to inspect
    const opener = am[1];
    const bodyStart = am.index + am[0].length;
    let bodyEnd;
    let closeEnd;
    let body;
    let quoted = false;
    if (opener === "'") {
      quoted = true;
      let i = bodyStart;
      while (i < s.length) {
        if (s[i] === "'") {
          if (s[i + 1] === "'") { i += 2; continue; }
          break;
        }
        i++;
      }
      bodyEnd = i;
      closeEnd = i + 1;
      body = s.slice(bodyStart, bodyEnd).replace(/''/g, "'");
    } else {
      bodyEnd = s.indexOf(opener, bodyStart);
      if (bodyEnd === -1) bodyEnd = s.length;
      closeEnd = bodyEnd + opener.length;
      body = s.slice(bodyStart, bodyEnd);
    }
    const semi = s.indexOf(';', closeEnd);
    const attrs = `${s.slice(m.index, am.index)} ${s.slice(closeEnd, semi === -1 ? s.length : semi)}`;
    out.push({ name, start: m.index, bodyStart, attrs, body, quoted });
  });
  return out;
}

const SRC_ALL = walk('src');
const SRC_TS = SRC_ALL.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
const SRC_TSX = SRC_ALL.filter((f) => f.endsWith('.tsx'));
const SQL_ALL = walk('').filter((f) => f.endsWith('.sql'));

/* ------------------------------------------------------------------ RULE 1
 * One module talks to the database — GROVE-MASTER.md §14.1 (2). Outside
 * src/lib/supabase.ts nothing in src/ may query, subscribe or reach a
 * Supabase host: `.from(`, `.rpc(`, `createClient(`, `/rest/v1/`,
 * `.channel(`, `postgres_changes`, `supabase.rest/realtime/storage/functions`,
 * or a fetch( whose call mentions supabase.co. And src/lib/supabase.ts must
 * not export the raw client: authClient() is the only allowed auth surface.
 * `Array.from(` is the language, not a query. Comments are not calls. */
{
  const RAW_CALL = /\.from\s*\(|\.rpc\s*\(|createClient\s*\(|\/rest\/v1\/|\.channel\s*\(|postgres_changes|\bsupabase\.(?:rest|realtime|storage|functions)\b/;
  for (const f of SRC_TS) {
    if (f === 'src/lib/supabase.ts') continue;
    const text = readText(f);
    if (text === null) continue;
    const code = stripComments(text);
    code.split('\n').forEach((l, i) => {
      if (RAW_CALL.test(l.replace(/\bArray\.from\s*\(/g, ''))) hit(1, f, i + 1, l);
    });
    for (const m of code.matchAll(/\bfetch\s*\(/g)) {
      const open = m.index + m[0].length - 1;
      const call = code.slice(open, matchingClose(code, open) + 1);
      if (/supabase\.co\b/i.test(call)) {
        hit(1, f, lineOf(code, m.index), `fetch() to a Supabase host: ${lineText(code, m.index)}`);
      }
    }
  }

  if (exists('src/lib/supabase.ts')) {
    const f = 'src/lib/supabase.ts';
    const code = stripComments(readText(f) ?? '');
    const m = /\bexport\s+(?:const|let|var)\s+supabase\b|\bexport\s*\{[^}]*\bsupabase\b|\bexport\s+default\s+supabase\b/.exec(code);
    if (m) {
      hit(1, f, lineOf(code, m.index), `raw Supabase client is exported — authClient() is the only allowed auth surface: ${lineText(code, m.index).trim()}`);
    }
  }
}

/* ------------------------------------------------------------------ RULE 2
 * Inside src/lib/supabase.ts, the shape of every query is constrained:
 *   - every .from( argument is a quoted table-name literal (any quote style,
 *     backticks included) — never a variable, never a template with ${…};
 *   - every .select( names its columns, from a string literal or a const
 *     string in this file — never '*', never empty (select() means '*'),
 *     and never an embedded  notes(…)  resource (PostgREST embedding joins
 *     straight through the notes FK); *_COLS constants are checked too;
 *   - every from('notes') statement that is not a pure lane insert carries
 *     .eq('participant_id', …). A statement ends at ';' OR where the chain
 *     visibly stops: a newline followed by a statement keyword, or a bracket
 *     closing the enclosing block — so leaving the semicolon off (ASI) cannot
 *     smuggle the filter in from the NEXT statement. */
if (exists('src/lib/supabase.ts')) {
  const f = 'src/lib/supabase.ts';
  const code = stripComments(readText(f) ?? '');
  const EMBED = /\bnotes\b\s*(?:!\w+)?\s*\(/i;

  const selectColumns = (open) => {
    const rest = code.slice(open + 1).replace(/^\s+/, '');
    if (rest.startsWith(')')) return { shown: '', cols: '*' }; // select() selects *
    const lit = /^(['"`])([\s\S]*?)\1/.exec(rest);
    if (lit) return { shown: `'${lit[2]}'`, cols: lit[2] };
    const ident = /^([A-Za-z_$][\w$]*)\s*[,)]/.exec(rest);
    if (ident) {
      const def = new RegExp(`\\b(?:const|let|var)\\s+${ident[1]}\\b[^=;]*=\\s*(['"\`])([\\s\\S]*?)\\1`).exec(code);
      return { shown: ident[1], cols: def ? def[2] : null };
    }
    return { shown: rest.split(')')[0].trim(), cols: null };
  };
  const columnProblem = (sel) => {
    if (sel.cols === null) return `select(${sel.shown}) is not a string literal or a const string in this file`;
    if (sel.cols.trim() === '' || sel.cols.includes('*') || sel.cols.includes('${')) {
      return `select(${sel.shown}) is not an explicit column list`;
    }
    if (EMBED.test(sel.cols)) return `select(${sel.shown}) embeds notes(…) — resource embedding reads other lanes`;
    return null;
  };

  for (const m of code.matchAll(/\.select\s*\(/g)) {
    const p = columnProblem(selectColumns(m.index + m[0].length - 1));
    if (p) hit(2, f, lineOf(code, m.index), p);
  }

  for (const m of code.matchAll(/\b(\w*COLS)\b\s*=\s*(['"`])([\s\S]*?)\2/g)) {
    if (EMBED.test(m[3])) hit(2, f, lineOf(code, m.index), `${m[1]} embeds notes(…): ${lineText(code, m.index).trim()}`);
  }

  for (const m of code.matchAll(/(?<!\bArray)\.from\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const rest = code.slice(open + 1).replace(/^\s+/, '');
    const lit = /^(['"`])([A-Za-z_]\w*)\1\s*[,)]/.exec(rest);
    if (!lit) {
      hit(2, f, lineOf(code, m.index), `from(${rest.split(/[,)]/)[0].trim() || '…'}) — the table is not a quoted literal`);
      continue;
    }
    if (lit[2] !== 'notes') continue;

    const stmt = code.slice(m.index, statementEnd(code, m.index));
    const problems = [];
    const filtered = /\.eq\(\s*(['"`])participant_id\1/.test(stmt);
    const isWrite = /\.(insert|update|delete|upsert)\(/.test(stmt);
    const pureInsert = /\.insert\(/.test(stmt)
      && !/\.(update|delete|upsert)\(/.test(stmt)
      && /\bparticipant_id\s*:/.test(stmt);
    if (!filtered && !pureInsert) problems.push("no .eq('participant_id'");
    if (!/\.select\s*\(/.test(stmt) && !isWrite) problems.push('no select(…)');
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
 * api/ holds Python functions and nothing else: any file that is not *.py
 * (or README.md) would be deployed by Vercel as a route in a language the
 * audit does not scan, so its very presence is the hit. The string
 * /rest/v1/notes may appear only inside api/synthesise.py, exactly once.
 * GROVE-MASTER.md §14.1 (2). */
for (const f of walk('api')) {
  if (!f.endsWith('.py')) {
    const base = f.split('/').pop();
    if (base !== 'README.md' && base !== '.DS_Store') {
      hit(4, f, 1, 'not a Python function — only *.py (and README.md) may live under api/');
    }
    continue;
  }
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
 * Every *.sql anywhere in the repo, comments stripped, whitespace collapsed,
 * matched ACROSS lines — a statement folded onto two lines is the same
 * statement (GROVE-MASTER.md §14.1 (3); GROVE-MEMORY.md §5):
 *   - notes never enters a publication: no publication … add/set table …
 *     notes, no FOR ALL TABLES, no replica identity full;
 *   - a SECURITY DEFINER function ($tag$ or single-quoted body alike) may
 *     neither return a shape that could carry note text (notes, setof, json,
 *     jsonb, record, body) nor mention body / select * / x.* / to_json(b) /
 *     row_to_json / json(b)_agg / string_agg / array_agg in its body.
 *     rls_status (booleans only) and join_session (participants columns) are
 *     allowed BY NAME the looser body shapes they need — but even they may
 *     not touch notes or body. The word body inside a raise exception '…'
 *     message is a message, not a column, and is allowed everywhere. */
{
  const DEFINER_ALLOWED = new Map([
    ['rls_status', 'returns booleans only'],
    ['join_session', 'returns participants columns'],
  ]);
  const RETURNS_LEAK = /\b(notes|setof|json|jsonb|record|body)\b/i;
  const BODY_LEAK = /\bbody\b|\bselect\s+\*|\w+\.\*|\bto_jsonb?\b|\brow_to_json\b|\bjsonb?_agg\b|\bstring_agg\b|\barray_agg\b/gi;
  const blankRaiseStrings = (body) =>
    body.replace(/(\braise\s+\w+\s+)('(?:[^']|'')*')/gi, (all, head, str) => head + ' '.repeat(str.length));

  for (const f of SQL_ALL) {
    const v = sqlView(f);
    if (v === null) continue;
    const s = v.text;

    for (const m of s.matchAll(/\bpublication\b[^;]*\b(?:add|set)\s+table\b[^;]*\bnotes\b/gi)) {
      hit(5, f, v.at(m.index), `notes added to a publication: ${v.show(m.index)}`);
    }
    for (const m of s.matchAll(/\bfor\s+all\s+tables\b/gi)) {
      hit(5, f, v.at(m.index), `publication FOR ALL TABLES would include notes: ${v.show(m.index)}`);
    }
    for (const m of s.matchAll(/\breplica\s+identity\s+full\b/gi)) {
      hit(5, f, v.at(m.index), `replica identity full puts old rows (bodies included) into the WAL stream: ${v.show(m.index)}`);
    }

    for (const fn of sqlFunctions(s)) {
      if (!/\bsecurity\s+definer\b/i.test(fn.attrs)) continue;
      const rt = /\breturns\s+([\s\S]*?)(?=\b(?:language|as|security|set|stable|volatile|immutable|strict|called|cost|rows|parallel|leakproof|window|returns|with)\b|$)/i.exec(fn.attrs);
      const returns = rt ? rt[1].trim() : '';
      const leak = RETURNS_LEAK.exec(returns);
      if (leak) {
        hit(5, f, v.at(fn.start), `security definer ${fn.name}() returns "${returns || 'unknown'}" — "${leak[0]}" can carry note text`);
      }
      const bodyAt = (i) => (fn.quoted ? v.at(fn.start) : v.at(fn.bodyStart + i));
      const body = blankRaiseStrings(fn.body);
      if (DEFINER_ALLOWED.has(fn.name)) {
        const noStrings = body.replace(/'(?:[^']|'')*'/g, (m2) => ' '.repeat(m2.length));
        for (const m of noStrings.matchAll(/\bbody\b|\bnotes\b/gi)) {
          hit(5, f, bodyAt(m.index), `security definer ${fn.name}() is allowed by name (${DEFINER_ALLOWED.get(fn.name)}) but its body touches "${m[0]}"`);
        }
        continue;
      }
      for (const m of body.matchAll(BODY_LEAK)) {
        hit(5, f, bodyAt(m.index), `security definer ${fn.name}() body contains "${m[0]}" — it could assemble note text`);
      }
    }
  }
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
 * the roster and the chip are not interactive; no tooltips anywhere. Any
 * on[A-Z]… handler counts, however it arrives (attribute or object key);
 * so do title, aria-describedby, data-tooltip, data-tip, popover, links and
 * spread props ({...rest} can smuggle any of the above in from a caller). */
{
  const HANDLER = /\bon[A-Z][A-Za-z]*\s*[=:]/g;
  const EXTRAS = [
    [/\btitle\s*[=:]/, 'title (tooltip)'],
    [/aria-describedby/, 'aria-describedby'],
    [/data-tooltip/, 'data-tooltip'],
    [/data-tip\b/, 'data-tip'],
    [/popover/i, 'popover'],
    [/<Link\b/, '<Link>'],
    [/<a\b/, '<a>'],
    [/\{\s*\.\.\./, 'spread props'],
    [/\bhref\s*=/, 'href'],
  ];
  const codeOf = (f) => stripComments(readText(f) ?? '');
  const extras = (f, code) => {
    code.split('\n').forEach((l, i) => {
      for (const [re, what] of EXTRAS) if (re.test(l)) hit(8, f, i + 1, `${what}: ${l.trim()}`);
    });
  };

  const rail = 'src/ds/RosterRail.tsx';
  if (exists(rail)) {
    const code = codeOf(rail);
    for (const m of code.matchAll(HANDLER)) {
      hit(8, rail, lineOf(code, m.index), `handler on the roster rail (none allowed): ${lineText(code, m.index).trim()}`);
    }
    extras(rail, code);
  }

  const strip = 'src/ds/RosterStrip.tsx';
  if (exists(strip)) {
    const code = codeOf(strip);
    // The ONLY permitted handler is the collapse toggle, written exactly
    // onClick={onToggle}; the prop's own type declaration (onToggle:) is not
    // a handler. Everything else — other handlers, inline arrows, renames —
    // is a hit.
    for (const m of code.matchAll(HANDLER)) {
      const here = code.slice(m.index, m.index + 40);
      if (/^onClick=\{onToggle\}/.test(here)) continue;
      if (/^onToggle\s*:/.test(here)) continue;
      hit(8, strip, lineOf(code, m.index), `handler other than onClick={onToggle}: ${lineText(code, m.index).trim()}`);
    }
    extras(strip, code);
  }

  const grid = 'src/ds/ConvergenceGrid.tsx';
  if (exists(grid)) {
    const code = codeOf(grid);
    const tags = openingTags(code);
    let allowed = 0;
    for (const m of code.matchAll(HANDLER)) {
      const tag = tags.find((t) => t.start < m.index && m.index < t.end);
      const prev = tag ? tags.filter((t) => t.end < tag.start).pop() : undefined;
      const ok = tag !== undefined
        && tag.name === 'button'
        && /^onClick\s*=/.test(m[0].replace(/\s*[=:]$/, '=').replace(/^/, ''))
        && m[0].startsWith('onClick')
        && prev !== undefined
        && prev.name === 'th'
        && /scope="row"/.test(prev.attrs);
      if (ok && ++allowed === 1) continue;
      hit(8, grid, lineOf(code, m.index), `handler other than the row-label button's onClick: ${lineText(code, m.index).trim()}`);
    }
    extras(grid, code);
  }

  const chip = 'src/ds/Chip.tsx';
  if (exists(chip)) {
    const code = codeOf(chip);
    for (const m of code.matchAll(HANDLER)) {
      hit(8, chip, lineOf(code, m.index), `handler on the chip (none allowed): ${lineText(code, m.index).trim()}`);
    }
    extras(chip, code);
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

/* ----------------------------------------------------------------- RULE 11
 * SQL escape hatches, every *.sql, comments stripped and collapsed like
 * rule 5. Views run with the OWNER's RLS context unless security_invoker is
 * set, so a plain view is an RLS bypass; a view over notes is one even with
 * it. Nothing may disable RLS in live code (the commented ROLLBACK block in
 * sql/03_rls.sql does not survive comment stripping, which is exactly why it
 * is allowed). No policy may be (true)-open, no role may bypassrls, policies
 * on notes live in sql/03_rls.sql alone, and nothing grants select on notes. */
for (const f of SQL_ALL) {
  const v = sqlView(f);
  if (v === null) continue;
  const s = v.text;

  for (const m of s.matchAll(/\bcreate\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+)?(?:materialized\s+)?(?:recursive\s+)?view\b[^;]*/gi)) {
    if (/\bnotes\b/i.test(m[0])) {
      hit(11, f, v.at(m.index), `view over notes: ${v.show(m.index)}`);
    } else if (/\bmaterialized\b/i.test(m[0].slice(0, 60)) || !/\bsecurity_invoker\s*=\s*(?:true|on)\b/i.test(m[0])) {
      hit(11, f, v.at(m.index), `view without security_invoker = true runs with the owner's RLS context: ${v.show(m.index)}`);
    }
  }
  for (const m of s.matchAll(/\bdisable\s+row\s+level\s+security\b/gi)) {
    hit(11, f, v.at(m.index), `disables row level security in live SQL (only the commented rollback block in sql/03_rls.sql may say this): ${v.show(m.index)}`);
  }
  for (const m of s.matchAll(/\b(?:using|with\s+check)\s*\(\s*true\s*\)/gi)) {
    hit(11, f, v.at(m.index), `(true)-open policy clause: ${v.show(m.index)}`);
  }
  for (const m of s.matchAll(/\bbypassrls\b/gi)) {
    hit(11, f, v.at(m.index), `bypassrls: ${v.show(m.index)}`);
  }
  if (f !== 'sql/03_rls.sql') {
    for (const m of s.matchAll(/\bcreate\s+policy\b[^;]*\bon\s+(?:public\.)?notes\b/gi)) {
      hit(11, f, v.at(m.index), `policy on public.notes outside sql/03_rls.sql: ${v.show(m.index)}`);
    }
  }
  for (const m of s.matchAll(/\bgrant\s+(?:select|all)\b[^;]*\bnotes\b/gi)) {
    hit(11, f, v.at(m.index), `grant on notes: ${v.show(m.index)}`);
  }
}

/* ----------------------------------------------------------------- report */

for (const n of notes) console.log(`note: ${n}`);

hits.sort((a, b) => a.rule - b.rule || a.file.localeCompare(b.file) || a.line - b.line);
for (const h of hits) console.log(`RULE ${h.rule}: ${h.file}:${h.line} — ${h.text}`);

if (hits.length) {
  console.log(`independence audit: ${hits.length} hit${hits.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('independence audit: clean');
