import { useCallback, useEffect, useState } from 'react';
import { ensureAnonSession } from '../lib/auth';
import { getSession, getMyParticipant } from '../lib/data';

// Session row + this browser's participant row. Hooks own fetching;
// components own rendering.
export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const user = await ensureAnonSession();
      setUserId(user.id);
      const [s, p] = await Promise.all([
        getSession(sessionId),
        getMyParticipant(sessionId, user.id),
      ]);
      setSession(s);
      setMe(p);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  return { session, setSession, me, userId, loading, error, reload: load };
}
