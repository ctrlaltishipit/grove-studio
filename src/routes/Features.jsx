import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav, { SiteFooter, Arrow, usePageMeta } from '../components/PublicNav';
import WaitlistBand from '../components/Waitlist';
import { IsoHero, Globe } from '../components/Visuals';
import FeatureScene from '../components/FeatureScenes';
import { CycleHeadline } from '../components/FeatureHero';
import { I, Icon } from '../components/Icons';
import { FEATURES_FAQ } from '../lib/faq';
import Film from '../components/Film';
import { FILM } from '../lib/film';

const GROUPS = [
  {
    id: 'write', eyebrow: 'Write together', title: 'One note, the whole team, live',
    line: 'Everyone in the meeting writes in the same note. You see who is typing where, and nothing is ever lost.',
    items: [
      [I.pen, 'Live co-writing', 'Shared notes update as teammates type.'],
      [I.cursor, 'Named cursors', 'See each person’s name at their cursor.'],
      [I.mic, 'Dictation', 'Talk instead of typing, anywhere you write.'],
      [I.clock, 'Version history', 'Every edit kept. Restore in one click.'],
      [I.comment, 'Line comments', 'Pin a comment to the exact line.'],
      [I.at, 'Mentions', 'Type @ to bring a teammate in.'],
    ],
  },
  {
    id: 'studio', eyebrow: 'The Studio', title: 'The same notes, in the shape you need',
    line: 'Not everyone takes in a page of text. Turn notes into a summary, a picture, a deck or something to listen to, and ask questions with sources.',
    items: [
      [I.search, 'Ask with sources', 'Answers show the note they came from.'],
      [I.list, 'Summary', 'Decisions, open questions and next steps.'],
      [I.slides, 'Slide deck', 'Present it or download it.'],
      [I.map, 'Mind map', 'The main themes as one picture.'],
      [I.chart, 'Infographic', 'One image of the whole meeting.'],
      [I.audio, 'Audio overview', 'A two-host episode about your notes.'],
    ],
  },
  {
    id: 'work', eyebrow: 'Make work move', title: 'Decisions leave the page and get done',
    line: 'Turn a line into a task with an owner and a date. Review it on the board, and let check-ins do the chasing.',
    items: [
      [I.board, 'Kanban board', 'To do, In progress, In review, Done.'],
      [I.task, 'Tasks from notes', 'The task links back to its note.'],
      [I.spark, 'Check-ins', 'On track, Blocked or Done before the deadline.'],
      [I.bell, 'Notifications', 'Assignments, mentions and comments.'],
      [I.users, 'Roles', 'Admin, editor or viewer per person.'],
      [I.lock, 'Note locks', 'Only the author can edit, others read.'],
    ],
  },
  {
    id: 'share', eyebrow: 'Share in seconds', title: 'A code or an email, and they are in',
    line: 'Bring people in without a setup call. Keep private work private, and share a single note when that is all someone needs.',
    items: [
      [I.key, 'Six-character codes', 'Read it out loud. They join.'],
      [I.mail, 'Email invites', 'A join link and the code, from Share.'],
      [I.send, 'Email a note', 'Anyone can read it, no account needed.'],
      [I.lock, 'Private spaces', 'Visible only to you.'],
      [I.link, 'Sample space', 'Working examples from the first minute.'],
      [I.comment, 'Share one note', 'Share a single note, several, or a whole space.'],
    ],
  },
];

const ANYWHERE = [
  [I.cursor, 'Same note, live', 'Cursors with names, wherever people sit.'],
  [I.bell, 'Nobody misses a thing', 'Tasks, mentions and comments find the right person.'],
  [I.spark, 'Follow-up built in', 'Check-ins ask before a deadline slips.'],
];

export default function Features() {
  usePageMeta(
    'GroveStudio features: live notes, the Studio, Kanban board, check-ins and sharing',
    'Every GroveStudio feature: live co-writing with named cursors and version history, a Studio that makes summaries, slides, mind maps, infographics and audio, a Kanban board with check-ins, and sharing by code or email.'
  );
  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="hero f-hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />Features</p>
              <CycleHeadline />
              <p className="hero-sub enter" style={{ '--d': 2 }}>One place to write it together, see it your way and get it done.</p>
              <div className="hero-actions enter" style={{ '--d': 4 }}>
                <Link className="s-btn s-btn-primary s-btn-lg" to="/inside">Look inside the app <Arrow /></Link>
                <a className="s-btn s-btn-quiet s-btn-lg" href="#early-access">Get early access</a>
              </div>
            </div>
            <div className="hero-visual enter" style={{ '--d': 2 }}><IsoHero /></div>
          </div>
        </section>

        {FILM && (
          <section className="band band-sunken" id="film" aria-labelledby="film-h">
            <div className="wrap">
              <div className="sec-head center rv">
                <p className="eyebrow">Check out the app</p>
                <h2 id="film-h">GroveStudio in {FILM.minutes}</h2>
                <p className="lead">{FILM.line}</p>
              </div>
              <div className="rv"><Film src={FILM.src} poster={FILM.poster} chapters={FILM.chapters} title={FILM.title} /></div>
            </div>
          </section>
        )}

        {GROUPS.map((g, gi) => (
          <section key={g.id} id={g.id} className={'band' + (gi % 2 ? ' band-sunken' : '')} aria-labelledby={`${g.id}-h`}>
            <div className="wrap has-note">
              <div className={'fchap' + (gi % 2 ? ' flip' : '')}>
                <div className="fchap-copy rv">
                  <p className="eyebrow">0{gi + 1} · {g.eyebrow}</p>
                  <h2 id={`${g.id}-h`}>{g.title}</h2>
                  <p className="lead">{g.line}</p>
                  <ul className="flist">
                    {g.items.map(([d, n, l], ii) => (
                      <li key={n} className="rv" style={{ '--rv': ii }}>
                        <span className="flist-ic"><Icon d={d} /></span>
                        <span><b>{n}</b>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="fchap-art rv" style={{ '--rv': 1 }}><FeatureScene kind={g.id} /></div>
              </div>
            </div>
          </section>
        ))}

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

        <section className="band">
          <div className="wrap">
            <div className="inside-cta rv">
              <div>
                <h2>See it working before you sign in</h2>
                <p>A clickable preview, the real screens and a guided walk from sign-in to follow-up.</p>
              </div>
              <Link className="s-btn s-btn-lg hx-primary" to="/inside">Look inside the app <Arrow /></Link>
            </div>
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
