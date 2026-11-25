import React from 'react';
import PublicNav, { CloseBand, SiteFooter, usePageMeta } from '../components/PublicNav';
import { VisualsFromNotes, DecisionFlow, LiveWriting, PrivacyRoles } from '../components/StoryVisuals';

// "Why GroveStudio": the story page. Plain words, short paragraphs, real
// answers. No dashes, no jargon.

const STORY = [
  {
    eyebrow: 'Write',
    title: 'Everyone writes in the same note',
    body: 'A shared note works like a doc that several people hold at once. You see each teammate typing, with their name at their cursor. Mention anyone with @, comment on a single line, or talk instead of typing. Every change is saved, and you can go back to any version in one click.',
    visual: <LiveWriting />,
  },
  {
    eyebrow: 'Assign',
    title: 'Decisions become tasks with owners',
    body: 'Pick a sentence and turn it into a task in two clicks. It gets an owner, a date, and a card on the board. The card links back to the note, so the owner always knows why the task exists.',
    visual: <DecisionFlow />,
  },
  {
    eyebrow: 'Understand',
    title: 'Notes you can read, see or hear',
    body: 'Long notes are hard to take in. GroveStudio turns them into a slide deck, a mind map, an infographic, or a short audio episode you can play on the way home. Write once, then take it in whichever way suits you.',
    visual: <VisualsFromNotes />,
  },
  {
    eyebrow: 'Protect',
    title: 'Private when it matters',
    body: 'Private spaces are only yours. In shared spaces, admins decide who edits and who only views, and any author can lock a note. Sharing a space never shows your private notes.',
    visual: <PrivacyRoles />,
  },
];

const REASONS = [
  ['One place for the whole job', 'Docs hold words. Boards hold tasks. GroveStudio holds both, and links them.'],
  ['Answers you can check', 'Ask a question and the Studio answers only from your notes, with the source note attached.'],
  ['Easy to join', 'A six-character code or an email invite gets a teammate in from any browser.'],
  ['Follow-up is built in', 'Owners get a short check-in before each deadline, so work does not stall in silence.'],
];

const FAQ = [
  ['What is GroveStudio?', 'GroveStudio is a note-taking app for teams. You write notes together live, turn decisions into tasks with owners and dates, and GroveStudio checks in on those tasks until they are done. It can also turn your notes into slides, mind maps, infographics and audio.'],
  ['How is it different from a normal doc?', 'A doc stops at text. GroveStudio turns the same text into visuals and audio, answers questions from it with sources, and turns decisions into tasks on a board.'],
  ['Can I keep some notes private?', 'Yes. Private spaces are visible only to you. Inside shared spaces, you can lock any note you wrote so only you can edit it.'],
  ['What can the Studio make from my notes?', 'A written summary, a mind map, a slide deck, an infographic, a two-voice audio overview, and direct answers to your questions. All of it comes only from what your notes say.'],
  ['Does my team need to install anything?', 'No. GroveStudio runs in the browser on a laptop or a phone. Share a six-character code and your teammates are in.'],
];

export default function Why() {
  usePageMeta(
    'Why GroveStudio? Meeting notes that turn into tasks, slides and audio',
    'GroveStudio is a note-taking app for teams. Write notes together, turn decisions into tasks with owners and dates, and turn notes into slides, mind maps, infographics and audio.'
  );
  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="page-hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap page-hero-inner">
            <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />Why GroveStudio</p>
            <h1 className="enter" style={{ '--d': 1 }}>Most meeting notes are never read again. <span className="ink-accent">Yours will be.</span></h1>
            <p className="hero-sub enter" style={{ '--d': 2 }}>
              Every team writes notes. Few teams use them. The ideas sit in a doc, the decisions fade, and by Friday
              nobody remembers who said they would do what. We built GroveStudio to fix that.
            </p>
          </div>
        </section>

        {STORY.map((s, i) => (
          <section key={s.title} className={'band' + (i % 2 ? ' band-sunken' : '')} aria-labelledby={`story-${i}`}>
            <div className={'wrap split split-visual' + (i % 2 ? ' rev' : '')}>
              {i % 2 ? <div className="visual-card">{s.visual}</div> : null}
              <div className="split-head">
                <p className="eyebrow">{s.eyebrow}</p>
                <h2 id={`story-${i}`}>{s.title}</h2>
                <p className="lead">{s.body}</p>
              </div>
              {i % 2 ? null : <div className="visual-card">{s.visual}</div>}
            </div>
          </section>
        ))}

        <section className="band" aria-labelledby="reasons-h">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">In short</p>
              <h2 id="reasons-h">Why teams pick GroveStudio</h2>
            </div>
            <ul className="reason-grid">
              {REASONS.map(([t, d]) => (
                <li key={t} className="reason"><h3>{t}</h3><p>{d}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="band band-sunken" aria-labelledby="faq-h">
          <div className="wrap split">
            <div className="split-head">
              <p className="eyebrow">Questions</p>
              <h2 id="faq-h">Questions people ask</h2>
              <p className="lead">Short answers to what people ask before they start a space.</p>
            </div>
            <div className="faq-list">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="faq-item" open={i === 0}>
                  <summary>{q}<span className="faq-plus" aria-hidden="true" /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <CloseBand title="Give your notes a second life" line="Start a space, write a note, and turn it into a plan your team can follow." />
      </main>
      <SiteFooter />
    </div>
  );
}
