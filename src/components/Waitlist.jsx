import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/Store';
import { Arrow } from './PublicNav';

// The closing call to action on every public page: join the early access
// list, optionally with product news, or skip the wait and open the app.
// Posts to /api/waitlist (server/index.mjs -> join_waitlist in sql/09).

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function Sprouts() {
  // Three sprouts that grow in when the band comes into view.
  return (
    <svg className="wl-sprouts" viewBox="0 0 220 120" aria-hidden="true">
      {[[40, 1], [110, 1.35], [180, .9]].map(([x, s], i) => (
        <g key={x} className="wl-sprout" style={{ '--i': i }} transform={`translate(${x} 118) scale(${s})`}>
          <path d="M0 0V-46" className="wl-stem" />
          <path d="M0-30C-4-44-16-50-28-48C-26-36-14-30 0-30Z" className="wl-leaf" />
          <path d="M0-40C4-56 18-62 30-58C27-46 14-40 0-40Z" className="wl-leaf wl-leaf-b" />
        </g>
      ))}
    </svg>
  );
}

export default function WaitlistBand({ source = 'site', title = 'Get early access', line = 'Join the list to hear first when new features open. Add product news if you want it. No spam, and you can leave any time.' }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [news, setNews] = useState(false);
  const [trap, setTrap] = useState('');
  const [state, setState] = useState({ s: 'idle', msg: '' });
  const valid = EMAIL_RE.test(email.trim());

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || state.s === 'busy') return;
    setState({ s: 'busy', msg: '' });
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), newsletter: news, source, website: trap }),
      });
      let data = {};
      try { data = await res.json(); } catch { /* not JSON */ }
      if (!res.ok) throw new Error(data.error || 'We could not add you just now. Try again in a minute.');
      setState({ s: 'done', msg: '' });
    } catch (err) {
      setState({ s: 'error', msg: err.message });
    }
  };

  return (
    <section className="wl-band" id="early-access" aria-labelledby="wl-h">
      <div className="wl-glow" aria-hidden="true" />
      <div className="wrap wl-inner">
        <div className="wl-copy rv">
          <p className="eyebrow"><span className="sprout-dot" />Early access</p>
          <h2 id="wl-h">{title}</h2>
          <p className="wl-line">{line}</p>
          <Sprouts />
        </div>

        <div className="wl-card rv" style={{ '--rv': 1 }}>
          {state.s === 'done' ? (
            <div className="wl-done" role="status">
              <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" className="wl-check">
                <circle cx="24" cy="24" r="21" />
                <path d="M15 24.5l6 6 12-13" />
              </svg>
              <h3>You are on the list.</h3>
              <p>{news ? 'We will write when new features open, and send product news.' : 'We will write when new features open.'} Nothing to wait for though: GroveStudio already works in your browser.</p>
              <button className="s-btn s-btn-primary" onClick={() => nav(user ? '/app' : '/signin')}>Open GroveStudio <Arrow /></button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label htmlFor={`wl-email-${source}`} className="wl-label">Work email</label>
              <div className="wl-row">
                <input id={`wl-email-${source}`} type="email" inputMode="email" autoComplete="email" placeholder="you@company.com"
                  value={email} onChange={(e) => { setEmail(e.target.value); if (state.s === 'error') setState({ s: 'idle', msg: '' }); }}
                  aria-invalid={state.s === 'error' || undefined} aria-describedby={`wl-msg-${source}`} />
                <button type="submit" className="s-btn s-btn-primary" disabled={!valid || state.s === 'busy'}>
                  {state.s === 'busy' ? 'Adding you…' : <>Join the list <Arrow /></>}
                </button>
              </div>
              <label className="wl-check-row">
                <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} />
                <span className="wl-box" aria-hidden="true" />
                <span>Also send me product news</span>
              </label>
              {/* Hidden from people; bots fill it in. */}
              <input className="wl-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} />
              <p id={`wl-msg-${source}`} className={'wl-msg' + (state.s === 'error' ? ' err' : '')} role={state.s === 'error' ? 'alert' : undefined}>
                {state.s === 'error' ? state.msg : <>We only use your email to write to you about GroveStudio. See the <Link to="/privacy">Privacy note</Link>.</>}
              </p>
              <div className="wl-or"><span>or</span></div>
              <button type="button" className="s-btn s-btn-quiet s-btn-block" onClick={() => nav(user ? '/app' : '/signin')}>
                {user ? 'Open GroveStudio' : 'Try it now, free in your browser'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
