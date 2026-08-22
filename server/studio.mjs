// =============================================================================
// GroveStudio server — the six studio tools.
//
// Engine split (per product decision):
//   Gemini  → summary, ask, mind map, audio overview (script + TTS),
//             narration audio for the video overview
//   Claude  → video overview slides (freeform designer), infographic
//
// The slide/infographic designer follows MT_V2's carousel engine: the model
// invents the deck's art direction, writes its design-system CSS, then
// authors each artboard's HTML inside a fixed-size root — sanitized here,
// rendered client-side in sandboxed iframes. Grounding is ALWAYS the caller's
// own notes, fetched under their JWT (see notes.mjs).
// =============================================================================

import { geminiJson, renderDialogue, renderNarration } from './gemini.mjs';
import { claude } from './claude.mjs';
import { sanitizeHtml, sanitizeCss } from './sanitize.mjs';
import { corpus } from './notes.mjs';

const GROUNDING =
  'You are the Studio inside GroveStudio, a collaborative note-taking app. ' +
  'You work ONLY from the notes provided — never invent facts, names, numbers or decisions that are not in them. ' +
  'When the notes do not answer something, say so plainly.';

const noteBlock = (scope) => `THE NOTES (${scope.label}):\n\n${corpus(scope.notes) || '(no note content)'}`;

// ── Summary ─────────────────────────────────────────────────────────────────

export async function summary(scope) {
  const data = await geminiJson(
    `${noteBlock(scope)}

Produce a JSON object:
{
 "summary": "a tight meeting-notes summary, 90-130 words, plain prose — what happened, what was decided, what is still open",
 "decisions": ["each explicit decision found in the notes, one short line each — [] if none"],
 "nextSteps": [{"text": "a concrete action implied or stated by the notes", "label": "one of Spec|Research|Design|Eng|Ops", "dueInDays": 3}],
 "openQuestions": ["unresolved questions surfaced by the notes — [] if none"]
}
2-4 nextSteps, each genuinely traceable to the notes. Respond with JSON only.`,
    { system: GROUNDING },
  );
  return {
    summary: String(data.summary ?? ''),
    decisions: (data.decisions ?? []).map(String).slice(0, 6),
    nextSteps: (data.nextSteps ?? []).slice(0, 4).map((s) => ({
      text: String(s.text ?? ''),
      label: ['Spec', 'Research', 'Design', 'Eng', 'Ops'].includes(s.label) ? s.label : 'Research',
      dueInDays: Number.isFinite(+s.dueInDays) ? Math.min(30, Math.max(1, Math.round(+s.dueInDays))) : 7,
    })).filter((s) => s.text),
    openQuestions: (data.openQuestions ?? []).map(String).slice(0, 5),
    grounding: { label: scope.label, noteCount: scope.notes.length },
  };
}

// A cheap 1-2 sentence brief for the note header — regenerated only when a
// note is re-entered after changing, never per keystroke.
export async function notebrief(scope) {
  const data = await geminiJson(
    `${noteBlock(scope)}

Summarise this note in 1-2 plain sentences, max 45 words — the concrete substance, no preamble like "This note...". Respond with JSON: {"summary": "..."}`,
    { system: GROUNDING },
  );
  return { summary: String(data.summary ?? '').slice(0, 400) };
}

// ── Ask ─────────────────────────────────────────────────────────────────────

