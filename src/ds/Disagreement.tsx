// Grove — 8.11 Disagreement banner. GROVE-MASTER.md §8.11.

export interface DisagreementProps {
  note: string;
}

/* ---------- 8.11 Disagreement banner. Amber, NEVER red. No warning
   iconography. No resolve, dismiss or "mark as settled" control. ---------- */
export function Disagreement({ note }: DisagreementProps) {
  return (
    <div className="disagree">
      <div className="t-tracked disagree__label">Observers disagree</div>
      <p className="t-body disagree__body">{note}</p>
    </div>
  );
}
