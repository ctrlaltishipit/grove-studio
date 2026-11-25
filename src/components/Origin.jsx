import React from 'react';
import { PROBLEM, VISION, MISSION, HOW, NOTES, FOUNDER } from '../lib/origin';
import { Logo } from './ui';

// A founder's margin note: a small comment card that sits in the empty space
// beside a section heading on wide screens, and inline under it on phones.
export function MarginNote({ id, side = 'right', tilt = 0 }) {
  const n = NOTES[id];
  if (!n) return null;
  return (
    <aside className={'mnote rv mnote-' + side} style={{ '--tilt': tilt + 'deg' }} aria-label="A note from the founder">
      <span className="mnote-pin" aria-hidden="true" />
      <span className="mnote-head"><span className="mnote-av" aria-hidden="true">D</span><b>{n[0]}</b></span>
      <p><em>{n[1]}</em></p>
      <small>{FOUNDER}</small>
    </aside>
  );
}

// "Why we built it": the problem, the vision, the mission and how it came
// together so fast, told as a page with comments in its margins.
export function OriginStory({ id = 'why-built' }) {
  return (
    <section className="band origin" id={id} aria-labelledby={`${id}-h`}>
      <div className="origin-paper" aria-hidden="true" />
      <div className="wrap">
        <div className="origin-top">
          <div className="sec-head rv">
            <p className="eyebrow">Why we built it</p>
            <h2 id={`${id}-h`}>A quiet loss, <em className="origin-em">every single week</em></h2>
          </div>
          <figure className="origin-quote rv" style={{ '--rv': 1 }}>
            <span className="origin-mark" aria-hidden="true">“</span>
            <blockquote><p>{PROBLEM.quote}</p></blockquote>
            <figcaption>{PROBLEM.body}</figcaption>
          </figure>
        </div>

        <div className="origin-vm">
          <article className="vm-card vm-vision rv">
            <span className="vm-k">Vision</span>
            <p className="vm-big"><em>{VISION}</em></p>
            <p className="vm-note"><em>Every feature answers one question: does this help the plan get followed?</em></p>
            <span className="vm-comment" aria-hidden="true"><Logo size={16} /> the north star</span>
          </article>
          <article className="vm-card vm-mission rv" style={{ '--rv': 1 }}>
            <span className="vm-k">Mission</span>
            <p>{MISSION}</p>
            <ul className="vm-tags">
              <li>One live note</li><li>An owner for every decision</li><li>Your format</li><li>A gentle check-in</li>
            </ul>
          </article>
        </div>

        <div className="origin-how">
          <div className="origin-how-head rv">
            <h3>How it came together so fast</h3>
            <p><em>Short version: one sentence, one weekend, then doing it properly.</em></p>
          </div>
          <ol className="how-line">
            {HOW.map((h, i) => (
              <li key={h.when} className="how-step rv" style={{ '--rv': i }}>
                <span className="how-dot" aria-hidden="true" />
                <span className="how-when">{h.when}</span>
                <h4>{h.title}</h4>
                <p>{h.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
