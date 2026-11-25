import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav, { SiteFooter, Arrow, useInView, usePageMeta } from '../components/PublicNav';
import { StepMark } from '../components/Tour';
import AppDemo from '../components/AppDemo';
import WaitlistBand from '../components/Waitlist';
import { IsoHero, IsoArt, Globe, InsideStack } from '../components/Visuals';
import { TOUR } from '../lib/tourSteps';
import { MarginNote } from '../components/Origin';
import { FEATURES_FAQ } from '../lib/faq';

// One line per step for the guided strip.
const SHORT = [
  'Google or guest. Nothing to install.',
  'Private for you, shared for the team.',
  'Everyone types in one note, live.',
  'Summary, mind map, slides, audio.',
  'Owner and due date, from the note.',
  'To do, In progress, In review, Done.',
  'Your tasks and alerts in one place.',
  'On track, Blocked or Done.',
];

function StoryStrip() {
  const [ref, seen] = useInView({ threshold: 0.2 });
  return (
    <ol ref={ref} className={'strip' + (seen ? ' in-view' : '')}>
      <span className="strip-line" aria-hidden="true"><span /></span>
      {TOUR.map((s, i) => (
        <li key={s.title} className="strip-step" style={{ '--i': i }}>
          <Link to={`/tour#tour-${i + 1}`} className="strip-link">
            <span className="strip-mark"><StepMark kind={s.mark} /></span>
            <span className="strip-n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{SHORT[i]}</p>
          </Link>
        </li>
      ))}
    </ol>
  );
}

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
  { id: 'write', title: 'Write together', line: 'One note, the whole team, live.',
    items: [[I.pen, 'Live co-writing'], [I.cursor, 'Named cursors'], [I.mic, 'Dictation'], [I.clock, 'Version history'], [I.comment, 'Line comments'], [I.at, 'Mentions']] },
  { id: 'studio', title: 'See it your way', line: 'The same notes, in the shape you take in best.',
    items: [[I.search, 'Ask with sources'], [I.list, 'Summary'], [I.slides, 'Slide deck'], [I.map, 'Mind map'], [I.chart, 'Infographic'], [I.audio, 'Audio overview']] },
  { id: 'work', title: 'Make work move', line: 'Decisions leave the page and get done.',
    items: [[I.board, 'Kanban board'], [I.task, 'Tasks from notes'], [I.spark, 'Check-ins'], [I.bell, 'Notifications'], [I.users, 'Roles'], [I.lock, 'Note locks']] },
  { id: 'share', title: 'Share in seconds', line: 'A code or an email, and they are in.',
    items: [[I.key, 'Six-character codes'], [I.mail, 'Email invites'], [I.send, 'Email a note'], [I.link, 'Sample space']] },
];

const T = '/tour/';
const INSIDE = [
  { label: 'Notes', icon: I.pen, line: 'Write together, live, with every change saved.', media: { src: T + 'note.webp', alt: 'A shared note with its summary, text and comments' }, url: 'grovestudio.io/app/space' },
  { label: 'Board', icon: I.board, line: 'Every task, its owner and its date.', media: { src: T + 'board.webp', alt: 'The Kanban board with four columns of tasks' }, url: 'grovestudio.io/app/space/board' },
  { label: 'Studio', icon: I.spark, line: 'Turn notes into what you need.', media: { video: T + 'clip-studio.mp4', poster: T + 'clip-studio-poster.webp', alt: 'The Studio making a summary, mind map and slides' }, url: 'grovestudio.io/app/space' },
  { label: 'Mind map', icon: I.map, line: 'The meeting as one picture.', media: { src: T + 'mindmap.webp', alt: 'A mind map made by the Studio' } },
  { label: 'Slides', icon: I.slides, line: 'A deck to present or download.', media: { src: T + 'deck.webp', alt: 'A slide deck made by the Studio' } },
  { label: 'Dashboard', icon: I.bell, line: 'Your work across every project.', media: { src: T + 'dashboard.webp', alt: 'The personal dashboard with tasks and a notification' }, url: 'grovestudio.io/app' },
  { label: 'Comments', icon: I.comment, line: 'Talk about any note, right on it.', media: { src: T + 'comments.webp', alt: 'Comments on a note with a reply box' } },
];

const ANYWHERE = [
  [I.cursor, 'Same note, live', 'Cursors with names, wherever people sit.'],
  [I.bell, 'Nobody misses a thing', 'Tasks, mentions and comments find the right person.'],
  [I.spark, 'Follow-up built in', 'Check-ins ask before a deadline slips.'],
];

