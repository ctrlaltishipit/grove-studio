// =============================================================================
// GroveStudio server — Claude (Anthropic Messages API, plain fetch).
// Model-fallback pattern from MT_V2's lib/llm.ts: try newest first, fall back
// on model-not-found so the app keeps working whichever tier the key has.
// =============================================================================

const KEY = process.env.ANTHROPIC_API_KEY;
const MODELS = [
  process.env.CLAUDE_MODEL || 'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
];

export function claudeConfigured() {
  return Boolean(KEY);
}

async function call(model, { system, prompt, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    const err = new Error(`claude ${model} ${res.status}: ${text}`);
    err.modelNotFound = res.status === 404 || /not_found_error/.test(text);
    err.retryable = res.status === 429 || res.status === 529 || res.status >= 500;
    throw err;
  }
  const data = await res.json();
  const text = (data.content ?? []).map((b) => b.text ?? '').join('');
  if (data.stop_reason === 'max_tokens') {
    const err = new Error('the design ran past the output budget — try again (it will come back tighter)');
    err.truncated = true;
    err.partial = text;
    throw err;
  }
  return text;
}

export async function claude({ system, prompt, maxTokens = 8192 }) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await call(model, { system, prompt, maxTokens });
      } catch (e) {
        lastErr = e;
        if (e.truncated) throw e;
        if (e.modelNotFound) break; // next model
        if (!e.retryable || attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 2500 * attempt + Math.random() * 500));
      }
    }
    if (!lastErr?.modelNotFound) break;
  }
  throw lastErr;
}

export async function claudeJson(opts) {
  const text = await claude(opts);
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('claude did not return valid JSON');
  }
}
