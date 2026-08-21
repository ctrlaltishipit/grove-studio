// Grove runtime configuration. Four values, no more.

// Polling is the SHIPPING configuration. VITE_USE_REALTIME is unset in
// production, so this is false. Both sync paths exist in sync.js behind
// this one flag; a judge on a projector cannot tell a 3s poll from a
// WebSocket push, and a dead feed is the demo.
export const USE_REALTIME = import.meta.env.VITE_USE_REALTIME === 'true';

export const POLL_MS      = 3000;   // roster + own-lane refresh cadence
export const HEARTBEAT_MS = 5000;   // last_seen_at write cadence
export const STALE_MS     = 15000;  // no heartbeat for 15s -> render as away
