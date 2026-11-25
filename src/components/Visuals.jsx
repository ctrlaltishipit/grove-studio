import React, { useEffect, useRef, useState } from 'react';
import { AppFrame } from './Tour';

// Drawn visuals for the public site: isometric (3D) layers, a live globe of
// teammates in different countries, and a stack of real app screens.
// All SVG, all coloured by tokens, all still under reduced motion.

/* ----------------------------------------------------------- iso kit -- */
// Isometric projection: plan coordinates (x, y) on a slab at height z.
const C = 0.866;
const P = (x, y, z = 0) => [(x - y) * C, (x + y) * 0.5 - z];
const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
const plan = (z) => `matrix(${C} .5 ${-C} .5 0 ${-z})`;

function Slab({ w, d, z, t = 10, tone = 'a', children, className = '' }) {
  return (
    <g className={'iso-slab ' + className}>
      <polygon points={pts([P(0, d, z), P(w, d, z), P(w, d, z - t), P(0, d, z - t)])} className={`iso-l iso-${tone}`} />
      <polygon points={pts([P(w, 0, z), P(w, d, z), P(w, d, z - t), P(w, 0, z - t)])} className={`iso-r iso-${tone}`} />
      <polygon points={pts([P(0, 0, z), P(w, 0, z), P(w, d, z), P(0, d, z)])} className={`iso-top iso-${tone}`} />
      <g transform={plan(z)}>{children}</g>
    </g>
  );
}

// The hero: a note, the Studio and the board, stacked and floating, with
// light moving down through them.
export function IsoHero() {
  const W = 200, D = 150;
  return (
    <svg className="iso iso-hero" viewBox="-140 -262 400 462" role="img" aria-label="Three layers: notes on top, the Studio in the middle, the board at the bottom">
      <defs>
        <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--acc-bright)" stopOpacity="0" />
          <stop offset=".5" stopColor="var(--acc-bright)" stopOpacity=".9" />
          <stop offset="1" stopColor="var(--acc-bright)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g>
        {/* beams */}
        {[[40, 40], [160, 60], [100, 120]].map(([x, y], i) => {
          const [a, b] = P(x, y, 220), [, b2] = P(x, y, 0);
          return <line key={i} x1={a} y1={b} x2={a} y2={b2} className="iso-beam" style={{ '--i': i }} />;
        })}

        <g className="iso-float" style={{ '--f': 2 }}>
          <Slab w={W} d={D} z={0} tone="c">
            {[0, 1, 2, 3].map((c) => (
              <g key={c}>
                <rect x={10 + c * 47} y="12" width="40" height="126" rx="6" className="iso-col" />
                {[0, 1, 2].slice(0, 3 - (c % 3)).map((r) => (
                  <rect key={r} x={14 + c * 47} y={20 + r * 30} width="32" height="24" rx="4"
                    className={'iso-card' + (c === 1 && r === 0 ? ' iso-hop' : '')} />
                ))}
              </g>
            ))}
          </Slab>
        </g>

        <g className="iso-float" style={{ '--f': 1 }}>
          <Slab w={W} d={D} z={110} tone="b">
            <circle cx="100" cy="75" r="16" className="iso-node main" />
            {[[40, 34], [160, 34], [40, 116], [160, 116], [100, 18]].map(([x, y], i) => (
              <g key={i} className="iso-grow" style={{ '--i': i }}>
                <line x1="100" y1="75" x2={x} y2={y} className="iso-edge" />
                <circle cx={x} cy={y} r="9" className="iso-node" />
              </g>
            ))}
          </Slab>
        </g>

        <g className="iso-float" style={{ '--f': 0 }}>
          <Slab w={W} d={D} z={220} tone="a">
            <rect x="16" y="16" width="90" height="10" rx="5" className="iso-ink strong" />
            {[40, 58, 76, 94, 112].map((y, i) => (
              <rect key={y} x="16" y={y} width={[150, 128, 160, 104, 140][i]} height="7" rx="3.5" className={'iso-ink iso-type'} style={{ '--i': i }} />
            ))}
            <rect x="122" y="54" width="3" height="16" className="iso-caret c1" />
            <rect x="104" y="108" width="3" height="16" className="iso-caret c2" />
          </Slab>
        </g>
      </g>
      {/* labels, flat so they stay readable */}
      <g className="iso-labels">
        <g className="iso-tag" style={{ '--i': 0 }} transform="translate(182 -150)"><rect width="74" height="26" rx="13" /><text x="37" y="17.5">Notes</text></g>
        <g className="iso-tag" style={{ '--i': 1 }} transform="translate(182 -40)"><rect width="74" height="26" rx="13" /><text x="37" y="17.5">Studio</text></g>
        <g className="iso-tag" style={{ '--i': 2 }} transform="translate(182 70)"><rect width="74" height="26" rx="13" /><text x="37" y="17.5">Board</text></g>
      </g>
    </svg>
  );
}