export async function ask(scope, question, history = []) {
  const past = (Array.isArray(history) ? history : [])
    .slice(-6)
    .map((m) => `${m.who === 'you' ? 'User' : 'Studio'}: ${String(m.text).slice(0, 500)}`)
    .join('\n');
  const data = await geminiJson(
    `${noteBlock(scope)}

${past ? `CONVERSATION SO FAR:\n${past}\n\n` : ''}THE USER ASKS: ${String(question).slice(0, 1000)}

Answer from the notes only. Respond with JSON:
{"answer": "2-6 sentences, direct and specific, quoting the notes where it helps",
 "sources": ["exact titles of the notes the answer draws on"]}
If the notes don't contain the answer, the answer says so and sources is [].`,
    { system: GROUNDING },
  );
  const titles = new Set(scope.notes.map((n) => n.title));
  return {
    answer: String(data.answer ?? ''),
    sources: (data.sources ?? []).map(String).filter((t) => titles.has(t)).slice(0, 4),
    grounding: { label: scope.label, noteCount: scope.notes.length },
  };
}

// ── Mind map ────────────────────────────────────────────────────────────────

export async function mindmap(scope) {
  const data = await geminiJson(
    `${noteBlock(scope)}

Distil these notes into a mind map. Respond with JSON:
{"center": "the single organizing idea, 2-4 words",
 "branches": [{"label": "a theme, 1-3 words", "children": [{"label": "a specific point from the notes, 2-5 words"}]}]}
4-6 branches, 0-3 children each. Every label must trace to the notes. JSON only.`,
    { system: GROUNDING },
  );
  return {
    center: String(data.center ?? 'Your notes').slice(0, 40),
    branches: (data.branches ?? []).slice(0, 6).map((b) => ({
      label: String(b.label ?? '').slice(0, 40),
      children: (b.children ?? []).slice(0, 3).map((c) => ({ label: String(c.label ?? '').slice(0, 48) })),
    })).filter((b) => b.label),
    grounding: { label: scope.label, noteCount: scope.notes.length },
  };
}

// ── Audio overview ──────────────────────────────────────────────────────────

const HOST_VOICES = {
  A: { alias: 'Asha', name: 'Kore', prompt: 'Read this as one side of a lively, natural podcast conversation. You are Asha, a warm, sharp host. Let small filler words and short pauses sound natural and unforced.' },
  B: { alias: 'Dev', name: 'Puck', prompt: 'Read this as one side of a lively, natural podcast conversation. You are Dev, a curious, playful co-host. Let small filler words and short pauses sound natural and unforced.' },
};

export async function audio(scope, onProgress) {
  const script = await geminiJson(
    `${noteBlock(scope)}

Write a two-host audio deep-dive about these notes — the hosts are Asha ("A", leads, incisive) and Dev ("B", curious, plays devil's advocate). They talk ONLY about what the notes actually say: the findings, the decisions, the open questions, who has to do what. Conversational, specific, zero filler-intro fluff — open in the middle of the interesting part. 380-480 words total.

Respond with JSON: {"title": "episode title, max 8 words", "turns": [{"speaker": "A", "text": "..."}, {"speaker": "B", "text": "..."}]}
14-22 alternating turns. JSON only.`,
    { system: GROUNDING },
  );
  const turns = (script.turns ?? []).filter((t) => (t.speaker === 'A' || t.speaker === 'B') && t.text);
  if (turns.length < 4) throw new Error('script came back too short');

  // The two-host transcript always ships; it doubles as the script the browser
  // voices for free when Gemini TTS is unavailable.
  const transcript = turns.map((t) => ({
    speaker: t.speaker === 'A' ? 'Asha' : 'Dev',
    role: t.speaker, // 'A' | 'B' → the client's two browser voices
    text: t.text,
  }));

  // Gemini TTS is the primary voice; on quota exhaustion fall back to the
  // browser's free speech synthesis (ttsFailed lets the client switch).
  let wavBase64 = null;
  let durationSec = null;
  let ttsFailed = false;
  try {
    const rendered = await renderDialogue(turns, HOST_VOICES, onProgress);
    wavBase64 = rendered.wav.toString('base64');
    durationSec = Math.round(rendered.durationSec);
  } catch (e) {
    if (/quota|429|RESOURCE_EXHAUSTED/i.test(e.message)) ttsFailed = true;
    else throw e;
  }

  return {
    title: String(script.title ?? 'Audio overview'),
    wavBase64,
    durationSec,
    ttsFailed,
    transcript,
    grounding: { label: scope.label, noteCount: scope.notes.length },
  };
}

