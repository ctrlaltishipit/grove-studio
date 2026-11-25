import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lockup, Logo } from './ui';

// A working preview of the app for people who have not signed in. It plays
// itself with a cursor (sign in, write, Studio, board, dashboard) until the
// visitor touches it; then everything is theirs to click. Nothing here talks
// to a server. Under reduced motion it never plays itself.

const SCENES = [
  { key: 'signin', label: 'Sign in', url: 'grovestudio.io/signin' },
  { key: 'write', label: 'Write', url: 'grovestudio.io/app/space/weekly-sync' },
  { key: 'studio', label: 'Studio', url: 'grovestudio.io/app/space/weekly-sync' },
  { key: 'board', label: 'Board', url: 'grovestudio.io/app/space/weekly-sync/board' },
  { key: 'home', label: 'Dashboard', url: 'grovestudio.io/app' },
];

const PEOPLE = {
  AM: { name: 'Arjun M.', c: 'var(--o3)' },
  SK: { name: 'Sara K.', c: 'var(--o5)' },
  NS: { name: 'Nia S.', c: 'var(--o4)' },
  TO: { name: 'Tom O.', c: 'var(--o1)' },
};

const LIVE = [
  ['AM', 'Launch moves to 12 March, so QA gets a full week.'],
  ['SK', 'We keep the beta to 40 teams for now.'],
];

const START_CARDS = {
  todo: [{ id: 'c1', t: 'Draft the launch email', tag: 'MARKETING', due: 'Thu', who: 'NS' }],
  doing: [{ id: 'c2', t: 'QA pass on sign-in', tag: 'ENG', due: 'Wed', who: 'AM' }],
  review: [{ id: 'c3', t: 'Pricing page copy', tag: 'DESIGN', due: 'Tue', who: 'TO' }],
  done: [{ id: 'c4', t: 'Book the venue', tag: 'OPS', due: 'Mon', who: 'SK' }],
};
const COLS = [['todo', 'To do'], ['doing', 'In progress'], ['review', 'In review'], ['done', 'Done']];
const DECK = { id: 'deck', t: 'Send the updated deck', tag: 'SALES', due: 'Fri', who: 'ME' };

const TOOLS = [
  ['summary', 'Summary', 'M7 7h10M7 11h10M7 15h6'],
  ['mindmap', 'Mind map', 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6 6l4 4M18 6l-4 4M6 18l4-4M18 18l-4-4'],
  ['slides', 'Slides', 'M4 5h16v11H4zM9 20h6M12 16v4'],
  ['infographic', 'Infographic', 'M5 19V11M10 19V6M15 19v-5M20 19H4'],
  ['audio', 'Audio', 'M5 10v4M9 7v10M13 4v16M17 8v8M21 11v2'],
];

const initials = (n) => (n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || 'YO').toUpperCase();

function Ico({ d, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Av({ id, me }) {
  const p = id === 'ME' ? { c: 'var(--acc)' } : PEOPLE[id];
  return <span className="dm-av" style={{ background: p.c }}>{id === 'ME' ? me : id}</span>;
}

/* --------------------------------------------------------- Studio art -- */

function StudioOut({ tool }) {
  switch (tool) {
    case 'mindmap':
      return (
        <svg className="dm-mind" viewBox="0 0 320 190" aria-label="A mind map of the meeting">
          {[[60, 40, 'Launch'], [260, 40, 'Beta'], [56, 150, 'QA'], [264, 150, 'Deck']].map(([x, y, t], i) => (
            <g key={t} className="dm-node" style={{ '--i': i }}>
              <path d={`M160 95 Q ${(160 + x) / 2} ${y < 95 ? 95 : 95} ${x} ${y}`} className="dm-edge" />
              <rect x={x - 34} y={y - 15} width="68" height="30" rx="15" className="dm-leaf" />
              <text x={x} y={y + 5}>{t}</text>
            </g>
          ))}
          <rect x="112" y="76" width="96" height="38" rx="19" className="dm-root" />
          <text x="160" y="100" className="dm-root-t">Weekly sync</text>
        </svg>
      );
    case 'slides':
      return (
        <div className="dm-slide">
          <div className="dm-slide-card">
            <span className="dm-slide-k">Weekly sync · 2 of 6</span>
            <b>Launch moves to 12 March</b>
            <i style={{ width: '82%' }} /><i style={{ width: '64%' }} /><i style={{ width: '72%' }} />
          </div>
          <div className="dm-slide-dots">{[0, 1, 2, 3, 4, 5].map((d) => <span key={d} className={d === 1 ? 'on' : ''} />)}</div>
        </div>
      );
    case 'infographic':
      return (
        <div className="dm-info">
          {[['Decisions', 3, 60], ['Tasks', 5, 100], ['Owners', 4, 80], ['Due this week', 2, 40]].map(([l, n, w], i) => (
            <div key={l} className="dm-bar" style={{ '--w': w + '%', '--i': i }}>
              <span>{l}</span><i /><b>{n}</b>
            </div>
          ))}
        </div>
      );
    case 'audio':
      return (
        <div className="dm-audio">
          <span className="dm-play"><Ico d="M8 5l11 7-11 7V5Z" size={18} /></span>
          <div className="dm-wave">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ '--i': i, '--h': 20 + ((i * 37) % 70) + '%' }} />)}</div>
          <span className="dm-time">2:41</span>
        </div>
      );
    default:
      return (
        <ul className="dm-sum">
          {['Launch moves to 12 March.', 'Beta stays at 40 teams.', 'You send the updated deck by Friday.'].map((t, i) => (
            <li key={t} style={{ '--i': i }}><span className="dm-tick" />{t}</li>
          ))}
          <li className="dm-src" style={{ '--i': 3 }}>From: Weekly sync, 24 Nov</li>
        </ul>
      );
  }
}

