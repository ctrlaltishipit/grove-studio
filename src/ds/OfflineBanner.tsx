// Grove — offline: a hairline banner. Never a modal, never blocking.
// GROVE-MASTER.md §8.17 E10.
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [off, setOff] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOff(false);
    const down = () => setOff(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', down); };
  }, []);
  if (!off) return null;
  return <div className="banner" role="status" aria-live="polite">Not connected. Your draft is saved on this device.</div>;
}
