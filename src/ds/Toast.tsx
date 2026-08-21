// Grove — 8.16 Toast — the user's OWN action only, never an error, never
// another observer's activity. One at a time. GROVE-MASTER.md §8.16.
import { useEffect, useRef, useState, type ReactNode } from 'react';

const LEAVE_MS = 180; // --motion-slow: the 180ms opacity out. §6.5

export interface ToastProps {
  message: string | null;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  const [leaving, setLeaving] = useState(false);
  // onDone lives in a ref so a caller passing a fresh closure every render
  // does not restart the 4-second clock. The timer depends on message only.
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  useEffect(() => {
    if (!message) return undefined;
    setLeaving(false);
    let leave: ReturnType<typeof setTimeout> | null = null;
    const show = setTimeout(() => {
      // Reduced motion suppresses the fade-out too: gone at once. §6.5, §11.6
      const reduced = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) { done.current(); return; }
      setLeaving(true);
      leave = setTimeout(() => done.current(), LEAVE_MS);
    }, 4000);
    return () => { clearTimeout(show); if (leave) clearTimeout(leave); };
  }, [message]);

  if (!message) return null;
  return (
    <div className={`toast${leaving ? ' toast--leaving' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export interface ToastHandle {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
  node: ReactNode;
}

export function useToast(): ToastHandle {
  const [message, setMessage] = useState<string | null>(null);
  return {
    message,
    show: setMessage,
    clear: () => setMessage(null),
    node: <Toast message={message} onDone={() => setMessage(null)} />,
  };
}
