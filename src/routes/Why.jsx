import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav, { usePageMeta } from '../components/PublicNav';

// "Why GroveStudio": the story page. Plain words, short paragraphs, real
// answers. No dashes, no jargon.
export default function Why() {
  const nav = useNavigate();
  usePageMeta(
    'Why GroveStudio? Meeting notes that turn into slides, audio and finished tasks',
    'GroveStudio is a collaborative note taking app that turns meeting notes into slide decks, mind maps, infographics and audio overviews, then assigns the follow ups and checks in until they are done.'
  );
  return (
    <div className="landing">
      <PublicNav />
      <main className="mkt">
        <section className="mkt-hero">
          <h1>Most meeting notes are never read again.<br /><span className="grad">Yours are about to be.</span></h1>
          <p className="lede">
            Every team writes notes. Very few teams use them. The ideas sit in a doc, the decisions fade,
            and by Friday nobody remembers who owned what. GroveStudio was built to end that quiet loss.
          </p>
        </section>

        <section className="mkt-section">
          <h2>Reading is slow. Seeing is fast.</h2>
          <p>
            Here is the difference. In GroveStudio, your notes do not stay as walls of text.
            One click turns them into a slide deck, a mind map, an infographic, or a two host audio
            episode you can play on your commute. The same words, in the shape your brain actually wants.
          </p>
          <p>
            That is our promise: write once, understand it any way you like. A new teammate can listen to
            the project instead of scrolling through it. A stakeholder can see the mind map instead of a memo.
          </p>
        </section>

        <section className="mkt-section">
          <h2>Decisions grow legs</h2>
          <p>
            A decision written in a note can become a task in two clicks: assigned to a teammate,
            with a deadline, on a board everyone can see. The person is notified with the note attached,
            so the context travels with the work.
          </p>
          <p>
            Then GroveStudio does the part every team forgets. It checks in. A small, friendly nudge asks
            how the task is going, a few hours in and then every few hours until the deadline.
            Not a wall of reminders. One quiet question at the right time.
          </p>
        </section>

        <section className="mkt-section">
          <h2>Written together, live</h2>
          <p>
            Shared spaces work like a doc that several people hold at once. You see teammates typing,
            with their name at their cursor. You can mention someone with @ to pull them in, comment on
            a single line, or dictate instead of typing. Every change is kept in the note's history,
            so you always know who wrote what, and you can restore any version.
          </p>
        </section>

        <section className="mkt-section">
          <h2>Private when it matters</h2>
          <p>
            Not everything is for everyone. Private spaces are only yours. In shared spaces, admins choose
            who can edit and who can only view, and any author can lock a note so only they can change it.
            Sharing a space never exposes your private notes.
          </p>
        </section>

        <section className="mkt-section">
          <h2>Why teams pick GroveStudio</h2>
          <ul className="mkt-list">
            <li><b>One home for the whole loop.</b> Docs hold words. Boards hold tasks. GroveStudio holds both, and draws the picture too.</li>
            <li><b>Answers with receipts.</b> Ask a question and the Studio answers only from your notes, with the source note attached.</li>
            <li><b>Nothing to install.</b> A six character code or an email invite gets a teammate in from any browser.</li>
            <li><b>Follow up built in.</b> Assigned work gets gentle check ins until it is done, so deadlines never go quiet.</li>
          </ul>
        </section>

        <section className="mkt-section">
          <h2>Questions people ask</h2>
          <div className="faq">
            <h3>What is GroveStudio?</h3>
            <p>GroveStudio is a collaborative note taking app where teams write notes together live, turn those notes into slides, mind maps, infographics and audio, and assign the follow ups with deadlines and check ins.</p>
            <h3>How is it different from a normal doc?</h3>
            <p>A doc stops at text. GroveStudio turns the same text into visuals and audio, answers questions from it with sources, and converts decisions into tracked tasks on a board.</p>
            <h3>Can I keep some notes private?</h3>
            <p>Yes. Private spaces are visible only to you, and inside shared spaces you can lock any note you wrote so only you can edit it.</p>
            <h3>What can the Studio make from my notes?</h3>
            <p>A written summary, a mind map, a designed slide deck, an infographic, a two host audio overview, and direct answers to questions, all grounded only in what your notes say.</p>
          </div>
        </section>

        <section className="mkt-cta">
          <h2>Give your notes a second life</h2>
          <p>Start a space, write a note, and watch it become a deck.</p>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/signin')}>Start a space</button>
        </section>
      </main>
    </div>
  );
}
