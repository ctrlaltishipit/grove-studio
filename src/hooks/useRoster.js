import { useEffect, useState } from 'react';
import { startSync } from '../lib/sync';

// Roster counts, own-lane notes and session status, all through the one sync
// module so the polling/realtime choice is invisible to components.
export function useRoster({ sessionId, participantId }) {
  const [roster, setRoster] = useState([]);
  const [notes, setNotes] = useState([]);
  const [status, setStatus] = useState('live');
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    if (!sessionId || !participantId) return undefined;
    const stop = startSync({
      sessionId,
      participantId,
      onRoster: setRoster,
      onMyNotes: (rows) => {
        // Never clobber an optimistic row that has not round-tripped yet.
        setNotes((prev) => {
          const pending = prev.filter((n) => n._pending);
          return pending.length ? [...pending, ...rows] : rows;
        });
      },
      onStatus: setStatus,
      onError: setSyncError,
    });
    return stop;
  }, [sessionId, participantId]);

  return { roster, setRoster, notes, setNotes, status, syncError };
}
