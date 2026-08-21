// Grove — 8.9 Corroboration badge, the hero component. GROVE-MASTER.md §8.9.
import { step } from '../lib/step';

export interface BadgeProps {
  count: number;
  total: number;
}

/* ---------- 8.9 Corroboration badge — the hero component.
   Words and a number are the whole component. No icon, no dot, no tick, no
   arc, no percentage, no "3/3" abbreviation on the card. ---------- */
export function Badge({ count, total }: BadgeProps) {
  return (
    <span className="badge" data-corrob={step(count)}>
      {count} of {total} observer{total === 1 ? '' : 's'}
    </span>
  );
}
