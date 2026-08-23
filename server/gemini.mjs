// =============================================================================
// GroveStudio server — Gemini: text generation + TTS.
//
// The TTS engine is ported from projects/MT_V2 (server/podcast/audio.ts) but
// retargeted at the Gemini API key path (generativelanguage.googleapis.com,
// plain API key — no service-account OAuth): per-call voice pinning so
// distinct voices are guaranteed by construction, consecutive same-speaker
// turns merged, 0.25s silence re-interleaved, LINEAR16 24kHz PCM concatenated
// under a hand-built 44-byte RIFF/WAV header. No ffmpeg anywhere.
// =============================================================================

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const KEY = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;

const TEXT_MODELS = [
  process.env.LLM_MODEL || 'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
];
// Verified live on this key (2026-08-22): gemini-3.1-flash-tts-preview
// answers generateContent with audio/l16;rate=24000.
const TTS_MODELS = [
  process.env.LLM_TTS_MODEL || 'gemini-3.1-flash-tts-preview',
  'gemini-2.5-pro-preview-tts',
  'gemini-2.5-flash-preview-tts',
];

import lamejs from '@breezystack/lamejs';

export const SAMPLE_RATE = 24000;

export function geminiConfigured() {
  return Boolean(KEY);
}

// ── shared request layer: retry with backoff on 429/5xx ─────────────────────

async function post(model, body) {
  const MAX_ATTEMPTS = 4;
  let lastErr = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${API}/${model}:generateContent?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    lastErr = `gemini ${model} ${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (res.status === 404) throw Object.assign(new Error(lastErr), { modelNotFound: true });
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    const backoff = 2000 * 2 ** (attempt - 1) + Math.random() * 800;
    await new Promise((r) => setTimeout(r, backoff));
  }
  throw new Error(lastErr || 'gemini request failed');
}

async function withModelFallback(models, fn) {
  let lastErr;
  for (const m of models) {
    try { return await fn(m); } catch (e) {
      lastErr = e;
      if (!e.modelNotFound) throw e;
    }
  }
  throw lastErr;
}

// ── text ────────────────────────────────────────────────────────────────────

export async function geminiText(prompt, { system, json = false } = {}) {
  return withModelFallback(TEXT_MODELS, async (model) => {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 8192,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    };
    const data = await post(model, body);
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('');
    if (!text.trim()) throw new Error('gemini returned an empty answer');
    return text;
  });
}

export async function geminiJson(prompt, { system } = {}) {
  const text = await geminiText(prompt, { system, json: true });
  try {
    return JSON.parse(text);
  } catch {
    // Salvage the outermost JSON object in a fenced or chatty reply. The
    // greedy [\s\S]* reaches the LAST closing brace, tolerating trailing prose.
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try { return JSON.parse(text.slice(first, last + 1)); } catch { /* fall through */ }
    }
    throw new Error('gemini did not return valid JSON');
  }
}

// ── TTS (MT_V2 engine, API-key path) ────────────────────────────────────────

const SOFT_LIMIT = 3000;
const HARD_LIMIT = 3900;
// Paid-tier voicing: several multi-speaker calls in flight, each a few turns,
// so a 15-turn episode renders in a fraction of the serial time.
const TTS_CONCURRENCY = Number(process.env.TTS_CONCURRENCY || 3);
const MAX_BATCH_TURNS = Number(process.env.TTS_BATCH_TURNS || 4);
const INTER_TURN_SILENCE_SEC = 0.25;
const CONCURRENCY = 2;

// Text the TTS models read cleanly (ported verbatim from MT_V2).
export function sanitizeSpeech(text) {
  return String(text ?? '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/: /g, ', ')
    .replace(/:/g, ',')
    .replace(/[*_#]/g, '')
    .replace(/[—–]/g, ' - ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Small worker pool — limited concurrency, order preserved. */
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Merge consecutive same-speaker turns (fewer calls, less voice drift). */
function groupRuns(turns) {
  const runs = [];
  for (const t of turns) {
    const last = runs[runs.length - 1];
    if (last && last.speaker === t.speaker
      && Buffer.byteLength(`${last.text} ${t.text}`, 'utf8') <= HARD_LIMIT) {
      last.text = `${last.text} ${t.text}`;
    } else {
      runs.push({ ...t });
    }
  }
  // Split any single run that still exceeds the budget on sentence borders.
  const out = [];
  for (const r of runs) {
    if (Buffer.byteLength(r.text, 'utf8') <= HARD_LIMIT) { out.push(r); continue; }
    let buf = '';
    for (const sentence of r.text.split(/(?<=[.!?])\s+/)) {
      if (Buffer.byteLength(`${buf} ${sentence}`, 'utf8') > SOFT_LIMIT && buf) {
        out.push({ speaker: r.speaker, text: buf });
        buf = sentence;
      } else {
        buf = buf ? `${buf} ${sentence}` : sentence;
      }
    }
    if (buf) out.push({ speaker: r.speaker, text: buf });
  }
  return out;
}

async function ttsCall(model, text, voiceName, stylePrompt) {
  const data = await post(model, {
    contents: [{ parts: [{ text: stylePrompt ? `${stylePrompt}\n\n${text}` : text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!inline?.data) throw new Error('tts returned no audio');
  return Buffer.from(inline.data, 'base64'); // LINEAR16 PCM 16-bit LE mono
}

/** Wrap raw 16-bit PCM mono in a WAV container (MT_V2's 44-byte header). */
export function pcmToWav(pcm, sampleRate = SAMPLE_RATE, channels = 1) {
  const byteRate = sampleRate * channels * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** 16-bit mono PCM → MP3 (64 kbps, plenty for speech): about 7× smaller
 *  than WAV, so an episode travels and stores in a fraction of the bytes. */
export function pcmToMp3(pcm, sampleRate = SAMPLE_RATE) {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const enc = new lamejs.Mp3Encoder(1, sampleRate, 64);
  const out = [];
  const block = 1152;
  for (let i = 0; i < samples.length; i += block) {
    const chunk = enc.encodeBuffer(samples.subarray(i, i + block));
    if (chunk.length) out.push(Buffer.from(chunk));
  }
  const tail = enc.flush();
  if (tail.length) out.push(Buffer.from(tail));
  return Buffer.concat(out);
}

/** One multi-speaker request for a whole batch of turns. On the API-key path
 *  the free-tier per-minute quota is tight, so ONE call per episode is the
 *  primary mode here (the inverse of MT_V2's OAuth'd Cloud TTS ordering). */
async function ttsMultiSpeaker(model, turns, voices) {
  const script = turns.map((t) => `${voices[t.speaker].alias}: ${t.text}`).join('\n');
  const data = await post(model, {
    contents: [{ parts: [{ text: `TTS the following conversation naturally, like a real unscripted podcast:\n${script}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: Object.values(voices).map((v) => ({
            speaker: v.alias,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: v.name } },
          })),
        },
      },
    },
  });
  const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!inline?.data) throw new Error('tts returned no audio');
  return Buffer.from(inline.data, 'base64');
}

