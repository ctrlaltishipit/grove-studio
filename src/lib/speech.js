// =============================================================================
// GroveStudio — browser speech synthesis (Web Speech API).
//
// Free and unlimited: the OS voices, no API, no quota. The studio server
// produces the SCRIPT (cheap Gemini text); this speaks it in the browser.
// Two distinct voices power the two-host audio overview; one warm voice
// narrates the video. Utterances are split to sentences to dodge the Chrome
// ~15s cut-off, and a keep-alive nudges the queue so long reads don't stall.
// =============================================================================

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export function speechSupported() {
  return Boolean(synth && typeof window.SpeechSynthesisUtterance === 'function');
}

// Voices load async in most browsers — resolve once they're available.
export function loadVoices() {
  return new Promise((resolve) => {
    if (!synth) return resolve([]);
    const now = synth.getVoices();
    if (now.length) return resolve(now);
    let done = false;
    const finish = () => { if (done) return; done = true; resolve(synth.getVoices()); };
    synth.addEventListener('voiceschanged', finish, { once: true });
    setTimeout(finish, 1200); // fallback if the event never fires
  });
}

// Pick up to n distinct English voices, preferring local (offline) ones and
// spreading across different voices so the two hosts sound different.
export function pickVoices(voices, n = 2) {
  const en = voices.filter((v) => /^en(-|$)/i.test(v.lang));
  const pool = (en.length ? en : voices).slice();
  // Prefer local service voices first (more reliable, no network).
  pool.sort((a, b) => (b.localService === true) - (a.localService === true));
  const seen = new Set();
  const picked = [];
  for (const v of pool) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);
    picked.push(v);
    if (picked.length >= n) break;
  }
  while (picked.length < n) picked.push(picked[picked.length - 1] ?? null);
  return picked;
}

function sentences(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]*/g) ?? [];
}

// Build a flat list of utterance segments from labeled turns. Each segment
// carries its source turn index so the UI can highlight the active turn.
export function segmentsFromTurns(turns, voices) {
  const segs = [];
  turns.forEach((t, turnIndex) => {
    const voice = voices[t.voiceSlot ?? 0] ?? voices[0] ?? null;
    for (const s of sentences(t.text)) {
      const text = s.trim();
      if (text) segs.push({ text, voice, turnIndex, rate: 1, pitch: t.pitch ?? 1 });
    }
  });
  return segs;
}

// A sequential speaker over pre-built segments. play() cancels anything
// running first. Reports the active segment index; derive the turn from it.
export function createSpeaker() {
  let segs = [];
  let i = 0;
  let stopped = true;
  let userPaused = false;
  let keepAlive = null;
  let handlers = {};

  function clearKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }
  function startKeepAlive() {
    clearKeepAlive();
    // Chrome pauses long queues; a periodic resume keeps them moving.
    keepAlive = setInterval(() => {
      if (!synth) return;
      if (!userPaused && !stopped && synth.speaking && synth.paused) synth.resume();
    }, 5000);
  }

  function speakNext() {
    if (stopped || !synth) return;
    if (i >= segs.length) { clearKeepAlive(); stopped = true; handlers.onEnd?.(); return; }
    const seg = segs[i];
    const u = new window.SpeechSynthesisUtterance(seg.text);
    if (seg.voice) u.voice = seg.voice;
    u.rate = seg.rate ?? 1;
    u.pitch = seg.pitch ?? 1;
    u.onend = () => { if (!stopped) { i += 1; handlers.onSegment?.(i); speakNext(); } };
    u.onerror = () => { if (!stopped) { i += 1; speakNext(); } };
    handlers.onSegment?.(i);
    synth.speak(u);
  }

  return {
    play(segments, opts = {}) {
      if (!synth) return;
      synth.cancel();
      segs = segments;
      i = 0;
      stopped = false;
      userPaused = false;
      handlers = opts;
      startKeepAlive();
      speakNext();
    },
    pause() { if (synth) { userPaused = true; synth.pause(); } },
    resume() { if (synth) { userPaused = false; synth.resume(); } },
    stop() { stopped = true; userPaused = false; clearKeepAlive(); synth?.cancel(); },
    seekTo(segIndex) {
      if (!synth) return;
      synth.cancel();
      i = Math.max(0, Math.min(segIndex, segs.length));
      stopped = false;
      userPaused = false;
      startKeepAlive();
      speakNext();
    },
    segIndex: () => i,
    total: () => segs.length,
    turnOf: (segIndex) => segs[segIndex]?.turnIndex ?? 0,
  };
}
