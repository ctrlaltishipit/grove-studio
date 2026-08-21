// Grove — theming. GROVE-MASTER.md §9.2.
// data-theme absent means FOLLOW THE SYSTEM. That is the default state, not a
// fallback. The toggle cycles System → Light → Dark → System.
import { loadTheme, saveTheme, type ThemeChoice } from './storage';

export type Theme = ThemeChoice;

export function initTheme(): void {
  const saved = loadTheme();
  if (saved === 'light' || saved === 'dark') document.documentElement.setAttribute('data-theme', saved);
  else document.documentElement.removeAttribute('data-theme');
}

export function setTheme(next: Theme | null): void {
  saveTheme(next);
  // No cross-fade between themes (§6.5, §8.19). Every transition is suppressed
  // while the attribute flips and released two frames later, once the new
  // colours have painted — so the switch is a cut, not a blend.
  const root = document.documentElement;
  root.classList.add('theme-switching');
  initTheme();
  const release = () => root.classList.remove('theme-switching');
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(release));
  } else {
    release();
  }
}

export function storedTheme(): Theme | null {
  const saved = loadTheme();
  return saved === 'light' || saved === 'dark' ? saved : null;
}

export function systemTheme(): Theme {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'light'; }
}

export function currentTheme(): Theme {
  return storedTheme() || systemTheme();
}

export function nextInCycle(): Theme | null {
  const s = storedTheme();
  if (s === null) return 'light';
  if (s === 'light') return 'dark';
  return null; // back to following the system
}
