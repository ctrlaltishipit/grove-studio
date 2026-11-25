import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/Store';
import PublicNav, { CloseBand, SiteFooter, Arrow, usePageMeta } from '../components/PublicNav';
import HeroMock from '../components/HeroMock';
import { StoryScroll, Bento, BentoArt, Marquee } from '../components/Tour';
import { WORKFLOW } from '../lib/tourSteps';
import { savePendingJoin } from '../lib/local';
import { HOME_FAQ as FAQ } from '../lib/faq';

const PROBLEMS = [
  ['The notes go nowhere', 'Someone writes them up. They land in a doc, and nobody opens that doc again.'],
  ['Nobody owns the next step', 'Everyone heard the decision. Everyone assumes someone else is on it.'],
  ['Deadlines pass quietly', 'No one asks how it is going until the day it was due.'],
];

const BENTO = [
  { size: 'wide', art: BentoArt.cowrite, title: 'Live co-writing', body: 'The whole team types in one note. Names at every cursor, nothing written twice.' },
  { art: BentoArt.formats, title: 'The Studio', body: 'Summary, mind map, slides, infographic, audio. Pick the format that makes it click.' },
  { art: BentoArt.board, title: 'Kanban board', body: 'To do, In progress, In review, Done. Assign, move and review cards.' },
  { size: 'wide', art: BentoArt.dashboard, title: 'Your own dashboard', body: 'Everything assigned to you across every project, with notifications for anything new.' },
  { art: BentoArt.checkin, title: 'Check-ins', body: 'Owners reply On track, Blocked or Done. Blocked reaches the assigner straight away.' },
  { art: BentoArt.comments, title: 'Comments and mentions', body: 'Comment on any note you can see. Type @ to bring someone in.' },
  { size: 'wide', art: BentoArt.roles, title: 'Roles and private spaces', body: 'Admins, editors and viewers per person. Private spaces stay yours.' },
  { size: 'wide', art: BentoArt.history, title: 'Version history', body: 'Every edit is kept with who made it. Restore any version in one click.' },
];

const TEAM_POINTS = [
  ['Access you control', 'Set each person as admin, editor or viewer. Lock a note so only its author can change it.'],
  ['Private by default', 'Private spaces are visible only to their owner. Sharing a space never shows private notes.'],
  ['A record of every change', 'Version history shows who changed what. Nothing is lost when you restore.'],
  ['Answers you can check', 'Studio answers come only from your notes, with the source note attached.'],
];


