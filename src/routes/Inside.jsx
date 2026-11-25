import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav, { SiteFooter, Arrow, useInView, usePageMeta } from '../components/PublicNav';
import { StepMark } from '../components/Tour';
import AppDemo from '../components/AppDemo';
import WaitlistBand from '../components/Waitlist';
import Film from '../components/Film';
import { InsideStack } from '../components/Visuals';
import { MarginNote } from '../components/Origin';
import { I } from '../components/Icons';
import { TOUR } from '../lib/tourSteps';
import { FILM } from '../lib/film';

// "Inside the app": the film, a working preview, the guided steps and the
// real screens, for anyone who has not signed in yet.

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

const L = '/tour/live/';
const T = '/tour/';
const INSIDE = [
  { label: 'Home', icon: I.bell, line: 'Your tasks, your spaces and new assignments in one place.', media: { src: L + 'home.webp', alt: 'The Home dashboard with an assignment from Priya and the tasks assigned to you' }, url: 'grovestudio.io/app' },
  { label: 'Join', icon: I.key, line: 'Type a six-character code and you are in.', media: { src: L + 'join.webp', alt: 'Joining a shared space with a six-character code' }, url: 'grovestudio.io/app' },
  { label: 'Summary', icon: I.list, line: 'What was decided and what comes next.', media: { src: L + 'summary.webp', alt: 'A note with the Studio summary, decisions and next steps' }, url: 'grovestudio.io/app/space' },
  { label: 'Slides', icon: I.slides, line: 'A deck made from the notes, ready to present.', media: { src: L + 'slides.webp', alt: 'A note with a Studio slide deck ready to play or download' }, url: 'grovestudio.io/app/space' },
  { label: 'Audio', icon: I.audio, line: 'A two-host audio overview of your notes.', media: { src: L + 'audio.webp', alt: 'A note with the Studio audio overview player' }, url: 'grovestudio.io/app/space' },
  { label: 'Board', icon: I.board, line: 'Every task, its owner and its date.', media: { src: L + 'board.webp', alt: 'The Kanban board with To do, In progress, In review and Done' }, url: 'grovestudio.io/app/space/board' },
  { label: 'Mind map', icon: I.map, line: 'The meeting as one picture.', media: { src: T + 'mindmap.webp', alt: 'A mind map made by the Studio' } },
];

export default function Inside() {
  usePageMeta(
    'Inside GroveStudio: try the app before you sign in',
    'Look inside GroveStudio: a working preview of the app, the real screens, and a guided walk from sign-in to notes, the Studio, the Kanban board, notifications and check-ins.'
  );
  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="page-hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap page-hero-inner">
            <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />Inside the app</p>
            <h1 className="enter" style={{ '--d': 1 }}>Check out the app, <span className="ink-accent shimmer">before you sign in</span></h1>
            <p className="hero-sub enter" style={{ '--d': 2 }}>Watch it, click through it, and see the real screens. Everything on this page is GroveStudio as it works today.</p>
            <nav className="jump enter" style={{ '--d': 3 }} aria-label="On this page">
              {FILM && <a href="#film">Watch the film</a>}
              <a href="#preview">Try the preview</a>
              <a href="#steps">Your first ten minutes</a>
              <a href="#screens">The real screens</a>
            </nav>
          </div>
        </section>

        {FILM && (
          <section className="band" id="film" aria-labelledby="film-h">
            <div className="wrap">
              <div className="sec-head center rv">
                <p className="eyebrow">Watch</p>
                <h2 id="film-h">GroveStudio in {FILM.minutes}</h2>
                <p className="lead">{FILM.line}</p>
              </div>
              <div className="rv"><Film src={FILM.src} poster={FILM.poster} chapters={FILM.chapters} title={FILM.title} /></div>
            </div>
          </section>
        )}

        <section className="band band-sunken" id="preview" aria-labelledby="preview-h">
          <div className="wrap has-note">
            <MarginNote id="preview" side="right" tilt={2} />
            <div className="sec-head center rv">
              <p className="eyebrow">Try it</p>
              <h2 id="preview-h">A working preview of the app</h2>
              <p className="lead">Watch it play, or click in and use it.</p>
            </div>
            <div className="rv"><AppDemo /></div>
          </div>
        </section>

        <section className="band" id="steps" aria-labelledby="story-h">
          <div className="wrap">
            <div className="sec-head rv">
              <p className="eyebrow">Your first ten minutes</p>
              <h2 id="story-h">From sign&#8209;in to follow&#8209;up</h2>
            </div>
            <StoryStrip />
            <div className="center-link rv"><Link to="/tour" className="text-link">Walk through every step in the real app <Arrow /></Link></div>
          </div>
        </section>

        <section className="band band-sunken" id="screens" aria-labelledby="inside-h">
          <div className="wrap">
            <div className="sec-head center rv">
              <p className="eyebrow">What’s inside GroveStudio</p>
              <h2 id="inside-h">The real screens</h2>
            </div>
            <div className="rv"><InsideStack items={INSIDE} /></div>
            <div className="center-link rv"><Link to="/features" className="text-link">See every feature <Arrow /></Link></div>
          </div>
        </section>

        <WaitlistBand source="inside" />
      </main>
      <SiteFooter />
    </div>
  );
}
