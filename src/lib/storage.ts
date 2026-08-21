// Grove — device storage. GROVE-MASTER.md §5.6 / §9.5.
// EVERY accessor is wrapped in try/catch. Safari private mode throws on write,
// and an uncaught throw here white-screens the app.
import type { NoteKind } from './models';
import { DEFAULT_KIND, isKind } from './kinds';

function get(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function set(key: string, value: string | null | undefined): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* ignore */ }
}

export type ThemeChoice = 'light' | 'dark';

export const loadTheme = (): string | null => get('grove:theme');
export const saveTheme = (v: ThemeChoice | null): void => set('grove:theme', v);

export const loadName = (): string => get('grove:displayName') || '';
export const saveName = (v: string): void => set('grove:displayName', v);

export const loadDraft = (sessionId: string): string => get(`grove:draft:${sessionId}`) || '';
export const saveDraft = (sessionId: string, v: string): void => set(`grove:draft:${sessionId}`, v);

// The kind selector remembers its choice for the session on the device. §8.5
// An unknown or missing value renders as the default, never as a blank.
export const loadKind = (sessionId: string): NoteKind => {
  const v = get(`grove:kind:${sessionId}`);
  return isKind(v) ? v : DEFAULT_KIND;
};
export const saveKind = (sessionId: string, kind: NoteKind): void => set(`grove:kind:${sessionId}`, kind);

export const loadRosterCollapsed = (): boolean => get('grove:rosterCollapsed') === '1';
export const saveRosterCollapsed = (v: boolean): void => set('grove:rosterCollapsed', v ? '1' : '0');

export const loadReceiptOpen = (): boolean => get('grove:receiptOpen') === '1';
export const saveReceiptOpen = (v: boolean): void => set('grove:receiptOpen', v ? '1' : '0');

export interface LastSession { sessionId: string; title: string; joinCode: string }

export function loadLastSession(): LastSession | null {
  try { return JSON.parse(get('grove:lastSession') || 'null') as LastSession | null; } catch { return null; }
}
export function saveLastSession(obj: LastSession): void {
  try { set('grove:lastSession', JSON.stringify(obj)); } catch { /* ignore */ }
}

// Script cache lives in sessionStorage — a cache, not state (Listen, stretch).
export function loadScript<T = unknown>(sessionId: string): T | null {
  try { return JSON.parse(sessionStorage.getItem(`grove:script:${sessionId}`) || 'null') as T | null; } catch { return null; }
}
export function saveScript(sessionId: string, obj: unknown): void {
  try { sessionStorage.setItem(`grove:script:${sessionId}`, JSON.stringify(obj)); } catch { /* ignore */ }
}