// One small isometric scene per feature group.
export function IsoArt({ kind }) {
  const W = 150, D = 110;
  let body = null;
  if (kind === 'write') {
    body = (
      <Slab w={W} d={D} z={30} tone="a">
        <rect x="12" y="12" width="70" height="9" rx="4.5" className="iso-ink strong" />
        {[32, 48, 64, 80].map((y, i) => <rect key={y} x="12" y={y} width={[120, 96, 126, 80][i]} height="7" rx="3.5" className="iso-ink iso-type" style={{ '--i': i }} />)}
        <rect x="108" y="44" width="3" height="14" className="iso-caret c1" />
        <rect x="92" y="76" width="3" height="14" className="iso-caret c2" />
      </Slab>
    );
  } else if (kind === 'studio') {
    const MINI = [[14, 16, 'a'], [88, 16, 'c'], [52, 64, 'a']];
    body = (
      <>
        <Slab w={W} d={D} z={10} tone="b" />
        {MINI.map(([x, y, t], i) => {
          const [tx, ty] = P(x, y);
          return (
            <g key={i} transform={`translate(${tx} ${ty})`}>
              <g className="iso-bob" style={{ '--i': i }}>
                <Slab w={44} d={34} z={52} t={12} tone={t}>
                  {i === 0 && <><line x1="22" y1="17" x2="6" y2="6" className="iso-edge" /><line x1="22" y1="17" x2="38" y2="28" className="iso-edge" /><line x1="22" y1="17" x2="38" y2="6" className="iso-edge" /><circle cx="22" cy="17" r="6" className="iso-node main" /></>}
                  {i === 1 && [6, 16, 26].map((x2, j) => <rect key={j} x={x2 + 2} y={30 - (j + 1) * 8} width="7" height={(j + 1) * 8} className="iso-ink strong" />)}
                  {i === 2 && [0, 1, 2, 3, 4, 5].map((j) => <rect key={j} x={5 + j * 6} y={17 - (j % 3) * 4} width="3" height={2 + (j % 3) * 8} rx="1.5" className="iso-ink strong" />)}
                </Slab>
              </g>
            </g>
          );
        })}
      </>
    );
  } else if (kind === 'work') {
    body = (
      <Slab w={W} d={D} z={30} tone="c">
        {[0, 1, 2].map((c) => (
          <g key={c}>
            <rect x={8 + c * 47} y="8" width="40" height="94" rx="6" className="iso-col" />
            {[0, 1].slice(0, 2 - (c % 2)).map((r) => <rect key={r} x={12 + c * 47} y={14 + r * 28} width="32" height="22" rx="4" className="iso-card" />)}
          </g>
        ))}
        <rect x="12" y="70" width="32" height="22" rx="4" className="iso-card hot iso-slide" />
      </Slab>
    );
  } else {
    body = (
      <>
        <Slab w={W} d={D} z={10} tone="a" />
        {'K7Q2PA'.split('').map((ch, i) => {
          const [x, y] = P(14 + i * 22, 40, 0);
          return (
            <g key={i} className="iso-key" style={{ '--i': i }} transform={`translate(${x} ${y})`}>
              <Slab w={18} d={22} z={26} t={10} tone={i % 2 ? 'b' : 'c'}>
                <text x="9" y="15" className="iso-char">{ch}</text>
              </Slab>
            </g>
          );
        })}
      </>
    );
  }
  return (
    <svg className={'iso iso-art iso-' + kind} viewBox="-108 -96 250 236" aria-hidden="true">
      <g transform="translate(0 0)">{body}</g>
    </svg>
  );
}

