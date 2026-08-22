// =============================================================================
// GroveStudio server — Ask, grounded on the caller's notes, via Claude.
//
// Claude Opus 5 through the official SDK: adaptive thinking (the model's
// default), high effort, the notes block cached so follow-up questions over
// the same scope are cheap, and the server-side refusal fallback so a
// policy decline re-runs on a fallback model instead of failing. If the key
// can't reach Opus 5 (404), the next model in ASK_MODELS is tried.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { corpus } from './notes.mjs';

const MODELS = [process.env.ASK_MODEL || 'claude-opus-5', 'claude-sonnet-5', 'claude-sonnet-4-6'];

let _client = null;
const client = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

const SYSTEM =
  'You are the Studio inside GroveStudio, a collaborative note-taking app, helping a teammate understand what is in their notes. ' +
  'Answer ONLY from the notes provided below. Never invent facts, names, numbers or decisions that are not in them. ' +
  'If the notes do not contain the answer, say so in a plain, friendly way instead of guessing. ' +
  'Write like a thoughtful colleague talking, not like an assistant: warm, direct, and easy to read. ' +
  'Use everyday words. No jargon, no filler, no hedging, no "great question", no restating the question. ' +
  'Keep it to 2 to 8 sentences unless the question truly needs more. Quote or closely paraphrase the notes where it helps, and say which note something comes from when that matters. ' +
  'Never use em dashes or en dashes anywhere in your reply; use commas, periods or parentheses instead. ' +
  'End with one final line exactly of the form "Sources: <note title> | <note title>", listing only the exact titles of notes you actually drew on, or "Sources: none".';

// Safety net for the no-dash rule: the model is told, and we also scrub.
const humanize = (t) => t
  .replace(/\s*[—–]\s*/g, ', ')
  .replace(/,\s*,/g, ',')
  .replace(/\(\s*,\s*/g, '(')
  .replace(/,\s*\)/g, ')')
  .replace(/,\s*([.!?])/g, '$1');

function historyTurns(history) {
  const turns = [];
  for (const m of (Array.isArray(history) ? history : []).slice(-8)) {
    const text = String(m?.text ?? '').slice(0, 2000).trim();
    if (!text) continue;
    turns.push({ role: m.who === 'you' ? 'user' : 'assistant', content: text });
  }
  // The API needs the conversation to start with a user turn.
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

function parseAnswer(text, notes) {
  const titles = notes.map((n) => n.title);
  let answer = text.trim();
  let sources = [];
  const m = answer.match(/\n?\s*Sources?:\s*(.*)\s*$/i);
  if (m) {
    answer = answer.slice(0, m.index).trim();
    const listed = m[1].split(/\s*\|\s*|\s*;\s*/).map((s) => s.trim().replace(/^["“]|["”]$/g, '').toLowerCase());
    sources = titles.filter((t) => listed.includes(t.toLowerCase()));
  }
  if (!sources.length) sources = titles.filter((t) => answer.includes(t));
  return { answer: humanize(answer), sources: sources.slice(0, 4) };
}

async function create(model, params, withFallback) {
  return client().beta.messages.create({
    model,
    max_tokens: 8000,
    output_config: { effort: 'high' },
    ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
    ...params,
  });
}

export async function askNotes({ scope, question, history }) {
  const notesDoc = `THE NOTES (${scope.label}):\n\n${corpus(scope.notes) || '(no note content)'}`;
  const params = {
    system: [
      { type: 'text', text: SYSTEM },
      { type: 'text', text: notesDoc, cache_control: { type: 'ephemeral' } },
    ],
    messages: [...historyTurns(history), { role: 'user', content: String(question).slice(0, 2000) }],
  };

  let lastErr;
  for (const model of MODELS) {
    const fallbackOk = model === 'claude-opus-5';
    try {
      let res;
      try {
        res = await create(model, params, fallbackOk);
      } catch (e) {
        // A key/org without the fallback beta: same request, minus the parameter.
        if (fallbackOk && e instanceof Anthropic.BadRequestError && /fallback/i.test(e.message)) {
          res = await create(model, params, false);
        } else throw e;
      }
      if (res.stop_reason === 'refusal') {
        return { answer: "I can't help with that one — ask me something else about these notes.", sources: [], model: res.model };
      }
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      return { ...parseAnswer(text, scope.notes), model: res.model };
    } catch (e) {
      lastErr = e;
      if (e instanceof Anthropic.NotFoundError) continue; // this key can't reach the model — try the next
      throw e;
    }
  }
  throw lastErr;
}
