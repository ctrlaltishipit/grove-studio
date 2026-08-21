import { loadTheme, saveTheme } from './local';

// Three states: 'light', 'dark', or absent (follow the system).
// data-theme is stamped on <html>; tokens.css handles all three cases.
export function initTheme() {
  const t = loadTheme();
  if (t === 'light' || t === 'dark') {
    document.documentElement.setAttribute('data-theme', t);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme'); // null = system
}

export function resolvedTheme() {
  const t = currentTheme();
  if (t) return t;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Cycles light -> dark -> system.
export function cycleTheme() {
  const t = currentTheme();
  const next = t === 'light' ? 'dark' : t === 'dark' ? null : 'light';
  saveTheme(next);
  initTheme();
  return next;
}
