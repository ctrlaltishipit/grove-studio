// localStorage helpers — every access wrapped, storage can throw or vanish.

function read(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key, val) {
  try {
    if (val == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, val);
  } catch { /* private windows etc. — losing a convenience is fine */ }
}

export function loadTheme() { return read('gs:theme'); }
export function saveTheme(t) { write('gs:theme', t); }

// Check-in banner dismissal: remember per task per day.
export function checkinDismissed(taskId) {
  return read('gs:checkin:' + taskId) === new Date().toISOString().slice(0, 10);
}
export function dismissCheckin(taskId) {
  write('gs:checkin:' + taskId, new Date().toISOString().slice(0, 10));
}

export function loadGuestName() { return read('gs:guest-name') ?? ''; }
export function saveGuestName(n) { write('gs:guest-name', n); }

export function loadStudioMin() { return read('gs:studio-min') === '1'; }
export function saveStudioMin(min) { write('gs:studio-min', min ? '1' : null); }