/* ------------------------------------------------------------- globe -- */

// Very rough continent outlines as [lon, lat]: enough for a dotted globe.
const LAND = [
  [[-168, 65], [-140, 70], [-95, 72], [-80, 62], [-62, 58], [-55, 50], [-66, 44], [-76, 35], [-81, 25], [-97, 26], [-97, 20], [-87, 21], [-83, 10], [-78, 8], [-92, 15], [-105, 20], [-112, 30], [-118, 33], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
  [[-55, 82], [-25, 82], [-20, 70], [-42, 60], [-52, 65]],
  [[-80, 9], [-62, 11], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-66, -55], [-72, -50], [-73, -38], [-71, -18], [-81, -6]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [40, 46], [28, 41], [22, 36], [12, 38], [8, 44], [3, 42]],
  [[-6, 50], [1, 51], [-2, 56], [-5, 58], [-6, 55]],
  [[-17, 21], [-10, 30], [-6, 36], [10, 37], [32, 31], [35, 28], [43, 12], [51, 12], [40, -5], [40, -15], [35, -25], [20, -35], [17, -29], [12, -17], [13, -5], [9, 4], [-8, 5], [-17, 14]],
  [[28, 41], [40, 46], [40, 67], [60, 70], [80, 73], [105, 78], [140, 72], [170, 68], [180, 65], [160, 58], [140, 52], [142, 46], [130, 42], [122, 40], [122, 30], [110, 20], [105, 10], [100, 13], [98, 8], [92, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 26], [50, 30], [55, 22], [44, 13], [35, 28], [35, 36]],
  [[130, 31], [140, 35], [142, 40], [141, 45], [138, 38]],
  [[95, 5], [105, -6], [120, -9], [140, -8], [130, -2], [118, 2], [108, 2]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [132, -32], [116, -35]],
];
function inPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
let DOTS = null;
function dots() {
  if (DOTS) return DOTS;
  DOTS = [];
  for (let lat = -58; lat <= 80; lat += 3.2) {
    const step = 3.2 / Math.max(0.25, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon < 180; lon += step) {
      if (LAND.some((p) => inPoly([lon, lat], p))) DOTS.push([lon, lat]);
    }
  }
  return DOTS;
}

export const PEOPLE = [
  { who: 'Priya', city: 'Bengaluru', at: [77.6, 13], c: 'var(--o5)', msg: 'Added the launch numbers to the note.' },
  { who: 'Tom', city: 'London', at: [-0.1, 51.5], c: 'var(--o1)', msg: 'Moved the deck to In review.' },
  { who: 'Maya', city: 'New York', at: [-74, 40.7], c: 'var(--o3)', msg: 'Assigned the budget review to Tom.' },
  { who: 'Ana', city: 'São Paulo', at: [-46.6, -23.5], c: 'var(--o4)', msg: 'Check-in: on track for Friday.' },
  { who: 'Amara', city: 'Lagos', at: [3.4, 6.5], c: 'var(--o5)', msg: 'I can take the QA task.' },
  { who: 'Lena', city: 'Berlin', at: [13.4, 52.5], c: 'var(--o2)', msg: 'Restored yesterday’s version.' },
  { who: 'Kenji', city: 'Tokyo', at: [139.7, 35.7], c: 'var(--o1)', msg: 'Left a comment on line 4.' },
  { who: 'Sam', city: 'Sydney', at: [151.2, -33.9], c: 'var(--o3)', msg: 'Made a mind map of this week.' },
  { who: 'Diego', city: 'Mexico City', at: [-99.1, 19.4], c: 'var(--o4)', msg: 'Summary is ready for everyone.' },
];
const LINKS = [[0, 1], [1, 2], [2, 3], [5, 4], [0, 6], [6, 7], [8, 2], [1, 5], [0, 4]];

