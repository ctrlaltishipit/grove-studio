import { STALE_MS } from '../config';

// Do NOT use Supabase Presence — an open issue reports listeners never
// firing on hosted projects. The roster derives presence from the
// last_seen_at heartbeat, which is an ordinary column read.
export function isHere(participant, now = Date.now()) {
  if (!participant?.last_seen_at) return false;
  const seen = new Date(participant.last_seen_at).getTime();
  if (Number.isNaN(seen)) return false;
  return now - seen < STALE_MS;
}