export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  usePageMeta(
    'GroveStudio: team meeting notes, tasks and follow-ups in one place',
    'GroveStudio is a collaborative workspace for teams. Write meeting notes together, turn them into summaries, slides and audio, assign tasks on a Kanban board, and track everything from one dashboard.'
  );
  const enter = () => nav(user ? '/app' : '/signin');

  // "Join with a code" asks for the code right here. It rides along through
  // sign-in (query for the guest path, localStorage for the Google round-trip)
  // and Home opens the join for it on arrival, straight into the space.
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const validCode = /^[A-Z0-9]{6}$/.test(code);
  const joinWithCode = () => {
    if (!validCode) return;
    savePendingJoin(code);
    nav(user ? `/app?join=${code}` : `/signin?join=${code}`);
  };

  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        {/* Hero: what it is, who it is for, the one action, the product itself. */}
        <section className="hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />For teams that work together every day</p>
              <h1 className="enter" style={{ '--d': 1 }}>Meeting notes that turn into <span className="ink-accent shimmer">finished work.</span></h1>
              <p className="hero-sub enter" style={{ '--d': 2 }}>
                Write notes together in real time. When text is not enough, turn them into a summary, slides or audio.
                Assign the tasks, track them on a board, and follow up from one dashboard.
              </p>
              <div className="enter" style={{ '--d': 3 }}>
                {!joining ? (
                  <div className="hero-actions">
                    <button className="s-btn s-btn-primary s-btn-lg" onClick={enter}>Start a space <Arrow /></button>
                    <Link className="s-btn s-btn-quiet s-btn-lg" to="/tour">See how it works</Link>
                  </div>
                ) : (
                  <form className="hero-join" onSubmit={(e) => { e.preventDefault(); joinWithCode(); }}>
                    <label className="sr-only" htmlFor="join-code">Join code</label>
                    <input id="join-code" autoFocus className="join-input" placeholder="6-character code" value={code} maxLength={6}
                      autoCapitalize="characters" autoComplete="off" spellCheck={false}
                      onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())} />
                    <button type="submit" className="s-btn s-btn-primary s-btn-lg" disabled={!validCode}>Join space <Arrow /></button>
                    <button type="button" className="s-btn s-btn-quiet s-btn-lg" onClick={() => { setJoining(false); setCode(''); }}>Back</button>
                  </form>
                )}
              </div>
              <p className="hero-fine enter" style={{ '--d': 4 }}>
                {joining
                  ? 'The code is in your invite email. Try SAMPLE to look around a sample space.'
                  : <>Works in any browser. Have a code? <button className="link-btn" onClick={() => setJoining(true)}>Join a space</button></>}
              </p>
            </div>
            <div className="hero-visual enter" style={{ '--d': 2 }}>
              <HeroMock />
            </div>
          </div>
        </section>

        <Marquee items={['Live co-writing', 'Summaries', 'Mind maps', 'Slide decks', 'Infographics', 'Audio overviews', 'Answers with sources', 'Kanban board', 'Check-ins', 'Notifications', 'Comments', 'Version history', 'Roles']} />

        {/* The problem, in the reader's own words. */}
        <section className="band" aria-labelledby="problem-h">
          <div className="wrap split">
            <div className="split-head rv">
              <p className="eyebrow">The problem</p>
              <h2 id="problem-h">The meeting ends. The work never starts.</h2>
              <p className="lead">Most teams are good at talking things through. The trouble starts the moment everyone leaves the call.</p>
            </div>
            <ol className="problem-list">
              {PROBLEMS.map(([t, d], i) => (
                <li key={t} className="problem rv" style={{ '--rv': i }}>
                  <span className="problem-n">0{i + 1}</span>
                  <div><h3>{t}</h3><p>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The workflow, shown with the real app. */}
        <section className="band band-sunken" aria-labelledby="flow-h">
          <div className="wrap">
            <div className="sec-head center rv">
              <p className="eyebrow">How it works</p>
              <h2 id="flow-h">From the meeting to done, in one place</h2>
              <p className="lead">Six steps your team already takes. GroveStudio keeps them connected, so nothing falls between the notes and the work.</p>
            </div>
            <StoryScroll steps={WORKFLOW} idPrefix="flow" />
            <div className="center-link rv"><Link to="/tour" className="text-link">Take the full tour, from sign-in to follow-up <Arrow /></Link></div>
          </div>
        </section>

        {/* Bento of everything. */}
        <section className="band" aria-labelledby="bento-h">
          <div className="wrap">
            <div className="sec-head rv">
              <p className="eyebrow">Features</p>
              <h2 id="bento-h">Everything a working team needs</h2>
              <p className="lead">Notes, understanding, tasks and follow-up live together, so you are not copying between four tools.</p>
            </div>
            <Bento items={BENTO} />
            <div className="center-link rv"><Link to="/features" className="text-link">See every feature <Arrow /></Link></div>
          </div>
        </section>

        {/* Positioning for teams and enterprises. */}
        <section className="band band-deep" aria-labelledby="teams-h">
          <div className="wrap split">
            <div className="split-head rv">
              <p className="eyebrow">For teams and enterprises</p>
              <h2 id="teams-h">Built for teams that collaborate every day</h2>
              <p className="lead">Daily stand-ups, client calls, planning sessions. When many people decide things together, everyone needs to see the same notes, the same tasks and the same status.</p>
            </div>
            <ul className="team-grid">
              {TEAM_POINTS.map(([t, d], i) => (
                <li key={t} className="team-card rv" style={{ '--rv': i }}><h3>{t}</h3><p>{d}</p></li>
              ))}
            </ul>
          </div>
        </section>

        {/* Short answers: for readers and for answer engines. */}
        <section className="band" aria-labelledby="faq-h">
          <div className="wrap split">
            <div className="split-head rv">
              <p className="eyebrow">Questions</p>
              <h2 id="faq-h">GroveStudio in short</h2>
              <p className="lead">More answers on <Link to="/why" className="text-link inline">Why GroveStudio</Link>.</p>
            </div>
            <div className="faq-list rv">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="faq-item" open={i === 0}>
                  <summary>{q}<span className="faq-plus" aria-hidden="true" /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <CloseBand title="End your next meeting with a plan" line="Start a space, invite your team, and write the first note together. Tasks, owners and follow-ups come with it." />
      </main>
      <SiteFooter />
    </div>
  );
}

