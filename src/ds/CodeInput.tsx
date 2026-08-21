// Grove — 8.15 Code input. GROVE-MASTER.md §8.15.
import { useEffect, useRef } from 'react';

// 31 characters, with O, 0, 1, I and L removed — the code is read aloud on a
// call and typed by someone half-listening.
export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const allowed = (ch: string): boolean => ALPHABET.includes(ch);

export function normaliseCode(raw: string | null | undefined): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .split('')
    .filter(allowed)
    .join('')
    .slice(0, 6);
}

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function CodeInput({ value, onChange, error, autoFocus, disabled }: CodeInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.padEnd(6, ' ').split('').slice(0, 6);

  useEffect(() => {
    if (!autoFocus) return;
    const box = boxes.current[value.length];
    if (box) box.focus();
    else boxes.current[0]?.focus();
  }, []); // eslint-disable-line

  function setAt(i: number, ch: string) {
    const next = value.padEnd(6, ' ').split('');
    next[i] = ch;
    onChange(next.join('').replace(/\s+$/g, '').trimEnd());
  }

  return (
    <div className={`codeinput${error ? ' codeinput--error' : ''}`} role="group" aria-label="Session code, six characters">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => { boxes.current[i] = el; }}
          className="codeinput__box"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck="false"
          maxLength={1}
          disabled={disabled}
          aria-label={`Character ${i + 1} of 6`}
          aria-invalid={error ? 'true' : undefined}
          value={ch.trim()}
          onChange={(e) => {
            const typed = e.target.value.toUpperCase().slice(-1);
            // Out-of-alphabet keystrokes are SILENTLY rejected, not shown as
            // an error. §8.15
            if (!typed || !allowed(typed)) return;
            setAt(i, typed);
            if (i < 5) boxes.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (ch.trim()) { setAt(i, ' '); }
              else if (i > 0) { setAt(i - 1, ' '); boxes.current[i - 1]?.focus(); }
            }
            if (e.key === 'ArrowLeft'  && i > 0) boxes.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = normaliseCode(e.clipboardData.getData('text'));
            if (!pasted) return;
            onChange(pasted);
            boxes.current[Math.min(5, pasted.length - 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
