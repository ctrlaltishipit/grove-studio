import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav, { SiteFooter, Arrow, usePageMeta } from '../components/PublicNav';
import WaitlistBand from '../components/Waitlist';
import { StoryScroll, AppFrame } from '../components/Tour';
import { TOUR, STUDIO_GALLERY } from '../lib/tourSteps';

// "What's inside GroveStudio": the full walkthrough, from sign-in to
// follow-up, told with real captures of the app.
export default function Tour() {
  usePageMeta(
    'What’s inside GroveStudio: a step-by-step tour of the app',
    'See how GroveStudio works, step by step: sign in, create a space, write notes together, turn them into summaries and slides, assign tasks, track them on a Kanban board and follow up from your dashboard.'
  );
  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="page-hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap page-hero-inner">
            <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />What’s inside GroveStudio</p>
            <h1 className="enter" style={{ '--d': 1 }}>A tour of the app, <span className="ink-accent shimmer">one step at a time</span></h1>
            <p className="hero-sub enter" style={{ '--d': 2 }}>
              Eight steps, from opening GroveStudio for the first time to closing out the work your meeting created.
              Every screen below is the real app.
            </p>
            <nav className="jump enter" style={{ '--d': 3 }} aria-label="Tour steps">
              {TOUR.map((s, i) => <a key={s.title} href={`#tour-${i + 1}`}>{i + 1}. {s.title}</a>)}
            </nav>
          </div>
        </section>

        <section className="band band-sunken" aria-label="Walkthrough">
          <div className="wrap">
            <StoryScroll steps={TOUR} idPrefix="tour" />
          </div>
        </section>

        <section className="band" aria-labelledby="gallery-h">
          <div className="wrap">
            <div className="sec-head rv">
              <p className="eyebrow">Made by the Studio</p>
              <h2 id="gallery-h">The same notes, in the shape you need</h2>
              <p className="lead">These came from the three notes in the sample space. Open the sample after you sign in and make them yourself.</p>
            </div>
            <ul className="gallery">
              {STUDIO_GALLERY.map((g, i) => (
                <li key={g.label} className="gallery-item rv" style={{ '--rv': i }}>
                  <AppFrame media={g} label={g.label} />
                </li>
              ))}
            </ul>
            <div className="center-link rv"><Link to="/features" className="text-link">Look inside the app <Arrow /></Link></div>
          </div>
        </section>

        <WaitlistBand source="tour" />
      </main>
      <SiteFooter />
    </div>
  );
}
