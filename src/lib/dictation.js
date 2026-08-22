// GroveStudio — dictation, ported from the previous version (lib/dictation.ts).
//
// The browser's own speech service turns YOUR speech into text in YOUR
// editor. GroveStudio uploads nothing and stores nothing: it receives text.
//
// NO microphone is ever pointed at the room. There is no session recording,
// no audio file, no transcript, no timeline. Dictated text NEVER auto-submits.

const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Firefox has no SpeechRecognition. Where it is absent the control does not
// render — silently, with no message. Absence looks like absence.
export const dictationSupported = Boolean(Recognition);

const MAX_MS = 60000; // stop after 60s of continuous listening

export function createDictation({ onInterim, onFinal, onEnd, onError }) {
  if (!Recognition) return null;

  const rec = new Recognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || 'en-IN';

  let timer = null;
  let stopped = false;

  rec.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result[0]?.transcript || '';
      if (result.isFinal) onFinal?.(text.trim());
      else interim += text;
    }
    if (interim) onInterim?.(interim.trim());
  };

  rec.onerror = (event) => {
    // 'not-allowed' and 'service-not-allowed' are a refused microphone.
    // That is a fact, not a failure — one line, then get out of the way.
    onError?.(event.error);
  };

  rec.onend = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!stopped) { stopped = true; onEnd?.(); }
  };

  return {
    start() {
      stopped = false;
      try { rec.start(); } catch { /* already started */ }
      timer = setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, MAX_MS);
    },
    stop() {
      stopped = true;
      if (timer) { clearTimeout(timer); timer = null; }
      try { rec.stop(); } catch { /* already stopped */ }
      onEnd?.();
    },
  };
}