export default function Features() {
  usePageMeta(
    'GroveStudio features: live notes, AI Studio, Kanban board, dashboard and check-ins',
    'Try GroveStudio before you sign in: a working preview of live notes, the AI Studio, the Kanban board and your dashboard. See what is inside, how teams work across countries, and join early access.'
  );
  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="hero f-hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />Inside the app</p>
              <h1 className="enter" style={{ '--d': 1 }}>Notes, Studio and board. <span className="ink-accent shimmer">One place.</span></h1>
              <p className="hero-sub enter" style={{ '--d': 2 }}>Write it together. See it your way. Get it done.</p>
              <div className="hero-actions enter" style={{ '--d': 3 }}>
                <a className="s-btn s-btn-primary s-btn-lg" href="#preview">Try the preview <Arrow /></a>
                <a className="s-btn s-btn-quiet s-btn-lg" href="#early-access">Get early access</a>
              </div>
            </div>
            <div className="hero-visual enter" style={{ '--d': 2 }}><IsoHero /></div>
          </div>
        </section>

        <section className="band band-sunken" id="preview" aria-labelledby="preview-h">
          <div className="wrap has-note">
            <MarginNote id="preview" side="right" tilt={2} />
            <div className="sec-head center rv">
              <p className="eyebrow">Try it before you sign in</p>
              <h2 id="preview-h">A working preview of the app</h2>
              <p className="lead">Watch it play, or click in and use it.</p>
            </div>
            <div className="rv"><AppDemo /></div>
          </div>
        </section>

        <section className="band" aria-labelledby="story-h">
          <div className="wrap">
            <div className="sec-head rv">
              <p className="eyebrow">Your first ten minutes</p>
              <h2 id="story-h">From sign&#8209;in to follow&#8209;up</h2>
            </div>
            <StoryStrip />
            <div className="center-link rv"><Link to="/tour" className="text-link">Watch every step in the real app <Arrow /></Link></div>
          </div>
        </section>

        <section className="band band-sunken" aria-labelledby="inside-h">
          <div className="wrap">
            <div className="sec-head center rv">
              <p className="eyebrow">What’s inside GroveStudio</p>
              <h2 id="inside-h">The real screens</h2>
            </div>
            <div className="rv"><InsideStack items={INSIDE} /></div>
          </div>
        </section>

        <section className="band band-deep globe-band" aria-labelledby="world-h">
          <div className="wrap globe-grid">
            <div className="split-head rv">
              <p className="eyebrow">Work from anywhere</p>
              <h2 id="world-h">Your team, in every time zone. One note.</h2>
              <ul className="anywhere">
                {ANYWHERE.map(([d, t, l], i) => (
                  <li key={t} className="rv" style={{ '--rv': i + 1 }}>
                    <span className="anywhere-ic"><Icon d={d} /></span>
                    <span><b>{t}</b>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rv" style={{ '--rv': 1 }}><Globe /></div>
          </div>
        </section>

        <section className="band" aria-labelledby="groups-h">
          <div className="wrap has-note">
            <MarginNote id="features" side="left" tilt={-2} />
            <div className="sec-head center rv">
              <p className="eyebrow">Check out the app</p>
              <h2 id="groups-h">Four things, done well</h2>
            </div>
            <ul className="fgroups">
              {GROUPS.map((g, gi) => (
                <li key={g.id} id={g.id} className="fgroup rv" style={{ '--rv': gi }}>
                  <div className="fgroup-art"><IsoArt kind={g.id} /></div>
                  <h3>{g.title}</h3>
                  <p>{g.line}</p>
                  <ul className="fchips">
                    {g.items.map(([d, n]) => <li key={n}><Icon d={d} />{n}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="band band-sunken" aria-labelledby="faq-h">
          <div className="wrap split">
            <div className="split-head rv">
              <p className="eyebrow">Questions</p>
              <h2 id="faq-h">Frequently asked</h2>
              <p className="lead">Something else on your mind? Join the list below and reply to our first email.</p>
            </div>
            <div className="faq-list rv">
              {FEATURES_FAQ.map(([q, a], i) => (
                <details key={q} className="faq-item" open={i === 0}>
                  <summary>{q}<span className="faq-plus" aria-hidden="true" /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <WaitlistBand source="features" />
      </main>
      <SiteFooter />
    </div>
  );
}
