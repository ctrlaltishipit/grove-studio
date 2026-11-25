import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav, { SiteFooter, Arrow, useInView, usePageMeta } from '../components/PublicNav';
import { StepMark } from '../components/Tour';
import AppDemo from '../components/AppDemo';
import WaitlistBand from '../components/Waitlist';
import Film from '../components/Film';
import ScreenFlow from '../components/ScreenFlow';
import { MarginNote } from '../components/Origin';
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
              <h2 id="inside-h">The real screens, come alive</h2>
              <p className="lead">Watch the cursor move through the app, or click the highlighted button on any screen to go where it goes.</p>
            </div>
            <div className="rv"><ScreenFlow /></div>
            <div className="center-link rv"><Link to="/features" className="text-link">See every feature <Arrow /></Link></div>
          </div>
        </section>

        <WaitlistBand source="inside" />
      </main>
      <SiteFooter />
    </div>
  );
}