const rad = (d) => (d * Math.PI) / 180;
function vec([lon, lat]) {
  return [Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat)), Math.cos(rad(lat)) * Math.cos(rad(lon))];
}

export function Globe() {
  const wrapRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const arcRefs = useRef([]);
  const pinRefs = useRef([]);
  const bubbleRefs = useRef([]);
  const [talk, setTalk] = useState(0);
  const st = useRef({ rot: -20, drag: null, vis: false, still: false });

  useEffect(() => {
    const D = dots();
    const R = 200, CX = 220, CY = 220, TILT = rad(-16);
    const s = st.current;
    s.still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const proj = (v, r) => {
      const [x0, y0, z0] = v;
      const cr = Math.cos(r), sr = Math.sin(r);
      const x = x0 * cr + z0 * sr, z1 = -x0 * sr + z0 * cr;
      const y = y0 * Math.cos(TILT) - z1 * Math.sin(TILT);
      const z = y0 * Math.sin(TILT) + z1 * Math.cos(TILT);
      return [CX + R * x, CY - R * y, z];
    };
    const VD = D.map(vec);
    const VP = PEOPLE.map((p) => vec(p.at));
    // Points along each arc, lifted off the surface in the middle.
    const ARCS = LINKS.map(([a, b]) => {
      const A = VP[a], B = VP[b];
      const dot = Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
      const om = Math.acos(dot);
      return Array.from({ length: 25 }, (_, i) => {
        const t = i / 24, so = Math.sin(om) || 1;
        const k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so;
        const lift = 1 + 0.22 * Math.sin(Math.PI * t) * Math.min(1, om);
        return [0, 1, 2].map((j) => (k1 * A[j] + k2 * B[j]) * lift);
      });
    });

    let raf = 0, last = performance.now();
    const draw = (now) => {
      const dt = Math.min(64, now - last); last = now;
      if (!s.drag && !s.still && s.vis) s.rot += dt * 0.006;
      const r = rad(s.rot);
      let f = '', b = '';
      for (const v of VD) {
        const [x, y, z] = proj(v, r);
        if (z > 0) f += `M${x.toFixed(1)} ${y.toFixed(1)}h0`; else if (z > -0.35) b += `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
      }
      frontRef.current?.setAttribute('d', f);
      backRef.current?.setAttribute('d', b);
      ARCS.forEach((arc, i) => {
        const el = arcRefs.current[i];
        if (!el) return;
        const P2 = arc.map((v) => proj(v, r));
        const ok = P2[0][2] > 0.05 && P2[24][2] > 0.05;
        el.style.opacity = ok ? '' : '0';
        if (ok) { const d = 'M' + P2.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L'); for (const c of el.children) c.setAttribute('d', d); }
      });
      VP.forEach((v, i) => {
        const [x, y, z] = proj(v, r);
        const pin = pinRefs.current[i], bub = bubbleRefs.current[i];
        if (pin) { pin.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); pin.style.opacity = z > 0.02 ? '' : '0'; }
        if (bub) { bub.style.left = (x / 4.4) + '%'; bub.style.top = (y / 4.4) + '%'; bub.dataset.front = z > 0.15 ? '1' : '0'; bub.dataset.side = x > 250 ? 'l' : 'r'; }
      });
      if (s.vis || s.drag) raf = requestAnimationFrame(draw); else raf = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      s.vis = e.isIntersecting;
      if (s.vis && !raf) { last = performance.now(); raf = requestAnimationFrame(draw); }
    }, { threshold: 0.05 });
    io.observe(wrapRef.current);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  // A different teammate speaks every few seconds (only ones facing us).
  useEffect(() => {
    if (st.current.still) return;
    const id = setInterval(() => {
      setTalk((t) => {
        for (let k = 1; k <= PEOPLE.length; k++) {
          const n = (t + k) % PEOPLE.length;
          if (bubbleRefs.current[n]?.dataset.front === '1') return n;
        }
        return (t + 1) % PEOPLE.length;
      });
    }, 2300);
    return () => clearInterval(id);
  }, []);

  const down = (e) => { st.current.drag = { x: e.clientX, rot: st.current.rot }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const moveP = (e) => { const d = st.current.drag; if (d) st.current.rot = d.rot + (e.clientX - d.x) * 0.35; };
  const up = () => { st.current.drag = null; };

  return (
    <div className="globe" ref={wrapRef} onPointerDown={down} onPointerMove={moveP} onPointerUp={up} onPointerCancel={up}>
      <svg viewBox="0 0 440 440" role="img" aria-label="A globe with teammates in nine cities working in the same notes. Drag to turn it.">
        <defs>
          <radialGradient id="gl-sea" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#17594A" stopOpacity=".55" />
            <stop offset=".7" stopColor="#003F2D" stopOpacity=".35" />
            <stop offset="1" stopColor="#0A0F0D" stopOpacity=".2" />
          </radialGradient>
          <radialGradient id="gl-halo" cx="50%" cy="50%" r="50%">
            <stop offset=".86" stopColor="#7FD8B5" stopOpacity="0" />
            <stop offset=".93" stopColor="#7FD8B5" stopOpacity=".22" />
            <stop offset="1" stopColor="#7FD8B5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="220" cy="220" r="218" fill="url(#gl-halo)" />
        <circle cx="220" cy="220" r="200" fill="url(#gl-sea)" className="gl-sea" />
        <ellipse cx="220" cy="220" rx="200" ry="56" className="gl-ring" transform="rotate(-16 220 220)" />
        <path ref={backRef} className="gl-dots back" />
        <path ref={frontRef} className="gl-dots" />
        {LINKS.map((_, i) => (
          <g key={i} ref={(el) => { arcRefs.current[i] = el; }} className="gl-arcs">
            <path className="gl-arc-base" />
            <path className="gl-arc" pathLength="100" style={{ '--i': i }} />
          </g>
        ))}
        {PEOPLE.map((p, i) => (
          <g key={p.city} ref={(el) => { pinRefs.current[i] = el; }} className={'gl-pin' + (talk === i ? ' on' : '')}>
            <circle r="11" className="gl-pulse" style={{ fill: p.c }} />
            <circle r="4.5" style={{ fill: p.c }} className="gl-core" />
          </g>
        ))}
      </svg>
      {PEOPLE.map((p, i) => (
        <div key={p.city} ref={(el) => { bubbleRefs.current[i] = el; }} className={'gl-bubble' + (talk === i ? ' on' : '')} aria-hidden={talk !== i}>
          <span className="gl-av" style={{ background: p.c }}>{p.who[0]}</span>
          <span><b>{p.who}</b> <small>{p.city}</small><br />{p.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ inside stack -- */
// Real screens, stacked in depth. The front one is the one you picked; the
// stack turns by itself while it is on screen and nobody is pointing at it.

export function InsideStack({ items }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (hold || !vis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => setI((x) => (x + 1) % items.length), 4200);
    return () => clearTimeout(id);
  }, [i, hold, vis, items.length]);
  const n = items.length;
  return (
    <div className="inside" ref={ref} onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="inside-tabs" role="tablist" aria-label="Screens inside GroveStudio">
        {items.map((it, k) => (
          <button key={it.label} role="tab" aria-selected={k === i} className={'inside-tab' + (k === i ? ' on' : '')} onClick={() => setI(k)}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={it.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {it.label}
            {k === i && !hold && vis && <span className="inside-tab-bar" key={i} />}
          </button>
        ))}
      </div>
      <div className="inside-stage">
        {items.map((it, k) => {
          const d = (k - i + n) % n;
          return (
            <div key={it.label} className={'inside-card d' + Math.min(d, 3)} onClick={() => setI(k)} aria-hidden={d !== 0}>
              <AppFrame media={it.media} label={it.url || 'grovestudio.io/app'} />
            </div>
          );
        })}
        <p className="inside-cap" key={i} aria-live="polite"><b>{items[i].label}.</b> {items[i].line}</p>
      </div>
    </div>
  );
}
