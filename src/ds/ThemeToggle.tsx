// Grove — 8.19 Theme toggle + S8 appearance popover. GROVE-MASTER.md §8.19, §7 S8.
// Direct press cycles System → Light → Dark → System, applied immediately with
// no reload and no colour transition. Context-menu or Enter opens the popover.
// The popover is not a modal: no scrim, no trap; dismisses on Escape, outside
// click and scroll.
import { useEffect, useRef, useState } from 'react';
import { currentTheme, nextInCycle, setTheme, storedTheme, systemTheme, type Theme } from '../lib/theme';
import { Icon, type IconName } from './Icon';

export function ThemeToggle() {
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const stored = storedTheme();
  const active = currentTheme();

  useEffect(() => {
    if (!open) return undefined;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node | null)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    // Dismisses on scroll too. It is a popover, not a modal — no scrim, no trap.
    window.addEventListener('scroll', () => setOpen(false), { once: true });
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const icon: IconName = stored === 'light' ? 'sun' : stored === 'dark' ? 'moon' : 'system';
  const label = stored
    ? `Appearance: ${stored}`
    : `Appearance: following the system, currently ${active}`;

  const choose = (value: Theme | null) => { setTheme(value); setOpen(false); force((n) => n + 1); };

  return (
    <div style={{ position: 'relative' }} ref={box}>
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => { setTheme(nextInCycle()); force((n) => n + 1); }}
        onContextMenu={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setOpen((v) => !v); } }}
      >
        <Icon name={icon} />
      </button>
      {open && (
        <div className="popover" role="radiogroup" aria-label="Appearance">
          <div className="t-tracked muted" style={{ padding: 'var(--space-3)' }}>Appearance</div>
          <button type="button" role="radio" aria-checked={stored === null} className="popover__row" onClick={() => choose(null)}>
            <span>
              <span className="t-label">System</span>
              <span className="t-label muted" style={{ display: 'block' }}>
                {systemTheme() === 'dark' ? 'Currently dark' : 'Currently light'}
              </span>
            </span>
            {stored === null && <span className="spacer" />}
            {stored === null && <Icon name="check" size={16} />}
          </button>
          <button type="button" role="radio" aria-checked={stored === 'light'} className="popover__row" onClick={() => choose('light')}>
            <span className="t-label">Light</span><span className="spacer" />
            {stored === 'light' && <Icon name="check" size={16} />}
          </button>
          <button type="button" role="radio" aria-checked={stored === 'dark'} className="popover__row" onClick={() => choose('dark')}>
            <span className="t-label">Dark</span><span className="spacer" />
            {stored === 'dark' && <Icon name="check" size={16} />}
          </button>
          <div className="rule" />
          <div className="t-label muted" style={{ padding: 'var(--space-3)' }}>Saved on this device.</div>
        </div>
      )}
    </div>
  );
}
