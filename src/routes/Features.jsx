import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav, { usePageMeta } from '../components/PublicNav';

const GROUPS = [
  {
    title: 'Write together',
    intro: 'Notes that feel alive, because your team is in them with you.',
    items: [
      ['Live co-writing', 'Shared notes update as teammates type. No refresh, no merge, no waiting.'],
      ['Named live cursors', 'See exactly where each person is writing, with their name at their cursor.'],
      ['Dictation everywhere', 'Talk instead of typing, in notes, comments and even Studio questions.'],
      ['Version history', 'Every edit is kept with who made it. Restore any version in one click.'],
      ['Comments on a line', 'Anchor a comment to the exact line it is about, not the whole page.'],
      ['@Mentions', 'Type @ and a name to pull a teammate in. They get a notification that opens the note.'],
    ],
  },
  {
    title: 'Turn notes into visuals',
    intro: 'The part nothing else does: your words, reshaped for how people actually absorb.',
    items: [
      ['Ask, with sources', 'Ask anything about your notes and get a direct answer with the source note attached.'],
      ['Summary', 'What happened, what was decided, and what is next, in seconds.'],
      ['Slide deck', 'A designed, narrated deck built straight from the notes. Present it or download it.'],
      ['Mind map', 'The themes across your notes, drawn as one picture.'],
      ['Infographic', 'A single shareable image of the whole meeting.'],
      ['Audio overview', 'A two host episode about your notes, saved to the space for everyone to play.'],
    ],
  },
  {
    title: 'Make work move',
    intro: 'Decisions leave the page and get done.',
    items: [
      ['A board in every shared space', 'To do, In progress, In review, Done. Drag cards, reassign in one click.'],
      ['Assign from a note', 'Turn a sentence into a task with an owner and a deadline, context attached.'],
      ['Friendly check-ins', 'A small nudge asks how the task is going, timed to the deadline, never a pile up.'],
      ['Roles that fit', 'Admins, editors and view only members, set per person in one dropdown.'],
      ['Note locks', 'Authors can switch any note to "only I can edit" while others still read it.'],
      ['Notifications that navigate', 'Every assignment, mention and comment links straight to the right place.'],
    ],
  },
  {
    title: 'Share without friction',
    intro: 'Getting a teammate in takes seconds, not a setup call.',
    items: [
      ['Six character codes', 'Say the code out loud and they are in. Nothing to install.'],
      ['Email invites', 'Send an invite with a join link and the code, from any Share button.'],
      ['Email a note', 'Pick specific notes and send their full text to anyone, no account needed.'],
      ['Sample spaces', 'Every new user lands with working examples, so the first minute already makes sense.'],
    ],
  },
];

// "Features": the complete list, one crisp line each.
export default function Features() {
  const nav = useNavigate();
  usePageMeta(
    'GroveStudio Features: live notes, AI slides, mind maps, audio and task check-ins',
    'Everything GroveStudio does: live collaborative notes with named cursors, version history and mentions, AI slide decks, mind maps, infographics and audio from your notes, plus boards, assignments and friendly check-ins.'
  );
  return (
    <div className="landing">
      <PublicNav />
      <main className="mkt">
        <section className="mkt-hero">
          <h1>Everything your notes<br /><span className="grad">can do here.</span></h1>
          <p className="lede">
            From the first typed word to the finished task, this is the full toolbox.
            Write it once, then let GroveStudio reshape it, share it, and chase it.
          </p>
        </section>
        {GROUPS.map((g) => (
          <section className="mkt-section" key={g.title}>
            <h2>{g.title}</h2>
            <p>{g.intro}</p>
            <div className="feat-grid">
              {g.items.map(([name, line]) => (
                <div className="feat-item" key={name}>
                  <b>{name}</b>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
        <section className="mkt-cta">
          <h2>See it with your own notes</h2>
          <p>The sample spaces show everything working the moment you sign in.</p>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/signin')}>Open GroveStudio</button>
        </section>
      </main>
    </div>
  );
}
