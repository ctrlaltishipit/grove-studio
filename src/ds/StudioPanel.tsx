// Grove Studio — the Studio pane (A16).
//
// The reference tools show a grid of generators: six pastel tiles, all
// equally loud, all one click from a wall of generated text. Grove shows a
// list, because these are things you make one at a time and then read, and
// because a list can say what each one IS before you spend a minute on it.
//
// Everything here is honest about its state. A generator that is not built
// says so and is disabled; it does not open a dialog apologising. Nothing
// here claims to make a video, because nothing here can.
import type { ReactNode } from 'react';

export interface Artefact {
  id: string;
  name: string;
  /** What it is, in one line, before you spend a minute making it. */
  note: string;
  /** Index into the observer palette. Identity, never rank. */
  colour: number;
  ready: boolean;
  onOpen?: () => void;
}

export function StudioPanel({ artefacts, footer }: { artefacts: Artefact[]; footer?: ReactNode }) {
  return (
    <aside className="pane wsp__studio" aria-label="Studio">
      <div className="pane__head">
        <span className="pane__title">Studio</span>
      </div>
      {artefacts.map((a) => (
        <button
          key={a.id}
          type="button"
          className="artefact"
          disabled={!a.ready}
          onClick={a.onOpen}
          aria-label={a.ready ? a.name : `${a.name} — not available yet`}
        >
          <span className="artefact__mark" style={{ background: `var(--observer-${a.colour + 1})` }} aria-hidden="true" />
          <span className="artefact__body">
            <span className="artefact__name">{a.name}</span>
            <span className="artefact__note">{a.note}</span>
          </span>
        </button>
      ))}
      {footer}
    </aside>
  );
}
