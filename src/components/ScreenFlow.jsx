import React, { useEffect, useRef, useState } from 'react';

// "The real screens", alive: each real screenshot is shown whole. A cursor
// travels to the real control, clicks it, and the next screen opens from
// that spot. It plays like a video while on screen; the visitor can click
// the highlighted control, pick a step, or pause at any time.

const L = '/tour/live/';
// hot = the control that leads on, as [left, top, width, height] in % of the image.
export const FLOW = [
  { key: 'signin', label: 'Sign in', src: L + 'signin.webp', w: 800, h: 839, hot: [21.8, 62.9, 54.7, 6.4], click: 'Continue as guest',
    line: 'Type your name and continue as a guest. Nothing to install.', alt: 'The GroveStudio sign-in screen with the name Sara typed in' },
  { key: 'home', label: 'Home', src: L + 'home.webp', w: 1600, h: 838, hot: [56.4, 8.2, 9.4, 5.2], click: 'Join with a code',
    line: 'Home: the task Priya assigned you, everything on your plate, your spaces and the Studio.', alt: 'The Home dashboard with an assignment banner and tasks assigned to you' },
  { key: 'join', label: 'Join', src: L + 'join.webp', w: 1600, h: 832, hot: [37, 56, 26.3, 5.2], click: 'Join space',
    line: 'Join a shared space with its six-character code.', alt: 'The Join a shared space window with the code GRV7PK' },
  { key: 'summary', label: 'Summary', src: L + 'summary.webp', w: 1600, h: 839, hot: [77.6, 27.4, 7.2, 9.2], click: 'Slide deck',
    line: 'Open a note. The Studio sums it up: the decisions and the next steps.', alt: 'A note with the Studio summary, decisions and next steps' },
  { key: 'slides', label: 'Slides', src: L + 'slides.webp', w: 1600, h: 844, hot: [92.9, 17.2, 6.7, 9], click: 'Audio',
    line: 'The same notes as a slide deck you can present or download.', alt: 'A note with a slide deck made by the Studio' },
  { key: 'audio', label: 'Audio', src: L + 'audio.webp', w: 1600, h: 836, hot: [21.6, 6.6, 4.4, 4.2], click: 'Board',
    line: 'Or as a two-host audio overview to play on the way home.', alt: 'A note with the Studio audio overview player' },
  { key: 'board', label: 'Board', src: L + 'board.webp', w: 1600, h: 841, hot: [17.8, 24.2, 13.1, 13], click: 'the first card',
    line: 'Every task on the board, with its owner and its date. Move a card when it is done.', alt: 'The Kanban board with To do, In progress, In review and Done' },
];

const STEP_MS = 4200;

export default function ScreenFlow({ steps = FLOW }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(null);
  const [phase, setPhase] = useState('rest'); // rest -> aim -> press
  const [playing, setPlaying] = useState(true);
  const [vis, setVis] = useState(false);
  const [still, setStill] = useState(false);
  const ref = useRef(null);
  const n = steps.length;

  useEffect(() => {
    const s = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(s); if (s) setPlaying(false);
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { threshold: 0.35 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const go = (to) => { setPrev(i); setI(((to % n) + n) % n); setPhase('rest'); };

  // The self-playing click: rest, travel to the control, press, next screen.
  useEffect(() => {
    if (!playing || !vis) { setPhase('rest'); return undefined; }
    const t1 = setTimeout(() => setPhase('aim'), 900);
    const t2 = setTimeout(() => setPhase('press'), 2500);
    const t3 = setTimeout(() => go(i + 1), STEP_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing, vis]);

  useEffect(() => { if (prev === null) return undefined; const t = setTimeout(() => setPrev(null), 900); return () => clearTimeout(t); }, [prev]);

  const s = steps[i];
  const origin = (st) => `${st.hot[0] + st.hot[2] / 2}% ${st.hot[1] + st.hot[3] / 2}%`;

  return (
    <div className="sflow" ref={ref}>
      <div className="sflow-tabs" role="tablist" aria-label="Screens">
        {steps.map((st, k) => (
          <button key={st.key} role="tab" aria-selected={k === i} className={'sflow-tab' + (k === i ? ' on' : '') + (k < i ? ' past' : '')}
            onClick={() => { setPlaying(false); go(k); }}>
            <span className="sflow-n">{k + 1}</span>{st.label}
            {k === i && playing && vis && <span className="sflow-bar" key={i} style={{ animationDuration: STEP_MS + 'ms' }} />}
          </button>
        ))}
      </div>

      <div className="sflow-frame">
        <div className="sflow-chrome" aria-hidden="true">
          <span className="hm-dots"><i /><i /><i /></span>
          <span className="sflow-url">grovestudio.io/app</span>
          {!still && (
            <button className="sflow-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} tabIndex={0} aria-hidden="false">
              <svg viewBox="0 0 24 24" width="13" height="13"><path d={playing ? 'M8 5v14M16 5v14' : 'M8 5l11 7-11 7V5Z'} fill={playing ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span>{playing ? 'Playing' : 'Paused'}</span>
            </button>
          )}
        </div>
        <div className="sflow-stage">
          {prev !== null && (
            <div className="sflow-screen leaving" key={'p' + prev} style={{ transformOrigin: origin(steps[prev]) }} aria-hidden="true">
              <div className="sflow-img" style={{ aspectRatio: `${steps[prev].w} / ${steps[prev].h}` }}>
                <img src={steps[prev].src} alt="" />
              </div>
            </div>
          )}
          <div className={'sflow-screen' + (prev !== null ? ' entering' : '')} key={s.key}
            style={{ transformOrigin: prev !== null ? origin(steps[prev]) : '50% 50%' }}>
            <div className="sflow-img" style={{ aspectRatio: `${s.w} / ${s.h}` }}>
              <img src={s.src} alt={s.alt} loading={i === 0 ? 'eager' : 'lazy'} />
              <button className={'sflow-hot' + (phase === 'press' ? ' press' : '')}
                style={{ left: s.hot[0] + '%', top: s.hot[1] + '%', width: s.hot[2] + '%', height: s.hot[3] + '%' }}
                onClick={() => { setPlaying(false); go(i + 1); }} aria-label={`Click ${s.click} to see the next screen`}>
                <span className="sflow-tip">Click {s.click}</span>
              </button>
              {!still && (
                <span className={'sflow-cursor ' + phase} aria-hidden="true"
                  style={{ '--tx': `${s.hot[0] + s.hot[2] * 0.6}%`, '--ty': `${s.hot[1] + s.hot[3] * 0.62}%` }}>
                  <span className="sflow-ripple" />
                  <svg viewBox="0 0 20 24" width="22" height="26"><path d="M2 2l15 9-6.5 1.6L7.5 19 2 2Z" fill="#12241C" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sflow-foot">
        <button className="sflow-arrow" onClick={() => { setPlaying(false); go(i - 1); }} aria-label="Previous screen">‹</button>
        <p className="sflow-line" key={s.key} aria-live="polite"><b>{i + 1}. {s.label}.</b> {s.line}</p>
        <button className="sflow-arrow" onClick={() => { setPlaying(false); go(i + 1); }} aria-label="Next screen">›</button>
      </div>
    </div>
  );
}
