import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/Store';
import { cycleTheme, currentTheme } from '../lib/theme';
import { Wordmark } from '../components/ui';
import { savePendingJoin } from '../lib/local';

function themeLabel() {
  const t = currentTheme();
  return t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'System';
}

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [, force] = useState(0);
  const enter = (via) => nav(user ? (via === 'join' ? '/app?join=1' : '/app') : '/signin' + (via === 'join' ? '?join=1' : ''));

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
    <div className="landing">
      <header className="landing-header">
        <Wordmark />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-sm" style={{ height: 34, color: 'var(--muted)', fontWeight: 500, borderColor: 'var(--border)' }}
            onClick={() => { cycleTheme(); force((x) => x + 1); }}>
            {themeLabel()}
          </button>
          <button className="btn btn-primary btn-sm" style={{ height: 34 }} onClick={() => enter('open')}>
            Open GroveStudio
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="landing-pill">
            <span className="dot pulse" />
            notes → tasks → done
          </div>
          <h1 className="landing-h1">
            Notes that don't stop<br />at <em style={{ fontStyle: 'italic' }}>being notes.</em>
          </h1>
          <p className="landing-sub">
            Write together in shared spaces, live, like a doc. Keep private spaces only you can see.
            Then let the studio summarise every meeting, surface next steps, assign them to the right
            people with deadlines, and check in until they're done.
          </p>
          {!joining ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => enter('open')}>Start a space</button>
              <button className="btn btn-lg" onClick={() => setJoining(true)}>Join with a code</button>
            </div>
          ) : (
            <form className="landing-join" onSubmit={(e) => { e.preventDefault(); joinWithCode(); }}>
              <input
                autoFocus
                className="code-input"
                placeholder="6-character code"
                aria-label="Join code"
                value={code}
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
              />
              <button type="submit" className="btn btn-primary btn-lg" disabled={!validCode}>Continue</button>
              <button type="button" className="btn btn-lg" onClick={() => { setJoining(false); setCode(''); }}>Back</button>
            </form>
          )}
          <div className="landing-fine">
            {joining
              ? 'The code is in your invite email, or try SAMPLE to look around the sample space.'
              : 'Six-character codes · nothing to install · private stays private'}
          </div>
        </div>

        <div className="landing-visual">
          <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <path d="M0 50 C 150 50, 250 170, 400 170" fill="none" stroke="var(--o1)" strokeWidth="2.5" strokeDasharray="6 8" style={{ animation: 'dashFlow 1.8s linear infinite' }} />
            <path d="M0 110 C 150 110, 250 170, 400 170" fill="none" stroke="var(--o2)" strokeWidth="2.5" strokeDasharray="6 8" style={{ animation: 'dashFlow 1.8s linear infinite', animationDelay: '-.3s' }} />
            <path d="M0 170 H 400" fill="none" stroke="var(--o3)" strokeWidth="2.5" strokeDasharray="6 8" style={{ animation: 'dashFlow 1.8s linear infinite', animationDelay: '-.6s' }} />
            <path d="M0 230 C 150 230, 250 170, 400 170" fill="none" stroke="var(--o4)" strokeWidth="2.5" strokeDasharray="6 8" style={{ animation: 'dashFlow 1.8s linear infinite', animationDelay: '-.9s' }} />
            <path d="M0 290 C 150 290, 250 170, 400 170" fill="none" stroke="var(--o5)" strokeWidth="2.5" strokeDasharray="6 8" style={{ animation: 'dashFlow 1.8s linear infinite', animationDelay: '-1.2s' }} />
            <line x1="400" y1="170" x2="560" y2="170" stroke="var(--acc)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="400" cy="170" r="10" fill="var(--acc)" />
            <circle cx="400" cy="170" r="17" fill="none" stroke="var(--acc)" strokeOpacity=".35" strokeWidth="2" />
          </svg>
          <div className="float-card" style={{ top: '4%', right: '2%' }}>
            <span className="avatar-stack" style={{ paddingLeft: 6 }}>
              <span className="avatar" style={{ width: 22, height: 22, background: 'var(--o1)', fontSize: 10 }}>PR</span>
              <span className="avatar" style={{ width: 22, height: 22, background: 'var(--o2)', fontSize: 10 }}>AM</span>
              <span className="avatar" style={{ width: 22, height: 22, background: 'var(--o5)', fontSize: 10 }}>SK</span>
            </span>
            3 people editing live
          </div>
          <div className="float-card" style={{ bottom: '2%', right: '10%', animationDuration: '6s', animationDelay: '-2s' }}>
            <span className="dot" style={{ width: 8, height: 8 }} />
            Task assigned → Arjun notified · due Fri
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="feature-card">
          <div className="icon" style={{ background: 'var(--acc-soft)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--acc)' }} />
          </div>
          <h3>Private &amp; shared spaces</h3>
          <p>Projects hold your notes. Private spaces are yours alone; shared spaces update live as teammates type: you can watch the words land.</p>
        </div>
        <div className="feature-card">
          <div className="icon" style={{ background: 'var(--sunken)' }}>
            <span style={{ width: 12, height: 12, transform: 'rotate(45deg)', background: 'var(--o3)', borderRadius: 3 }} />
          </div>
          <h3>A board that assigns</h3>
          <p>Every shared space has a board. Assign or reassign a task and the owner is notified instantly, with the note link, the reason, and the deadline.</p>
        </div>
        <div className="feature-card">
          <div className="icon" style={{ background: 'var(--acc-soft)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: 'var(--acc-deep)' }} />
          </div>
          <h3>A studio that follows up</h3>
          <p>Summaries, audio &amp; video overviews, mind maps, infographics, plus gentle check-ins that keep every assigned task moving until the deadline.</p>
        </div>
      </section>
    </div>
  );
}