/** Split turns into multi-speaker batches under the input byte budget. */
function batchTurns(turns) {
  // First split any single turn that alone exceeds the budget.
  const split = [];
  for (const t of turns) {
    if (Buffer.byteLength(t.text, 'utf8') + 12 <= HARD_LIMIT) { split.push(t); continue; }
    let buf = '';
    for (const sentence of t.text.split(/(?<=[.!?])\s+/)) {
      if (buf && Buffer.byteLength(`${buf} ${sentence}`, 'utf8') + 12 > HARD_LIMIT) {
        split.push({ speaker: t.speaker, text: buf }); buf = sentence;
      } else { buf = buf ? `${buf} ${sentence}` : sentence; }
    }
    if (buf) split.push({ speaker: t.speaker, text: buf });
  }
  const batches = [];
  let cur = [];
  let size = 0;
  for (const t of split) {
    const ts = Buffer.byteLength(t.text, 'utf8') + 12;
    if (cur.length && (size + ts > HARD_LIMIT || cur.length >= MAX_BATCH_TURNS)) { batches.push(cur); cur = []; size = 0; }
    cur.push(t);
    size += ts;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

/**
 * Render a dialogue [{speaker, text}] with per-speaker voices into one WAV.
 * voices: { A: {alias: 'Asha', name: 'Kore', prompt: '...'}, B: {...} }
 * Primary: one multi-speaker call per batch (quota-friendly). Fallback:
 * per-turn voice-pinned calls (MT_V2's guaranteed-distinct-voices mode).
 */
export async function renderDialogue(dialogue, voices, onProgress) {
  const turns = dialogue
    .map((t) => ({ speaker: t.speaker, text: sanitizeSpeech(t.text) }))
    .filter((t) => t.text && voices[t.speaker]);
  if (!turns.length) throw new Error('no renderable dialogue turns');

  let pcm;
  try {
    const batches = batchTurns(turns);
    let done = 0;
    const parts = await withModelFallback(TTS_MODELS, (model) =>
      mapPool(batches, TTS_CONCURRENCY, async (batch) => {
        const buf = await ttsMultiSpeaker(model, batch, voices);
        done += 1;
        onProgress?.(done / batches.length);
        return buf;
      }));
    pcm = Buffer.concat(parts);
  } catch (err) {
    if (/429|RESOURCE_EXHAUSTED/.test(String(err.message))) {
      throw new Error('The Gemini TTS free-tier quota is used up for now — wait a minute or two and generate again.');
    }
    // Fallback: voice-pinned per-turn synthesis.
    const runs = groupRuns(turns);
    const clips = await withModelFallback(TTS_MODELS, (model) =>
      mapPool(runs, CONCURRENCY, async (run) => {
        const v = voices[run.speaker];
        return ttsCall(model, run.text, v.name, v.prompt);
      }));
    const silence = Buffer.alloc(Math.round(INTER_TURN_SILENCE_SEC * SAMPLE_RATE) * 2);
    const parts = [];
    clips.forEach((clip, i) => {
      parts.push(clip);
      if (i < clips.length - 1) parts.push(silence);
    });
    pcm = Buffer.concat(parts);
  }
  return { wav: pcmToWav(pcm), mp3: pcmToMp3(pcm, SAMPLE_RATE), durationSec: pcm.length / (SAMPLE_RATE * 2) };
}

/** Single-voice narration → WAV. */
export async function renderNarration(text, voiceName = 'Kore', stylePrompt = null) {
  const clean = sanitizeSpeech(text);
  if (!clean) throw new Error('nothing to narrate');
  try {
    const runs = groupRuns([{ speaker: 'N', text: clean }]);
    const clips = await withModelFallback(TTS_MODELS, (model) =>
      mapPool(runs, CONCURRENCY, (run) => ttsCall(model, run.text, voiceName, stylePrompt)));
    const pcm = Buffer.concat(clips);
    return { wav: pcmToWav(pcm), mp3: pcmToMp3(pcm, SAMPLE_RATE), durationSec: pcm.length / (SAMPLE_RATE * 2) };
  } catch (err) {
    if (/429|RESOURCE_EXHAUSTED/.test(String(err.message))) {
      throw new Error('The Gemini TTS free-tier quota is used up for now — wait a minute or two and generate again.');
    }
    throw err;
  }
}