// ── Shared canvas language for Claude-authored artboards ────────────────────

const BRAND_CANVAS = (w, h, root) => `TECHNICAL CANVAS (hard constraints):
- Each artboard is EXACTLY ${w}x${h}px, root element <div class="${root}">...</div>. Anything past the edges is clipped.
- Rendered in a sandboxed iframe: NO animation, NO transitions, NO JavaScript, NO external resources of any kind. Inline SVG is fully supported (gradients, patterns, masks, stroke-dasharray) — use it for motifs, diagrams, connective lines, texture.
- Fonts already loaded, nothing else exists: 'Source Serif 4' (serif, 400-700 + italics) and 'Inter' (sans, 400-700) and 'JetBrains Mono' (mono, 400/600).
- GroveStudio brand palette — stay strictly inside it: paper #F7F6F2, surface #FFFFFF, sunken #F1EFE9, borders #E8E4DB / #D6D0C3, ink #1B1A17, muted #6E6A5F, faint #9C968A, greens #3F7A4F (accent) #2E5C3A (deep) #567F63 #7C8F5D #3E6B54 #6B8A50 #4E8578, soft green #E4EDE6, amber #B07D2E on #F7EED9 for caution only. No other hues, ever. Light paper canvases, generous whitespace, hairline borders, rounded 12-16px panels — calm editorial, never loud.
- Body text >= 22px, labels >= 14px, line-height >= 1.4, text keeps >= 48px from canvas edges, contrast >= 4.5:1. Readable text never overlaps readable text.
- FULL-CANVAS COMPOSITION: a fixed poster, not a web page — distribute the design across the ENTIRE canvas (masthead, commanding middle, footer strip pinned to the bottom). A dead bottom half is a defect.`;

// Large model-authored HTML breaks JSON reliably (escaping), so artboards
// come back as delimited sections instead — MT_V2 learned this the hard way.
function section(text, name) {
  const m = text.match(new RegExp(`===${name}===\\s*([\\s\\S]*?)(?====[A-Z]+===|$)`));
  return m ? m[1].trim() : '';
}
function sections(text, name) {
  const out = [];
  const re = new RegExp(`===${name}===\\s*([\\s\\S]*?)(?====[A-Z]+===|$)`, 'g');
  let m;
  while ((m = re.exec(text))) out.push(m[1].trim());
  return out;
}

// ── Video overview (Claude slides + Gemini narration) ───────────────────────

const SLIDE_W = 1280;
const SLIDE_H = 720;

