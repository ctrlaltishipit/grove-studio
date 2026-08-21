// Grove — 8.16 Toast — the user's OWN action only, never an error, never
// another observer's activity. One at a time. GROVE-MASTER.md §8.16.
import { useEffect, useState, type ReactNode } from 'react';

export interface ToastProps {
  message: string | null;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return <div className="toast" role="status" aria-live="polite">{message}</div>;
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
