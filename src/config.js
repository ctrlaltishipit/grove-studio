// GroveStudio runtime configuration.

// Polling is the base sync path — proven reliable on this Supabase project.
// Realtime (broadcast + presence) layers live typing and roster on top and
// needs no publication config; postgres_changes is attempted but optional.
export const POLL_MS = 3000;    // notes/tasks refresh cadence in an open space
export const SLOW_POLL_MS = 12000; // members, dashboard data
export const HEARTBEAT_MS = 20000; // last_seen_at write cadence
export const SAVE_DEBOUNCE_MS = 700;   // editor -> DB
export const BROADCAST_DEBOUNCE_MS = 200; // editor -> peers
