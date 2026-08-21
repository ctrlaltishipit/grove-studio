// Grove — 8.4 Composer + 8.5 kind selector + 8.20 dictate.
// GROVE-MASTER.md §8.4, §8.5, §8.20, §8.21.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { Recording } from './Recording';
import { createDictation, dictationSupported } from '../lib/dictation';
import type { Dictation } from '../lib/dictation';
import { DEFAULT_KIND, KINDS } from '../lib/kinds';
import { loadKind, saveKind } from '../lib/storage';
import type { NoteKind } from '../lib/models';

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (body: string, kind: NoteKind) => void;
  submitting?: boolean;
  sticky?: boolean;
  error?: boolean;
  /** When given, the kind selector remembers its choice for this session on
   *  the device (grove:kind:<sessionId>). §8.5 */
  sessionId?: string;
}

export function Composer({ value, onChange, onSubmit, submitting, sticky, error, sessionId }: ComposerProps) {
  const [kind, setKind] = useState<NoteKind>(() => (sessionId ? loadKind(sessionId) : DEFAULT_KIND));
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const dictation = useRef<Dictation | null>(null);
  const baseText = useRef('');
  // Mirrors `listening` for handlers that fire before React re-renders — the
  // blur that follows Escape, for example.
  const listeningRef = useRef(false);
  // Whether the textarea takes focus back when dictation ends. A stop caused
  // by the textarea losing focus must not steal focus from wherever it went.
  const refocusOnEnd = useRef(true);

  useEffect(() => { area.current?.focus(); }, []);

  // The remembered kind follows the session. §8.5
  useEffect(() => { if (sessionId) setKind(loadKind(sessionId)); }, [sessionId]);

  useEffect(() => {
    if (!listening) return undefined;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  // Stop dictating when the tab is hidden. The microphone is never live in the
  // background. §8.20
  useEffect(() => {
    const hide = () => { if (document.hidden) dictation.current?.stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); dictation.current?.stop(); };
  }, []);

  // Below 640px the composer is sticky at the bottom; it publishes its height
  // so the toast can sit 16px clear above it. §8.16
  useEffect(() => {
    const el = form.current;
    if (!sticky || !el || typeof ResizeObserver === 'undefined') return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--composer-h', `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => { observer.disconnect(); root.style.removeProperty('--composer-h'); };
  }, [sticky]);

  const chooseKind = (next: NoteKind) => {
    setKind(next);
    if (sessionId) saveKind(sessionId, next);
  };

  const join = (base: string, addition: string): string => {
    if (!addition) return base;
    if (!base) return addition;
    return /\s$/.test(base) ? base + addition : `${base} ${addition}`;
  };

  function stopDictation(refocus: boolean) {
    if (!listeningRef.current) return;
    refocusOnEnd.current = refocus;
    dictation.current?.stop();
  }

  function toggleDictation() {
    if (listeningRef.current) { stopDictation(true); return; }
    setMicError(false);
    setSeconds(0);
    baseText.current = value;
    dictation.current = createDictation({
      onInterim: (text) => onChange(join(baseText.current, text)),
      // Dictated text is APPENDED and NEVER auto-submitted. The observer reads
      // it before it becomes a note. §8.20
      onFinal: (text) => { baseText.current = join(baseText.current, text); onChange(baseText.current); },
      onError: (code) => {
        if (code === 'not-allowed' || code === 'service-not-allowed') setMicError(true);
      },
      onEnd: () => {
        listeningRef.current = false;
        setListening(false);
        if (refocusOnEnd.current) area.current?.focus();
        refocusOnEnd.current = true;
      },
    });
    if (!dictation.current) return;
    dictation.current.start();
    listeningRef.current = true;
    setListening(true);
  }

  const empty = !value.trim();
  const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

  return (
    <div>
      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Notice>That note didn&rsquo;t save. It&rsquo;s still in the box — try again.</Notice>
        </div>
      )}
      <form
        ref={form}
        className={`composer${sticky ? ' composer--sticky' : ''}`}
        onSubmit={(e) => { e.preventDefault(); if (!empty) onSubmit(value, kind); }}
      >
        <div className="composer__top">
          <div className="segmented" role="radiogroup" aria-label="Note kind">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                tabIndex={kind === k.value ? 0 : -1}
                className="segmented__item"
                onClick={() => chooseKind(k.value)}
                onKeyDown={(e) => {
                  const i = KINDS.findIndex((x) => x.value === kind);
                  if (e.key === 'ArrowRight') chooseKind(KINDS[(i + 1) % KINDS.length].value);
                  if (e.key === 'ArrowLeft')  chooseKind(KINDS[(i + KINDS.length - 1) % KINDS.length].value);
                }}
              >
                {k.label}
              </button>
            ))}
          </div>

          {/* Where SpeechRecognition is absent the control does not render.
              Silently. No message, no disabled state. While listening the same
              control stays in place as the stop toggle — only the hint slot
              swaps for the recording indicator. §8.20 */}
          {dictationSupported && (
            <button
              type="button"
              className="btn btn--ghost btn--icon mic"
              aria-pressed={listening}
              aria-label={listening ? 'Stop dictating' : 'Dictate a note'}
              onClick={toggleDictation}
              onKeyDown={(e) => { if (e.key === 'Escape') stopDictation(false); }}
            >
              <Icon name="mic" />
            </button>
          )}

          {listening
            ? <Recording seconds={seconds} onStop={() => stopDictation(true)} />
            : <span className="composer__hint">{modKey} + Enter to add</span>}
        </div>

        <label className="vh" htmlFor="composer-area">Your note</label>
        <textarea
          id="composer-area"
          ref={area}
          className="textarea composer__area"
          rows={3}
          placeholder="Write what you noticed."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !empty) { e.preventDefault(); onSubmit(value, kind); }
            // Escape stops dictation first, then blurs WITHOUT clearing. §8.4, §11.4
            if (e.key === 'Escape') { stopDictation(false); e.currentTarget.blur(); }
          }}
          onBlur={(e) => {
            // Pressing the dictate control or Stop moves focus there first;
            // that press stops dictation itself and returns focus here. Any
            // other blur stops it where focus now lives. §8.20
            const to = e.relatedTarget;
            if (to instanceof HTMLElement && to.closest('.mic, .recording')) return;
            stopDictation(false);
          }}
        />

        {micError && (
          <p className="t-label muted" style={{ marginTop: 'var(--space-2)' }}>
            Grove can&rsquo;t reach the microphone. Type the note instead.
          </p>
        )}

        <div className="composer__bottom">
          <button type="submit" className="btn btn--primary" disabled={empty || submitting}>
            Add note
          </button>
        </div>
      </form>
    </div>
  );
}
