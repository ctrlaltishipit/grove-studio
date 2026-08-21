// Grove — 8.17 Empty state — one line. No illustration, no icon, no heading,
// no second paragraph, no tour. GROVE-MASTER.md §8.17.
import type { ReactNode } from 'react';

export interface EmptyProps {
  children: ReactNode;
  action?: ReactNode;
}

export function Empty({ children, action }: EmptyProps) {
  return (
    <div className="empty">
      <p className="t-body">{children}</p>
      {action}
    </div>
  );
}
