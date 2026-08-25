import { loadTheme, saveTheme } from './local';

// Three states: 'light', 'dark', or 'system' (explicitly chosen).
// A first-time visitor gets LIGHT: with no stored choice the app stamps
// light rather than following the OS — dark stays one click away.
export function initTheme() {
  const t = loadTheme();
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', 'light');
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme'); // null = system
}

// Cycles light -> dark.
export function cycleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  saveTheme(next);
  initTheme();
  return next;
}

// Set an explicit theme; 'system' (or null) follows the OS.
export function setTheme(next) {
  saveTheme(next === 'light' || next === 'dark' ? next : 'system');
  initTheme();
  return currentTheme();
}
