// Grove — the capture-mode feed: 3-second polling, a heartbeat, and catch-up on
// visibility/online. GROVE-MASTER.md §13 rule 3: polling is built FIRST and is
// the shipping configuration. There is deliberately NO Realtime branch in v1 —
// Realtime does not apply RLS to DELETE events, and notes never enter a
// publication. A 3-second delay is invisible in a demo; a dead feed is the demo.
import { HEARTBEAT_MS, POLL_MS } from './config';
import type { Note, RosterRow, Session } from './models';
import { getRoster, getSession, heartbeat, listMyNotes } from './supabase';

export interface SyncHandlers {
  sessionId: string;
  participantId: string;
  onRoster: (rows: RosterRow[]) => void;
  onMyNotes: (notes: Note[]) => void;
  onStatus: (status: Session['status']) => void;
  onError?: (e: unknown) => void;
}

export interface SyncHandle {
  /** Refresh now — after adding or deleting a note, so the count moves without waiting a tick. */
  tick: () => Promise<void>;
  stop: () => void;
}

export function startSync(h: SyncHandlers): SyncHandle {
  let stopped = false;
  let inFlight = false;

  async function tick(): Promise<void> {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const [roster, notes, session] = await Promise.all([
        getRoster(h.sessionId),
        listMyNotes(h.sessionId, h.participantId),
        getSession(h.sessionId),
      ]);
      if (stopped) return;
      h.onRoster(roster);
      h.onMyNotes(notes);
      if (session) h.onStatus(session.status);
    } catch (e) {
      // Transient. The next tick retries; the UI keeps what it has.
      h.onError?.(e);
    } finally {
      inFlight = false;
    }
  }

  function beat(): void {
    if (stopped || document.hidden) return;
    // A missed beat renders as "not seen recently", which is honest.
    heartbeat(h.participantId).catch(() => {});
  }

  const wake = (): void => { void tick(); beat(); };

  void tick();
  beat();
  const pollTimer = setInterval(() => { void tick(); }, POLL_MS);
  const beatTimer = setInterval(beat, HEARTBEAT_MS);
  // The app WILL sit idle while a judge reads the deck. Catch up the instant it is looked at.
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);

  return {
    tick,
    stop() {
      stopped = true;
      clearInterval(pollTimer);
      clearInterval(beatTimer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    },
  };
}
