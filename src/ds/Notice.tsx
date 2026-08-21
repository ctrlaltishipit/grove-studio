// Grove — inline error — adjacent to the thing that failed, and it PERSISTS.
// Never a toast, never a modal, never a distant banner. GROVE-MASTER.md §8.16, §7 S6.
import type { ReactNode } from 'react';

export interface NoticeProps {
  children: ReactNode;
  action?: ReactNode;
}

export function Notice({ children, action }: NoticeProps) {
  return (
    // Polite, not assertive: nothing in Grove interrupts a screen-reader user
    // mid-sentence. §11.5
    <div className="notice" role="status">
      <p className="t-body">{children}</p>
      {action && <div style={{ marginTop: 'var(--space-3)' }}>{action}</div>}
    </div>
  );
}
