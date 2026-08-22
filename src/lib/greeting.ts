// Grove Studio — the greeting on the home screen.
// IST, matching every other time in the product (§9.3).
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(now),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "2 hours ago" / "yesterday". Short, plain, never cute (§9.3). */
export function relative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const secs = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return 'yesterday';
  return `${Math.floor(secs / 86400)}d ago`;
}
