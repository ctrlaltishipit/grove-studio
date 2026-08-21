// Grove — runtime configuration. GROVE-MASTER.md §13, CLAUDE.md §3.
export const USE_REALTIME = import.meta.env.VITE_USE_REALTIME === 'true'; // default FALSE
export const POLL_MS = 3000;      // roster + own-lane refresh cadence
export const HEARTBEAT_MS = 5000; // last_seen_at write cadence
export const STALE_MS = 15000;    // no heartbeat for 15s → inactive

// Solo mode (Door B): with exactly one participant, Synthesise arms at 3 notes.
// Mirrors SOLO_NOTE_GATE in api/synthesise.py — keep the two in step.
export const SOLO_NOTE_GATE = 3;

export const OBSERVER_COLOURS = 5;
