import React, { useEffect, useState } from 'react';
import { I, Icon } from './Icons';

// The Features hero headline: "Your notes," and an ending that changes every
// few seconds, with a four-step trail underneath that lights up in step.

const WORDS = [
  ['written together.', 0],
  ['turned into slides.', 1],
  ['mapped as one picture.', 1],
  ['made into tasks.', 2],
  ['followed up for you.', 2],
  ['shared with a code.', 3],
];
const STEPS = [
  ['write', 'Write', I.pen],
  ['studio', 'Studio', I.spark],
  ['work', 'Board', I.board],
  ['share', 'Share', I.key],
];

export function useCycle(n, ms = 2600) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(id);
  }, [n, ms]);
  return i;
}

export function CycleHeadline() {
  const i = useCycle(WORDS.length);
  return (
    <>
    <h1 className="fh-title enter" style={{ '--d': 1 }}>
      <span className="fh-lead">Your notes,</span>
      <span className="fh-cycle">
        {WORDS.map(([w], k) => (
          <span key={w} className={'fh-word' + (k === i ? ' on' : '') + (k === (i - 1 + WORDS.length) % WORDS.length ? ' out' : '')} aria-hidden={k !== i}>{w}</span>
        ))}
        <span className="fh-sizer" aria-hidden="true">mapped as one picture.</span>
      </span>
    </h1>
    <div className="enter" style={{ '--d': 3 }}><Trail step={WORDS[i][1]} /></div>
    </>
  );
}

function Trail({ step }) {
  return (
    <nav className="fh-trail" aria-label="Feature groups">
      <span className="fh-rail" aria-hidden="true"><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></span>
      {STEPS.map(([id, label, d], k) => (
        <a key={id} href={`#${id}`} className={'fh-step' + (k === step ? ' on' : '') + (k < step ? ' past' : '')}>
          <span className="fh-dot"><Icon d={d} /></span>
          <span className="fh-lab">{label}</span>
        </a>
      ))}
    </nav>
  );
}
