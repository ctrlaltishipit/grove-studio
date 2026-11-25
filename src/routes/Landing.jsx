import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/Store';
import PublicNav, { CloseBand, SiteFooter, Arrow, useInView, usePageMeta } from '../components/PublicNav';
import HeroMock from '../components/HeroMock';
import { VisualsFromNotes, PrivacyRoles } from '../components/StoryVisuals';
import { savePendingJoin } from '../lib/local';

const PROBLEMS = [
  ['The notes go nowhere', 'Someone writes them up. They land in a doc, and nobody opens that doc again.'],
  ['Nobody owns the next step', 'Everyone heard the decision. Everyone assumes someone else is on it.'],
  ['Deadlines pass quietly', 'No one asks how it is going until the day it was due.'],
];

const STEPS = [
  ['Write it together', 'Everyone types into the same note during the meeting. You see each person’s name at their cursor, so nothing gets written twice.'],
  ['Turn decisions into tasks', 'Pick any sentence and make it a task. Give it an owner and a date. It goes on the space’s board with a link back to the note.'],
  ['Let GroveStudio follow up', 'Before the date, the owner gets a short check-in. They answer in one tap. You see where things stand without chasing anyone.'],
];

const OUTPUTS = ['Summary', 'Slide deck', 'Mind map', 'Infographic', 'Audio overview', 'Answers with sources'];

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  usePageMeta(
    'GroveStudio: shared meeting notes that turn into finished work',
    'Write meeting notes together, turn decisions into tasks with owners and dates, and let GroveStudio check in until the work is done.'
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

  const [stepsRef, stepsSeen] = useInView();

  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        {/* 1. Hero: what it is, who it is for, the one action, the product itself. */}
        <section className="hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />For teams that meet every week</p>
              <h1 className="enter" style={{ '--d': 1 }}>Meeting notes that turn into <span className="ink-accent">finished work.</span></h1>
              <p className="hero-sub enter" style={{ '--d': 2 }}>
                Write notes with your team in one shared space. Turn each decision into a task with an owner and a date.
                GroveStudio checks in until it is done.
              </p>
              <div className="enter" style={{ '--d': 3 }}>
                {!joining ? (
                  <div className="hero-actions">
                    <button className="s-btn s-btn-primary s-btn-lg" onClick={enter}>Start a space <Arrow /></button>
                    <button className="s-btn s-btn-quiet s-btn-lg" onClick={() => setJoining(true)}>Join with a code</button>
                  </div>
                ) : (
                  <form className="hero-join" onSubmit={(e) => { e.preventDefault(); joinWithCode(); }}>
                    <label className="sr-only" htmlFor="join-code">Join code</label>
                    <input
                      id="join-code"
                      autoFocus
                      className="join-input"
                      placeholder="6-character code"
                      value={code}
                      maxLength={6}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
                    />
                    <button type="submit" className="s-btn s-btn-primary s-btn-lg" disabled={!validCode}>Join space <Arrow /></button>
                    <button type="button" className="s-btn s-btn-quiet s-btn-lg" onClick={() => { setJoining(false); setCode(''); }}>Back</button>
                  </form>
                )}
              </div>
              <p className="hero-fine enter" style={{ '--d': 4 }}>
                {joining
                  ? 'The code is in your invite email. Try SAMPLE to look around a sample space.'
                  : 'Works in any browser. Nothing to install. Private notes stay private.'}
              </p>
            </div>
            <div className="hero-visual enter" style={{ '--d': 2 }}>
              <HeroMock />
            </div>
          </div>
        </section>

        {/* 2. The problem, in the reader's own words. */}
        <section className="band" aria-labelledby="problem-h">
          <div className="wrap split">
            <div className="split-head">
              <p className="eyebrow">The problem</p>
              <h2 id="problem-h">The meeting ends. The work never starts.</h2>
              <p className="lead">Most teams are good at talking things through. The trouble starts the moment everyone leaves the call.</p>
            </div>
            <ol className="problem-list">
              {PROBLEMS.map(([t, d], i) => (
                <li key={t} className="problem">
                  <span className="problem-n">0{i + 1}</span>
                  <div><h3>{t}</h3><p>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3. How it works: the page's one moment, a line that grows through three steps. */}
        <section className="band band-sunken" aria-labelledby="how-h">
          <div className="wrap">
            <div className="sec-head center">
              <p className="eyebrow">How it works</p>
              <h2 id="how-h">From a sentence in a note to a task that gets done</h2>
            </div>
            <ol ref={stepsRef} className={'steps' + (stepsSeen ? ' in-view' : '')}>
              <span className="steps-line" aria-hidden="true"><span /></span>
              {STEPS.map(([t, d], i) => (
                <li key={t} className="step" style={{ '--i': i }}>
                  <span className="step-n">{i + 1}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. The Studio. */}
        <section className="band" aria-labelledby="studio-h">
          <div className="wrap split split-visual">
            <div className="split-head">
              <p className="eyebrow">The Studio</p>
              <h2 id="studio-h">Read it, see it, or listen to it</h2>
              <p className="lead">
                Not everyone reads long notes. One click turns the same notes into the shape each person needs.
                Everything comes only from what your notes say.
              </p>
              <ul className="chips">
                {OUTPUTS.map((o) => <li key={o}>{o}</li>)}
              </ul>
              <Link to="/features" className="text-link">See every feature <Arrow /></Link>
            </div>
            <div className="visual-card"><VisualsFromNotes /></div>
          </div>
        </section>

        {/* 5. Privacy. */}
        <section className="band band-sunken" aria-labelledby="private-h">
          <div className="wrap split split-visual rev">
            <div className="visual-card"><PrivacyRoles /></div>
            <div className="split-head">
              <p className="eyebrow">Privacy</p>
              <h2 id="private-h">Shared when you want, private when you need</h2>
              <ul className="ticks">
                <li>Private spaces are visible only to you.</li>
                <li>In shared spaces, admins choose who can edit and who can only view.</li>
                <li>Any author can lock a note so only they can change it.</li>
                <li>Sharing a space never shows your private notes.</li>
              </ul>
            </div>
          </div>
        </section>

        <CloseBand title="End your next meeting with a plan" line="Start a space, invite your team with a six-character code, and write the first note together." />
      </main>
      <SiteFooter />
    </div>
  );
}
