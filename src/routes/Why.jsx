import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav, { usePageMeta } from '../components/PublicNav';
import { VisualsFromNotes, DecisionFlow, LiveWriting, PrivacyRoles } from '../components/StoryVisuals';

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
          <h1>Most meeting notes are never read again. <span className="grad">Yours are about to be.</span></h1>
          <p className="lede">
            Every team writes notes. Very few teams use them. The ideas sit in a doc, the decisions fade,
            and by Friday nobody remembers who owned what. GroveStudio was built to end that quiet loss.
          </p>
        </section>

        <section className="mkt-section mkt-duo">
          <div>
            <h2>Reading is slow. Seeing is fast.</h2>
            <p>
              In GroveStudio your notes do not stay as walls of text. One click turns them into a slide deck,
              a mind map, an infographic, or a two host audio episode for the commute.
              Write once, understand it any way you like.
            </p>
          </div>
          <VisualsFromNotes />
        </section>

        <section className="mkt-section mkt-duo rev">
          <DecisionFlow />
          <div>
            <h2>Decisions grow legs</h2>
            <p>
              A sentence in a note becomes a task in two clicks: an owner, a deadline, a card on the board.
              Then GroveStudio does the part every team forgets. It checks in, with one quiet question
              at the right time, until the work is done.
            </p>
          </div>
        </section>

        <section className="mkt-section mkt-duo">
          <div>
            <h2>Written together, live</h2>
            <p>
              A shared note is a doc several people hold at once. You see teammates typing with their name
              at their cursor, mention anyone with @, comment on a single line, or dictate instead of typing.
              Every change is kept, with a one click restore.
            </p>
          </div>
          <LiveWriting />
        </section>

        <section className="mkt-section mkt-duo rev">
          <PrivacyRoles />
          <div>
            <h2>Private when it matters</h2>
            <p>
              Private spaces are only yours. In shared spaces, admins choose who edits and who only views,
              and any author can lock a note. Sharing a space never exposes your private notes.
            </p>
          </div>
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