/* ----------------------------------------------------------- the demo -- */

export default function AppDemo() {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const [scene, setScene] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);
  const [cursor, setCursor] = useState({ x: 70, y: 60, click: 0, show: false });

  const [name, setName] = useState('');
  const [typed, setTyped] = useState(['', '']);
  const [mine, setMine] = useState('');
  const [taskMade, setTaskMade] = useState(false);
  const [toast, setToast] = useState(null);
  const [tool, setTool] = useState('summary');
  const [cards, setCards] = useState(START_CARDS);
  const [bell, setBell] = useState(false);
  const [checkin, setCheckin] = useState(null);

  const me = initials(name || 'You');
  const run = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) { setStill(true); setAuto(false); setTyped(LIVE.map((l) => l[1])); }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    if (rootRef.current) io.observe(rootRef.current);
    return () => io.disconnect();
  }, []);

  const flash = (t) => { setToast(t); setTimeout(() => setToast((x) => (x === t ? null : x)), 2600); };

  /* actions shared by the visitor and the autoplay */
  const signIn = () => { if (!name.trim()) setName('Priya R.'); setScene(1); };
  const makeTask = () => {
    if (taskMade) return;
    setTaskMade(true);
    setCards((c) => (COLS.some(([k]) => c[k].some((x) => x.id === 'deck')) ? c : { ...c, todo: [DECK, ...c.todo] }));
    flash('Task added to the board: Send the updated deck, due Fri');
  };
  const moveCard = (id) => setCards((c) => {
    const from = COLS.findIndex(([k]) => c[k].some((x) => x.id === id));
    if (from < 0) return c;
    const to = (from + 1) % COLS.length;
    const card = c[COLS[from][0]].find((x) => x.id === id);
    const next = { ...c, [COLS[from][0]]: c[COLS[from][0]].filter((x) => x.id !== id) };
    next[COLS[to][0]] = [{ ...card, moved: Date.now() }, ...c[COLS[to][0]]];
    return next;
  });
  const pickCheckin = (v) => { setCheckin(v); flash(v === 'Blocked' ? 'Sara was told it is blocked' : `Sara sees: ${v}`); };

  const reset = () => {
    setName(''); setTyped(still ? LIVE.map((l) => l[1]) : ['', '']); setMine(''); setTaskMade(false);
    setTool('summary'); setCards(START_CARDS); setBell(false); setCheckin(null); setToast(null);
  };

  /* teammates typing live on the Write scene */
  useEffect(() => {
    if (scene !== 1 || still || !visible) return;
    const id = setInterval(() => {
      setTyped((t) => t.map((s, i) => LIVE[i][1].slice(0, s.length + 1)));
    }, 55);
    return () => clearInterval(id);
  }, [scene, still, visible]);

  /* the self-playing cursor */
  const point = useCallback((key) => {
    const stage = stageRef.current;
    const el = stage?.querySelector(`[data-d="${key}"]`);
    if (!stage || !el) return null;
    const a = el.getBoundingClientRect(), b = stage.getBoundingClientRect();
    return { x: a.left - b.left + Math.min(a.width * 0.5, 60), y: a.top - b.top + a.height * 0.55 };
  }, []);

  useEffect(() => {
    if (!auto || !visible || still) { setCursor((c) => ({ ...c, show: false })); return; }
    const id = ++run.current;
    const alive = () => run.current === id;
    const wait = (ms) => new Promise((r, j) => setTimeout(() => (alive() ? r() : j(new Error('stop'))), ms));
    const move = async (key, ms = 650) => {
      const p = point(key);
      if (p) setCursor((c) => ({ ...c, ...p, show: true }));
      await wait(ms);
    };
    const click = async () => { setCursor((c) => ({ ...c, click: c.click + 1 })); await wait(260); };

    const scripts = {
      0: async () => {
        await wait(500); await move('name'); await click();
        for (const ch of 'Priya R.') { setName((n) => n + ch); await wait(85); }
        await wait(300); await move('go'); await click(); signIn();
      },
      1: async () => {
        await wait(2600); await move('maketask', 800); await click(); makeTask();
        await wait(1500); await move('tab-studio'); await click(); setScene(2);
      },
      2: async () => {
        await wait(1400);
        for (const t of ['mindmap', 'slides', 'audio']) { await move('tool-' + t); await click(); setTool(t); await wait(1700); }
        await move('tab-board'); await click(); setScene(3);
      },
      3: async () => {
        await wait(900); await move('card-deck'); await click(); moveCard('deck');
        await wait(1100); await move('card-deck'); await click(); moveCard('deck');
        await wait(1500); await move('nav-home'); await click(); setScene(4);
      },
      4: async () => {
        await wait(900); await move('bell'); await click(); setBell(true);
        await wait(2000); setBell(false); await move('ci-On track'); await click(); pickCheckin('On track');
        await wait(2600); reset(); setScene(0);
      },
    };
    (async () => {
      try {
        // Scenes the visitor jumped to without the earlier steps still make sense.
        if (scene >= 1 && !name) setName('Priya R.');
        if (scene >= 3) makeTask();
        await scripts[scene]();
      } catch { /* stopped */ }
    })();
    return () => { run.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, auto, visible, still]);

  // The visitor takes over the moment they touch the preview.
  const takeOver = (e) => { if (auto && e.isTrusted) setAuto(false); };
  const goTo = (i) => { setAuto(false); if (i >= 1 && !name) setName('Priya R.'); setScene(i); };

  const s = SCENES[scene];
  const deckCol = COLS.find(([k]) => cards[k].some((x) => x.id === 'deck'));

  return (
    <div className="demo" ref={rootRef}>
      <div className="demo-steps" role="tablist" aria-label="Preview steps">
        {SCENES.map((sc, i) => (
          <button key={sc.key} role="tab" aria-selected={scene === i} className={'demo-step' + (scene === i ? ' on' : '') + (i < scene ? ' past' : '')}
            onClick={() => goTo(i)}>
            <span className="demo-step-n">{i + 1}</span>{sc.label}
            {scene === i && auto && !still && visible && <span className="demo-step-bar" key={scene} />}
          </button>
        ))}
      </div>

      <div className="demo-frame">
        <div className="demo-bar">
          <span className="hm-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="demo-url"><Ico d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" size={12} /> {s.url}</span>
          {!still && (
            <button className="demo-play" onClick={() => setAuto((a) => !a)} aria-label={auto ? 'Pause the preview' : 'Play the preview'}>
              {auto ? <Ico d="M8 5v14M16 5v14" size={14} /> : <Ico d="M8 5l11 7-11 7V5Z" size={14} />}
              <span>{auto ? 'Playing' : 'Your turn'}</span>
            </button>
          )}
        </div>

        <div className="demo-stage" ref={stageRef} onPointerDownCapture={takeOver} onKeyDownCapture={takeOver}>
          {/* ---- 1. sign in ---- */}
          <div className={'dm-scene dm-signin' + (scene === 0 ? ' on' : '')} aria-hidden={scene !== 0}>
            <form className="dm-signin-card" onSubmit={(e) => { e.preventDefault(); signIn(); }}>
              <Lockup height={22} />
              <b className="dm-welcome">Welcome in.</b>
              <span className="dm-google" aria-hidden="true"><svg viewBox="0 0 18 18" width="15" height="15"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" /><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 5.9-2.2l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3A9 9 0 0 0 9 18Z" /><path fill="#FBBC05" d="M4 10.8a5.4 5.4 0 0 1 0-3.6V4.9H1a9 9 0 0 0 0 8.2l3-2.3Z" /><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 1 4.9l3 2.3c.7-2.1 2.7-3.6 5-3.6Z" /></svg>Continue with Google</span>
              <span className="dm-or">or</span>
              <input data-d="name" className="dm-input" placeholder="Type your name" maxLength={24} value={name}
                onChange={(e) => setName(e.target.value)} tabIndex={scene === 0 ? 0 : -1} aria-label="Your name" />
              <button data-d="go" type="submit" className="dm-btn" tabIndex={scene === 0 ? 0 : -1}>Continue as guest</button>
            </form>
          </div>

          {/* ---- the app shell for scenes 2 to 5 ---- */}
          <div className={'dm-scene dm-app' + (scene > 0 ? ' on' : '')} aria-hidden={scene === 0}>
            <aside className="dm-side">
              <div className="dm-side-brand"><Logo size={18} /><b>GroveStudio</b></div>
              <button data-d="nav-home" className={'dm-side-link' + (scene === 4 ? ' on' : '')} onClick={() => goTo(4)} tabIndex={scene ? 0 : -1}>
                <Ico d="M4 11l8-7 8 7v9H4z" size={14} />Home{scene !== 4 && <span className="dm-badge">1</span>}
              </button>
              <span className="dm-side-h">Shared</span>
              <button className={'dm-side-link' + (scene > 0 && scene < 4 ? ' on' : '')} onClick={() => goTo(1)} tabIndex={scene ? 0 : -1}><i className="dm-dot" />Weekly sync</button>
              <span className="dm-side-link dim"><i className="dm-dot amber" />Launch plan</span>
              <span className="dm-side-me"><Av id="ME" me={me} />{name || 'You'}</span>
            </aside>

            <div className="dm-main">
              {scene === 4 ? (
                <div className="dm-home">
                  <div className="dm-home-head">
                    <b>Good morning, {(name || 'there').split(' ')[0]}</b>
                    <button data-d="bell" className={'dm-bell' + (bell ? ' on' : '')} onClick={() => setBell((b) => !b)} aria-label="Notifications" tabIndex={scene === 4 ? 0 : -1}>
                      <Ico d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4" />
                      {!checkin && <span className="dm-bell-dot" />}
                    </button>
                    {bell && (
                      <div className="dm-pop" role="status">
                        <Av id="SK" /><span><b>Sara K.</b> assigned you <b>Send the updated deck</b>, due Fri</span>
                      </div>
                    )}
                  </div>
                  <span className="dm-h">Assigned to you</span>
                  <ul className="dm-mytasks">
                    {[[DECK.t, 'Fri', 'Weekly sync'], ['Review the QA notes', 'Mon', 'Launch plan'], ['Book user interviews', 'Next week', 'Launch plan']].map(([t, d, sp], i) => (
                      <li key={t} style={{ '--i': i }}><span className="dm-ring" /><span>{t}<small>{sp}</small></span><em>{d}</em></li>
                    ))}
                  </ul>
                  <div className="dm-checkin">
                    <span>Check-in from Sara: is <b>Send the updated deck</b> on track?</span>
                    <div className="dm-ci-btns">
                      {['On track', 'Blocked', 'Done'].map((v) => (
                        <button key={v} data-d={'ci-' + v} className={'dm-ci' + (checkin === v ? ' on' : '') + (v === 'Blocked' ? ' amber' : '')}
                          onClick={() => pickCheckin(v)} tabIndex={scene === 4 ? 0 : -1}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="dm-head">
                    <span className="dm-space-ic">W</span><b>Weekly sync</b>
                    <span className="dm-stack">{['AM', 'SK', 'NS'].map((p) => <Av key={p} id={p} />)}<Av id="ME" me={me} /></span>
                  </div>
                  <div className="dm-tabs" role="tablist">
                    {[['Notes', 1], ['Studio', 2], ['Board', 3]].map(([t, i]) => (
                      <button key={t} data-d={'tab-' + t.toLowerCase()} role="tab" aria-selected={scene === i} className={scene === i ? 'on' : ''}
                        onClick={() => goTo(i)} tabIndex={scene ? 0 : -1}>{t}</button>
                    ))}
                  </div>

                  {scene === 1 && (
                    <div className="dm-note">
                      <b className="dm-note-t">Weekly sync, 24 Nov</b>
                      <span className="dm-note-meta">Shared with 4 people · saved just now</span>
                      <p className="dm-line">Agenda: launch date, beta size, the sales deck.</p>
                      {LIVE.map(([who], i) => (
                        <p key={who} className="dm-line">
                          {typed[i]}
                          {!still && <span className="dm-caret" style={{ '--c': PEOPLE[who].c }}><span>{PEOPLE[who].name}</span></span>}
                        </p>
                      ))}
                      <p className={'dm-line dm-hl' + (taskMade ? ' made' : '')}>
                        {name ? name.split(' ')[0] : 'Priya'} sends the updated deck by Friday.
                        <button data-d="maketask" className="dm-mk" onClick={makeTask} tabIndex={scene === 1 ? 0 : -1}>
                          {taskMade ? <>Task on the board <Ico d="M5 12l5 5 9-11" size={12} /></> : <>+ Make task</>}
                        </button>
                      </p>
                      <label className="dm-line dm-mine">
                        <input value={mine} onChange={(e) => setMine(e.target.value)} placeholder="Add a line yourself..." maxLength={70} tabIndex={scene === 1 ? 0 : -1} />
                        <span className="dm-caret me" style={{ '--c': 'var(--acc)' }}><span>{name || 'You'}</span></span>
                      </label>
                    </div>
                  )}

                  {scene === 2 && (
                    <div className="dm-studio">
                      <div className="dm-tools">
                        {TOOLS.map(([k, l, d]) => (
                          <button key={k} data-d={'tool-' + k} className={'dm-tool' + (tool === k ? ' on' : '')} onClick={() => setTool(k)} tabIndex={scene === 2 ? 0 : -1}>
                            <Ico d={d} /><span>{l}</span>
                          </button>
                        ))}
                      </div>
                      <div className="dm-out" key={tool}><StudioOut tool={tool} /></div>
                    </div>
                  )}

                  {scene === 3 && (
                    <div className="dm-board">
                      {COLS.map(([k, l]) => (
                        <div key={k} className={'dm-col' + (deckCol?.[0] === k ? ' hot' : '')}>
                          <span className="dm-col-h">{l} <em>{cards[k].length}</em></span>
                          {cards[k].map((c) => (
                            <button key={c.id + (c.moved || '')} data-d={'card-' + c.id} className={'dm-card' + (c.moved ? ' moved' : '') + (k === 'done' ? ' done' : '')}
                              onClick={() => moveCard(c.id)} tabIndex={scene === 3 ? 0 : -1} title="Click to move to the next column">
                              <span className="dm-card-t">{c.t}</span>
                              <span className="dm-card-m"><em>{c.tag}</em><small>{c.due}</small><Av id={c.who} me={me} /></span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {toast && <div className="dm-toast" role="status" key={toast}><Ico d="M5 12l5 5 9-11" size={14} />{toast}</div>}

          {!still && (
            <div className={'demo-cursor' + (cursor.show ? ' show' : '')} style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} aria-hidden="true">
              <span className="demo-ripple" key={cursor.click} />
              <svg viewBox="0 0 20 24" width="20" height="24"><path d="M2 2l15 9-6.5 1.6L7.5 19 2 2Z" fill="#12241C" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </div>
          )}
        </div>
      </div>
      <p className="demo-hint">{auto && !still ? 'Click anywhere in the preview to take over.' : 'Everything in the preview is clickable. Try the board cards and the Studio tools.'}</p>
    </div>
  );
}
