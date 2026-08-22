// Small date/text formatters shared across the app.

export function relTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  const d = new Date(iso);
  const days = Math.floor(s / 86400);
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function shortTime(iso) {
  // Compact form for mono chips: "2m", "3h", "Mon", "22 Aug".
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.round(s / 60) + 'm';
  if (s < 86400) return Math.round(s / 3600) + 'h';
  const d = new Date(iso);
  if (s < 7 * 86400) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function fmtDue(dateStr) {
  // due_date is a plain date. "Tue 26 Aug".
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function dueUrgency(dateStr, status) {
  // 'done' | 'late' | 'soon' | 'normal' | 'none'
  if (status === 'done') return 'done';
  if (!dateStr) return 'none';
  const due = new Date(dateStr + 'T23:59:59').getTime();
  if (Number.isNaN(due)) return 'none';
  const days = (due - Date.now()) / 86400000;
  if (days < 0) return 'late';
  if (days <= 2) return 'soon';
  return 'normal';
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayLine() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function isoDateInDays(n) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}
