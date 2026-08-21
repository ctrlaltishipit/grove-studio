// Every localStorage read and write is wrapped. Safari private mode throws
// on write, and an uncaught throw here white-screens the app.

const K = {
  displayName:     'grove:displayName',
  theme:           'grove:theme',
  lastSession:     'grove:lastSession',
  rosterCollapsed: 'grove:rosterCollapsed',
  draft:           (sessionId) => `grove:draft:${sessionId}`,
};

function read(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* private mode, quota, disabled storage — all non-fatal */ }
}

export const loadDisplayName = () => read(K.displayName) ?? '';
export const saveDisplayName = (v) => write(K.displayName, v);

export const loadTheme = () => read(K.theme);                 // 'light' | 'dark' | null
export const saveTheme = (v) => write(K.theme, v);

export const loadDraft = (sessionId) => read(K.draft(sessionId)) ?? '';
export const saveDraft = (sessionId, v) => write(K.draft(sessionId), v);
export const clearDraft = (sessionId) => write(K.draft(sessionId), null);

export function loadLastSession() {
  const raw = read(K.lastSession);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function saveLastSession(obj) {
  try { write(K.lastSession, JSON.stringify(obj)); } catch { /* noop */ }
}
