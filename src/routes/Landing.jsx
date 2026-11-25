import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/Store';
import PublicNav, { SiteFooter, Arrow, usePageMeta, useInView } from '../components/PublicNav';
import HeroMock from '../components/HeroMock';
import { StoryScroll, Bento, BentoArt, Marquee } from '../components/Tour';
import AppDemo from '../components/AppDemo';
import WaitlistBand from '../components/Waitlist';
import { Globe } from '../components/Visuals';
import { OriginStory, MarginNote } from '../components/Origin';
import { STORYLINE, CAST } from '../lib/tourSteps';
import { savePendingJoin } from '../lib/local';
import { HOME_FAQ as FAQ } from '../lib/faq';

const BEFORE = [
  ['The notes go nowhere', 'Someone types them up after the call. They land in a doc, and nobody opens that doc again.'],
  ['Nobody owns the next step', 'Everyone heard the decision. Everyone assumes someone else is on it.'],
  ['Deadlines pass quietly', 'No one asks how it is going until the day it was due, and by then it is late.'],
  ['Half the team was not there', 'They get a wall of text to read, or nothing at all, and the context is lost.'],
];
const AFTER = [
  ['One live note for everyone', 'The whole team writes in the same note during the meeting. It saves as you type.'],
  ['Every decision gets an owner', 'Turn a line into a task with an owner and a date before the call ends.'],
  ['Check-ins before the deadline', 'Owners answer On track, Blocked or Done. Blocked alerts the person who assigned it.'],
  ['Catch up in the format you like', 'A summary, mind map, slides, infographic or audio, made from the same notes.'],
];

const BENTO = [
  { size: 'wide', art: BentoArt.cowrite, title: 'Live co-writing', body: 'The whole team types in one note. Names at every cursor, nothing written twice, every version kept.' },
  { art: BentoArt.formats, title: 'The Studio', body: 'Summary, mind map, slides, infographic, audio. Pick the format that makes it click.' },
  { art: BentoArt.board, title: 'Kanban board', body: 'To do, In progress, In review, Done. Assign, move and review cards in one view.' },
  { size: 'wide', art: BentoArt.dashboard, title: 'Your own dashboard', body: 'Everything assigned to you across every project, with a notification the moment something new arrives.' },
  { art: BentoArt.checkin, title: 'Check-ins', body: 'Owners reply On track, Blocked or Done. Blocked reaches the assigner straight away.' },
  { art: BentoArt.comments, title: 'Comments and mentions', body: 'Comment on any note you can see. Type @ to bring someone in.' },
  { size: 'wide', art: BentoArt.roles, title: 'Roles and private spaces', body: 'Admins, editors and viewers per person. Private spaces stay yours, and authors can lock a note.' },
  { size: 'wide', art: BentoArt.history, title: 'Version history', body: 'Every edit is kept with who made it. Restore any earlier version in one click.' },
];

const TEAM_POINTS = [
  ['Access you control', 'Admin, editor or viewer for each person. Lock a note so only its author can change it.'],
  ['Private by default', 'Private spaces are visible only to their owner. Sharing a space never shows private notes.'],
  ['A record of every change', 'Version history shows who changed what, and nothing is lost when you restore.'],
  ['Answers you can check', 'Studio answers come only from your notes, with the source note attached.'],
];

