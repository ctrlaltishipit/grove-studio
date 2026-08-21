// Grove — research question band. Identical component in Capture and
// Synthesis — repeating it exactly tells the reader this is the same
// session, not a report about it. GROVE-MASTER.md §7 S6.
import { Placeholder } from './Placeholder';

export interface QuestionBandProps {
  question?: string | null;
  loading?: boolean;
}

export function QuestionBand({ question, loading }: QuestionBandProps) {
  return (
    <section className="question" aria-label="Research question">
      <div className="t-tracked question__label">Research question</div>
      {loading
        ? <Placeholder />
        : <h2 className="question__text">{question}</h2>}
    </section>
  );
}
