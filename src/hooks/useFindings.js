import { useCallback, useEffect, useState } from 'react';
import { listFindings, synthesise } from '../lib/data';

export function useFindings(sessionId) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try { setFindings(await listFindings(sessionId)); }
    catch { setFindings([]); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await synthesise(sessionId);
      setFindings(res.findings ?? []);
      return res;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setRunning(false);
    }
  }, [sessionId]);

  return { findings, loading, running, error, setError, run, reload: load };
}