// Glass cards that float over the product picture and lean with the cursor.
const CHIPS = [
  { cls: 'c1', icon: 'M5 12l5 5 9-11', t: 'Arjun joined the note', s: 'Weekly sync · just now', d: 1.2 },
  { cls: 'c2', icon: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4', t: 'Priya assigned you a task', s: 'Send the updated deck · Fri', d: 2 },
  { cls: 'c3', icon: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6', t: 'Summary ready', s: '3 decisions · 4 tasks', d: 1.5 },
  { cls: 'c4', icon: 'M5 12l5 5 9-11', t: 'On track', s: 'Check-in answered', d: 2.4 },
];

function BeforeAfter() {
  const [withG, setWithG] = useState(false);
  const [ref, seen] = useInView({ threshold: 0.4 });
  const touched = useRef(false);
  // Flip to the "with" side once by itself, so the change is seen.
  useEffect(() => {
    if (!seen || touched.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => { if (!touched.current) setWithG(true); }, 2200);
    return () => clearTimeout(id);
  }, [seen]);
  const pick = (v) => { touched.current = true; setWithG(v); };
  const rows = withG ? AFTER : BEFORE;
  return (
    <div ref={ref} className={'ba' + (withG ? ' with' : '')}>
      <div className="ba-switch" role="tablist" aria-label="Compare">
        <span className="ba-thumb" aria-hidden="true" />
        <button role="tab" aria-selected={!withG} onClick={() => pick(false)}>Without GroveStudio</button>
        <button role="tab" aria-selected={withG} onClick={() => pick(true)}>With GroveStudio</button>
      </div>
      <ol className="ba-grid">
        {rows.map(([t, d], i) => (
          <li key={t} className="ba-card" style={{ '--i': i }}>
            <span className="ba-n">0{i + 1}</span>
            <span className="ba-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d={withG ? 'M5 12l5 5 9-11' : 'M6 6l12 12M18 6 6 18'} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  usePageMeta(
    'GroveStudio: team meeting notes, tasks and follow-ups in one place',
    'GroveStudio is a collaborative workspace for teams. Write meeting notes together, turn them into summaries, slides and audio, assign tasks on a Kanban board, and track everything from one dashboard.'
  );
  const enter = () => nav(user ? '/app' : '/signin');

  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const validCode = /^[A-Z0-9]{6}$/.test(code);
  const joinWithCode = () => {
    if (!validCode) return;
    savePendingJoin(code);
    nav(user ? `/app?join=${code}` : `/signin?join=${code}`);
  };

  // Cursor parallax for the hero's floating cards.
  const heroRef = useRef(null);
  const onMove = (e) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };

  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="hx" ref={heroRef} onMouseMove={onMove}>
          <div className="hx-bg" aria-hidden="true"><i className="o1" /><i className="o2" /><i className="o3" /></div>
          <div className="wrap hx-grid">
            <div className="hx-copy">
              <p className="hx-pill enter" style={{ '--d': 0 }}><span className="sprout-dot" />Free in early access · For teams that meet every day</p>
              <h1 className="enter" style={{ '--d': 1 }}>Meeting notes that turn into <span className="hx-glow">finished work.</span></h1>
              <p className="hx-sub enter" style={{ '--d': 2 }}>
                Write notes together in real time. When text is not enough, turn them into a summary, a mind map, slides or audio.
                Assign the tasks before the call ends, review them on a board, and follow up from one dashboard with check-ins and notifications.
              </p>
              <div className="enter" style={{ '--d': 3 }}>
                {!joining ? (
                  <div className="hero-actions">
                    <button className="s-btn s-btn-lg hx-primary" onClick={enter}>Start a space free <Arrow /></button>
                    <a className="s-btn s-btn-lg hx-ghost" href="#preview">Try the live preview</a>
                  </div>
                ) : (
                  <form className="hero-join" onSubmit={(e) => { e.preventDefault(); joinWithCode(); }}>
                    <label className="sr-only" htmlFor="join-code">Join code</label>
                    <input id="join-code" autoFocus className="join-input" placeholder="6-character code" value={code} maxLength={6}
                      autoCapitalize="characters" autoComplete="off" spellCheck={false}
                      onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())} />
                    <button type="submit" className="s-btn s-btn-lg hx-primary" disabled={!validCode}>Join space <Arrow /></button>
                    <button type="button" className="s-btn s-btn-lg hx-ghost" onClick={() => { setJoining(false); setCode(''); }}>Back</button>
                  </form>
                )}
              </div>
              <ul className="hx-trust enter" style={{ '--d': 4 }}>
                <li>Works in any browser</li><li>Nothing to install</li>
                <li>{joining ? 'Try SAMPLE to look around' : <>Have a code? <button className="link-btn" onClick={() => setJoining(true)}>Join a space</button></>}</li>
              </ul>
            </div>
            <div className="hx-visual enter" style={{ '--d': 2 }}>
              <div className="hx-halo" aria-hidden="true" />
              <div className="hx-mock"><HeroMock /></div>
              {CHIPS.map((c) => (
                <div key={c.cls} className={'hx-chip ' + c.cls} style={{ '--depth': c.d }} aria-hidden="true">
                  <span className="hx-chip-ic"><svg viewBox="0 0 24 24" width="16" height="16"><path d={c.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  <span><b>{c.t}</b><small>{c.s}</small></span>
                </div>
              ))}
            </div>
          </div>
          <div className="hx-marquee">
            <Marquee items={['Live co-writing', 'Summaries', 'Mind maps', 'Slide decks', 'Infographics', 'Audio overviews', 'Answers with sources', 'Kanban board', 'Check-ins', 'Notifications', 'Comments', 'Version history', 'Roles']} />
          </div>
        </section>

        {/* The preview overlaps the hero's lower edge. */}
        <section className="pull-up" id="preview" aria-labelledby="preview-h">
          <div className="wrap">
            <div className="glass-head rv">
              <p className="eyebrow">Try it before you sign in</p>
              <h2 id="preview-h">This is the app, working. Click in.</h2>
              <p className="lead">Watch someone sign in, write with a teammate, make a task, use the Studio and clear the board. Or take over and try it yourself.</p>
            </div>
            <div className="rv"><AppDemo /></div>
          </div>
        </section>

        <section className="band tint-band" aria-labelledby="problem-h">
          <div className="wrap has-note">
            <MarginNote id="problem" side="left" tilt={-2} />
            <div className="sec-head center rv">
              <p className="eyebrow">The problem</p>
              <h2 id="problem-h">The meeting ends. The work never starts.</h2>
              <p className="lead">Most teams are good at talking things through. The trouble starts the moment everyone leaves the call. Flip the switch to see what changes.</p>
            </div>
            <BeforeAfter />
          </div>
        </section>

        <OriginStory />

        <section className="band band-sunken" id="story" aria-labelledby="story-h">
          <div className="wrap has-note">
            <MarginNote id="story" side="right" tilt={2} />
            <div className="sec-head center rv">
              <p className="eyebrow">A week with GroveStudio</p>
              <h2 id="story-h">One meeting, followed all the way to done</h2>
              <p className="lead">Every picture below is the real app, signed in, with two people working in the same space. Scroll through their week.</p>
              <ul className="storyline-cast">
                {CAST.map(([n, r, c]) => (
                  <li key={n}><i style={{ background: c }}>{n.split(' ').map((w) => w[0]).join('').slice(0, 2)}</i><b>{n}</b><small>{r}</small></li>
                ))}
              </ul>
            </div>
            <StoryScroll steps={STORYLINE} idPrefix="week" />
            <div className="center-link rv"><Link to="/tour" className="text-link">See the full tour, from sign-in to follow-up <Arrow /></Link></div>
          </div>
        </section>

        <section className="band" aria-labelledby="bento-h">
          <div className="wrap has-note">
            <MarginNote id="bento" side="right" tilt={-1.5} />
            <div className="sec-head rv">
              <p className="eyebrow">Inside the app</p>
              <h2 id="bento-h">Everything a working team needs</h2>
              <p className="lead">Notes, understanding, tasks and follow-up live together, so you are not copying between four tools and nobody asks where the latest version is.</p>
            </div>
            <Bento items={BENTO} />
            <div className="center-link rv"><Link to="/features" className="text-link">Look inside the app <Arrow /></Link></div>
          </div>
        </section>

        <section className="band band-deep globe-band" aria-labelledby="teams-h">
          <div className="wrap globe-grid">
            <div className="split-head rv">
              <p className="eyebrow">For teams and enterprises</p>
              <h2 id="teams-h">Built for teams that collaborate every day, from anywhere</h2>
              <p className="lead">Daily stand-ups, client calls, planning sessions. When many people decide things together, in different cities and time zones, everyone needs the same notes, the same tasks and the same status.</p>
              <MarginNote id="teams" side="right" tilt={1.5} />
              <ul className="team-glass">
                {TEAM_POINTS.map(([t, d], i) => (
                  <li key={t} className="rv" style={{ '--rv': i }}><h3>{t}</h3><p>{d}</p></li>
                ))}
              </ul>
            </div>
            <div className="rv" style={{ '--rv': 1 }}><Globe /></div>
          </div>
        </section>

        <section className="band" aria-labelledby="faq-h">
          <div className="wrap split">
            <div className="split-head rv">
              <p className="eyebrow">Questions</p>
              <h2 id="faq-h">GroveStudio in short</h2>
              <p className="lead">More answers on <Link to="/features" className="text-link inline">Inside the app</Link> and <Link to="/why" className="text-link inline">Why GroveStudio</Link>.</p>
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

        <WaitlistBand source="home" />
      </main>
      <SiteFooter />
    </div>
  );
}