export async function video(scope, onProgress) {
  onProgress?.(0.05);
  const raw = await claude({
    system:
      `${GROUNDING}\n\nYou are also an elite editorial designer authoring a narrated slide overview (a "video overview") of the user's notes. ` +
      `Invent a cohesive art direction for THIS deck within the brand language.\n\n${BRAND_CANVAS(SLIDE_W, SLIDE_H, 'slide')}`,
    prompt: `${noteBlock(scope)}

Author a 5-7 slide narrated overview of these notes: cover -> the situation -> the key findings (with the strongest specifics as graphic objects) -> what was decided / next steps -> close.

Respond in EXACTLY this delimited format (no JSON, no fences):
===TITLE===
the deck title, max 8 words
===CSS===
the deck's design-system CSS (classes for masthead, panels, numerals, dividers, motifs)
===SLIDE===
<div class="slide">the full slide HTML</div>
===NARRATION===
2-4 spoken sentences for that slide, natural documentary voice, grounded in the notes
(repeat ===SLIDE=== / ===NARRATION=== pairs for every slide)

SIZE BUDGET (hard): the WHOLE response must stay under about 9000 words — keep the CSS compact (under ~120 lines, no repetition) and each slide's HTML under ~60 lines. Elegance through restraint, not volume.`,
    maxTokens: 32000,
  });
  const css = sanitizeCss(section(raw, 'CSS'));
  // Pair by document order: walk SLIDE/NARRATION as they appear so one missing
  // section can't shift every later pair. Only keep complete pairs.
  const pairRe = /===SLIDE===\s*([\s\S]*?)===NARRATION===\s*([\s\S]*?)(?====SLIDE===|$)/g;
  const slides = [];
  let pm;
  while ((pm = pairRe.exec(raw)) && slides.length < 8) {
    const html = sanitizeHtml(pm[1].trim(), 'slide');
    const narration = pm[2].trim().slice(0, 900);
    if (html && narration) slides.push({ html, narration });
  }
  if (slides.length < 3) throw new Error('the deck came back too short — try again');
  const deck = { title: section(raw, 'TITLE') || 'Video overview' };

  onProgress?.(0.4);
  // Narration is best-effort: the Claude-authored slides are the deliverable,
  // and the tight Gemini TTS quota must never sink the whole video. Voice each
  // slide if we can; on quota exhaustion the slide ships silent (its narration
  // text is on screen either way) and the rest still try.
  let done = 0;
  let quotaHit = false;
  const audios = [];
  for (const s of slides) {
    if (quotaHit) { audios.push(null); continue; }
    try {
      const { wav, durationSec } = await renderNarration(
        s.narration, 'Charon',
        'Read this as a clear, warm documentary narrator — steady pace, no rush.');
      audios.push({ wavBase64: wav.toString('base64'), durationSec });
    } catch (e) {
      if (/quota|429|RESOURCE_EXHAUSTED/i.test(e.message)) quotaHit = true;
      audios.push(null);
    }
    done += 1;
    onProgress?.(0.4 + 0.55 * (done / slides.length));
  }
  const voiced = audios.filter(Boolean).length;

  return {
    title: deck.title,
    css,
    width: SLIDE_W,
    height: SLIDE_H,
    slides: slides.map((s, i) => ({ ...s, ...(audios[i] ?? {}) })),
    voiced,
    quotaHit,
    grounding: { label: scope.label, noteCount: scope.notes.length },
  };
}

// ── Infographic (Claude) ────────────────────────────────────────────────────

const INFO_W = 1080;
const INFO_H = 1350;

export async function infographic(scope) {
  const raw = await claude({
    system:
      `${GROUNDING}\n\nYou are also an elite information designer authoring ONE infographic poster that makes the user's notes legible at a glance. ` +
      `Invent the art direction (editorial grid, blueprint-schematic, data panel — whatever fits the content) within the brand language.\n\n${BRAND_CANVAS(INFO_W, INFO_H, 'board')}`,
    prompt: `${noteBlock(scope)}

Author the infographic: a masthead naming the subject, the 3-5 strongest specifics from the notes treated as graphic objects (big numerals, labeled diagram, quote panel, timeline — pick what the content earns), and a footer strip. Dense but readable.

Respond in EXACTLY this delimited format (no JSON, no fences):
===TITLE===
the poster title, max 8 words
===CSS===
the design-system CSS
===HTML===
<div class="board">the full poster HTML</div>

SIZE BUDGET (hard): the WHOLE response must stay under about 6000 words — CSS under ~120 lines, poster HTML under ~160 lines. Elegance through restraint, not volume.`,
    maxTokens: 24000,
  });
  const css = sanitizeCss(section(raw, 'CSS'));
  const html = sanitizeHtml(section(raw, 'HTML'), 'board');
  if (!html || html.length < 200) throw new Error('empty infographic — try again');
  return {
    title: section(raw, 'TITLE') || 'Infographic',
    css,
    html,
    width: INFO_W,
    height: INFO_H,
    grounding: { label: scope.label, noteCount: scope.notes.length },
  };
}
