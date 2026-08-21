#!/usr/bin/env node
// Grove — scripts/gen-types.mjs
// Regenerates src/lib/types.ts from the project's public schema.
//
//   npm run gen:types
//
// Needs SUPABASE_ACCESS_TOKEN (a personal access token, Account → Access
// Tokens) and SUPABASE_PROJECT_REF (the xxxxxxxxxxxx in the project URL), from
// the shell or from .env.local. Neither value is ever printed. Node 20+, no
// dependencies. Fails loudly with a one-line reason and the CLI fallback.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_LOCAL = resolve(ROOT, '.env.local');
const OUT_FILE = resolve(ROOT, 'src/lib/types.ts');
const OUT_LABEL = 'src/lib/types.ts';
const TIMEOUT_MS = 30_000;

const HEADER = [
  '// generated — do not edit; npm run gen:types',
  '// Source: Supabase Management API, GET /v1/projects/{ref}/types/typescript?included_schemas=public',
  '// Hand-written domain models live in src/lib/models.ts; tests keep the two in step.',
  '',
].join('\n');

/** Loads KEY=VALUE lines from .env.local into process.env without overriding the shell. */
async function loadEnvLocal() {
  let text;
  try {
    text = await readFile(ENV_LOCAL, 'utf8');
  } catch {
    return; // no .env.local is fine; the shell may carry the values
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      // strip a trailing unquoted comment
      const hash = value.indexOf(' #');
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function fallbackCommand(ref) {
  return `npx supabase@2 gen types typescript --project-id ${ref || '<ref>'} --schema public > ${OUT_LABEL}`;
}

function fail(reason, ref) {
  console.error(`gen-types: ${reason}`);
  console.error(`gen-types: fallback — ${fallbackCommand(ref)}`);
  process.exit(1);
}

async function main() {
  await loadEnvLocal();

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;

  if (!ref) fail('SUPABASE_PROJECT_REF is not set (shell or .env.local)');
  if (!/^[a-z0-9-]{1,64}$/.test(ref)) fail('SUPABASE_PROJECT_REF does not look like a project ref', ref);
  if (!token) fail('SUPABASE_ACCESS_TOKEN is not set (shell or .env.local)', ref);

  const url = `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/types/typescript?included_schemas=public`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`request failed before a response arrived (${message})`, ref);
  }

  if (!response.ok) {
    fail(`Management API returned HTTP ${response.status} ${response.statusText}`.trim(), ref);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    fail('Management API response was not JSON', ref);
  }

  const types = payload && typeof payload.types === 'string' ? payload.types : '';
  if (types.trim() === '') fail('Management API response had no "types" string', ref);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  const body = types.endsWith('\n') ? types : `${types}\n`;
  await writeFile(OUT_FILE, HEADER + body, 'utf8');
  console.log(`gen-types: wrote ${OUT_LABEL} (${Buffer.byteLength(body, 'utf8')} bytes of generated types)`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(`unexpected error (${message})`, process.env.SUPABASE_PROJECT_REF);
});
