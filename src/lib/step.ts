// Grove — the corroboration ladder step. GROVE-MASTER.md §5.3, §8.9, §8.10.

export type LadderStep = '1' | '2' | '3';

/** The ladder step is computed ONCE and passed down. This keeps the ladder to
 *  three steps by construction — there is no fourth step for 4+ observers. */
export function step(count: number): LadderStep {
  if (count >= 3) return '3';
  if (count >= 2) return '2';
  // A finding always has at least one observer, so a count below 1 cannot
  // occur; if it ever did it collapses to step 1, the ladder's resting state.
  return '1';
}
