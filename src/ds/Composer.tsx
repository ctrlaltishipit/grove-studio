// Grove — 8.4 Composer + 8.5 kind selector + 8.20 dictate.
// GROVE-MASTER.md §8.4, §8.5, §8.20, §8.21.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Recording } from './Recording';
import { createDictation, dictationSupported } from '../lib/dictation';
import type { Dictation } from '../lib/dictation';
import type { NoteKind } from '../lib/models';

interface KindOption {
  value: NoteKind;
  label: string;
}

const KINDS: KindOption[] = [
  { value: 'observation', label: 'Observation' },
  { value: 'quote',       label: 'Quote' },
  { value: 'question',    label: 'Question' },
];

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (body: string, kind: NoteKind) => void;
  submitting?: boolean;
  sticky?: boolean;
  error?: boolean;
}

export function Composer({ value, onChange, onSubmit, submitting, sticky, error }: ComposerProps) {
  const [kind, setKind] = useState<NoteKind>('observation');
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const dictation = useRef<Dictation | null>(null);
  const baseText = useRef('');

  useEffect(() => { area.current?.focus(); }, []);

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

  const join = (base: string, addition: string): string => {
    if (!addition) return base;
    if (!base) return addition;
    return /\s$/.test(base) ? base + addition : `${base} ${addition}`;
  };

  function toggleDictation() {
    if (listening) { dictation.current?.stop(); return; }
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
      onEnd: () => { setListening(false); area.current?.focus(); },
    });
    if (!dictation.current) return;
    dictation.current.start();
    setListening(true);
  }

  const empty = !value.trim();
  const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

  return (
    <div>
      {error && (
        <div className="notice" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          <p className="t-body">That note didn&rsquo;t save. It&rsquo;s still in the box — try again.</p>
        </div>
      )}
      <form
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
                onClick={() => setKind(k.value)}
                onKeyDown={(e) => {
                  const i = KINDS.findIndex((x) => x.value === kind);
                  if (e.key === 'ArrowRight') setKind(KINDS[(i + 1) % KINDS.length].value);
                  if (e.key === 'ArrowLeft')  setKind(KINDS[(i + KINDS.length - 1) % KINDS.length].value);
                }}
              >
                {k.label}
              </button>
            ))}
          </div>

          {/* Where SpeechRecognition is absent the control does not render.
              Silently. No message, no disabled state. §8.20 */}
          {dictationSupported && !listening && (
            <button
              type="button"
              className="btn btn--ghost btn--icon mic"
              aria-pressed="false"
              aria-label="Dictate a note"
              onClick={toggleDictation}
            >
              <Icon name="mic" />
            </button>
          )}

          {listening
            ? <Recording seconds={seconds} onStop={() => dictation.current?.stop()} />
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
            if (e.key === 'Escape') e.currentTarget.blur(); // blurs WITHOUT clearing
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
