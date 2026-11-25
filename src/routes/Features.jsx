import React from 'react';
import PublicNav, { CloseBand, SiteFooter, usePageMeta } from '../components/PublicNav';

// Small line icons, drawn on a 24 grid, coloured by currentColor.
const I = {
  pen: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  cursor: 'M5 3l14 7-6 2-2 6L5 3Z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  comment: 'M4 5h16v11H9l-5 4V5Z',
  at: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  list: 'M8 6h12M8 12h12M8 18h8M4 6h.01M4 12h.01M4 18h.01',
  slides: 'M3 4h18v12H3zM8 20h8M12 16v4',
  map: 'M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M5 5l5 5M19 5l-5 5M5 19l5-5M19 19l-5-5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  audio: 'M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2',
  board: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v7h-4z',
  task: 'M4 12l4 4L20 6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 11h9M18 11v3M21 11v2',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
};

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GROUPS = [
  {
    id: 'write', title: 'Write together',
    intro: 'Your team works in the same note at the same time.',
    items: [
      [I.pen, 'Live co-writing', 'Shared notes update as teammates type. No refresh, no copies to merge.'],
      [I.cursor, 'Named cursors', 'See where each person is writing, with their name at their cursor.'],
      [I.mic, 'Dictation', 'Talk instead of typing, in notes, comments and Studio questions.'],
      [I.clock, 'Version history', 'Every edit is saved with who made it. Restore any version in one click.'],
      [I.comment, 'Comments on a line', 'Pin a comment to the exact line it is about, not the whole page.'],
      [I.at, 'Mentions', 'Type @ and a name to bring a teammate in. They get a link straight to the note.'],
    ],
  },
  {
    id: 'studio', title: 'Turn notes into visuals',
    intro: 'The same notes, in the shape each person takes in best.',
    items: [
      [I.search, 'Ask, with sources', 'Ask anything about your notes. The answer shows which note it came from.'],
      [I.list, 'Summary', 'What happened, what was decided, and what comes next.'],
      [I.slides, 'Slide deck', 'A designed deck built from the notes. Present it or download it.'],
      [I.map, 'Mind map', 'The main themes across your notes, drawn as one picture.'],
      [I.chart, 'Infographic', 'One image of the whole meeting that is easy to share.'],
      [I.audio, 'Audio overview', 'A short two-voice episode about your notes, saved for the whole space.'],
    ],
  },
  {
    id: 'work', title: 'Make work move',
    intro: 'Decisions leave the page and get done.',
    items: [
      [I.board, 'A board in every shared space', 'To do, In progress, In review, Done. Drag cards and reassign in one click.'],
      [I.task, 'Assign from a note', 'Turn a sentence into a task with an owner and a date. The note stays linked.'],
      [I.spark, 'Check-ins', 'A short question before the deadline asks how the task is going.'],
      [I.users, 'Roles', 'Admins, editors and view-only members, set for each person.'],
      [I.lock, 'Note locks', 'Authors can make a note "only I can edit" while others still read it.'],
      [I.bell, 'Useful notifications', 'Every task, mention and comment links to the right place.'],
    ],
  },
  {
    id: 'share', title: 'Share in seconds',
    intro: 'Getting a teammate in takes a moment, not a setup call.',
    items: [
      [I.key, 'Six-character codes', 'Read the code out loud and they are in. Nothing to install.'],
      [I.mail, 'Email invites', 'Send an invite with a join link and the code from any Share button.'],
      [I.send, 'Email a note', 'Send the full text of any note to anyone. They do not need an account.'],
      [I.link, 'Sample spaces', 'New accounts start with working examples, so the first minute makes sense.'],
    ],
  },
];

export default function Features() {
  usePageMeta(
    'GroveStudio features: live notes, tasks, check-ins, slides, mind maps and audio',
    'Everything GroveStudio does: live shared notes with named cursors and version history, tasks and check-ins on a board, and slides, mind maps, infographics and audio made from your notes.'
  );
  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="page-hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap page-hero-inner">
            <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />Features</p>
            <h1 className="enter" style={{ '--d': 1 }}>Everything your notes <span className="ink-accent">can do here</span></h1>
            <p className="hero-sub enter" style={{ '--d': 2 }}>
              From the first word typed in a meeting to the finished task. Write it once, then let GroveStudio
              reshape it, share it, and follow it up.
            </p>
            <nav className="jump enter" style={{ '--d': 3 }} aria-label="Feature groups">
              {GROUPS.map((g) => <a key={g.id} href={`#${g.id}`}>{g.title}</a>)}
            </nav>
          </div>
        </section>

        {GROUPS.map((g, gi) => (
          <section key={g.id} id={g.id} className={'band' + (gi % 2 ? ' band-sunken' : '')} aria-labelledby={`${g.id}-h`}>
            <div className="wrap">
              <div className="sec-head">
                <p className="eyebrow">0{gi + 1}</p>
                <h2 id={`${g.id}-h`}>{g.title}</h2>
                <p className="lead">{g.intro}</p>
              </div>
              <ul className="feature-grid">
                {g.items.map(([d, name, line]) => (
                  <li key={name} className="feature">
                    <span className="feature-icon"><Icon d={d} /></span>
                    <h3>{name}</h3>
                    <p>{line}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <CloseBand title="See it with your own notes" line="Sample spaces show every feature working the moment you sign in." action="Open GroveStudio" />
      </main>
      <SiteFooter />
    </div>
  );
}
