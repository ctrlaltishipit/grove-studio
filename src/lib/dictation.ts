// Grove — dictation. Amendment A1. GROVE-MASTER.md §4.7, §8.20.
//
// The browser's own speech service turns YOUR speech into text in YOUR
// composer. Grove uploads nothing and stores nothing: it receives text.
//
// NO microphone is ever pointed at the room. There is no session recording,
// no audio file, no transcript, no timeline. Dictated text NEVER auto-submits.

// Minimal Web Speech API surface. lib.dom ships SpeechRecognitionResult and
// SpeechRecognitionResultList but not the recogniser itself, so the rest is
// declared here, module-local. No @types package.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const Recognition: SpeechRecognitionConstructor | null | undefined =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/** Firefox has no SpeechRecognition. Where it is absent the control does not
 *  render — silently, with no message. Absence looks like absence. */
export const dictationSupported = Boolean(Recognition);

const MAX_MS = 60000; // stop after 60s of continuous listening

export interface DictationHandlers {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onEnd?: () => void;
  onError?: (code: string) => void;
}

export interface Dictation {
  start(): void;
  stop(): void;
}

export function createDictation({ onInterim, onFinal, onEnd, onError }: DictationHandlers): Dictation | null {
  if (!Recognition) return null;

  const rec = new Recognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || 'en-IN';

  let timer: ReturnType<typeof setTimeout> | null = null;
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
