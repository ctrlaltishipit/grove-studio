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
  initTheme();
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
