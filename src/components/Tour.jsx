import React, { useEffect, useRef, useState } from 'react';

// Building blocks for the product walkthrough on the public site: a browser
// frame around real screenshots and clips from the app, a sticky scroll story
// whose picture follows the step you are reading, small animated SVG marks for
// each step, a bento grid with a cursor spotlight, and a marquee.
// Every motion stops under prefers-reduced-motion (site.css).

/* ------------------------------------------------------------ media -- */

export function AppFrame({ media, label = 'app.grovestudio.io', className = '' }) {
  return (
    <figure className={'app-frame ' + className}>
      <div className="app-frame-bar" aria-hidden="true">
        <span className="hm-dots"><i /><i /><i /></span>
        <span className="app-frame-url">{label}</span>
      </div>
      <div className="app-frame-body">
        <Media {...media} />
      </div>
    </figure>
  );
}

export function Media({ src, video, poster, alt, eager = false }) {
  const ref = useRef(null);
  // Clips only play while on screen, and never under reduced motion.
  useEffect(() => {
    const v = ref.current;
    if (!v || !video) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { v.removeAttribute('autoplay'); v.pause(); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [video]);
  if (video) {
    return (
      <video ref={ref} className="app-media" src={video} poster={poster} muted loop playsInline preload="metadata"
        aria-label={alt} width="1280" height="800" />
    );
  }
  return <img className="app-media" src={src} alt={alt} width="1440" height="900" loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}

/* -------------------------------------------------------- step marks -- */
// One small animated drawing per step, all on a 64 grid, coloured by tokens.

export function StepMark({ kind }) {
  const common = { viewBox: '0 0 64 64', width: 44, height: 44, 'aria-hidden': true, className: 'mark mark-' + kind };
  switch (kind) {
    case 'signin':
      return (
        <svg {...common}>
          <rect x="10" y="14" width="44" height="36" rx="8" className="m-line" />
          <rect x="18" y="28" width="28" height="8" rx="4" className="m-soft" />
          <rect x="20" y="30.5" width="2" height="3" className="m-caret" />
          <circle cx="32" cy="22" r="3" className="m-fill" />
        </svg>
      );
    case 'space':
      return (
        <svg {...common}>
          <rect x="10" y="12" width="20" height="20" rx="6" className="m-fill m-pop" />
          <rect x="34" y="12" width="20" height="20" rx="6" className="m-soft" />
          <rect x="10" y="36" width="20" height="16" rx="6" className="m-soft" />
          <path d="M44 38v12M38 44h12" className="m-stroke m-spin" />
        </svg>
      );
    case 'write':
      return (
        <svg {...common}>
          <path d="M12 18h34M12 28h40M12 38h26" className="m-stroke m-type" />
          <rect x="40" y="33" width="2.5" height="11" className="m-caret m-c1" />
          <rect x="47" y="13" width="2.5" height="11" className="m-caret m-c2" />
        </svg>
      );
    case 'studio':
      return (
        <svg {...common}>
          <rect x="8" y="22" width="18" height="22" rx="4" className="m-line" />
          <path d="M26 33h8" className="m-stroke m-dash" />
          <g className="m-cycle">
            <rect x="36" y="20" width="20" height="14" rx="3" className="m-fill" />
            <circle cx="46" cy="44" r="5" className="m-soft" />
          </g>
        </svg>
      );
    case 'assign':
      return (
        <svg {...common}>
          <path d="M10 20h30" className="m-stroke" />
          <rect x="8" y="16" width="34" height="8" rx="3" className="m-hl" />
          <g className="m-fly">
            <rect x="24" y="34" width="30" height="16" rx="4" className="m-fill" />
            <circle cx="47" cy="42" r="3.5" className="m-dot" />
          </g>
        </svg>
      );
    case 'board':
      return (
        <svg {...common}>
          <rect x="6" y="12" width="15" height="40" rx="4" className="m-soft" />
          <rect x="24.5" y="12" width="15" height="40" rx="4" className="m-soft" />
          <rect x="43" y="12" width="15" height="40" rx="4" className="m-soft" />
          <rect x="8" y="16" width="11" height="8" rx="2" className="m-fill m-hop" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg {...common}>
          <path d="M20 40V30a12 12 0 0 1 24 0v10l3 4H17l3-4Z" className="m-line m-ring" />
          <path d="M28 48h8" className="m-stroke" />
          <circle cx="44" cy="20" r="5" className="m-dot m-ping" />
        </svg>
      );
    case 'respond':
      return (
        <svg {...common}>
          <rect x="8" y="14" width="48" height="24" rx="8" className="m-line" />
          <path d="M16 46l6-8" className="m-stroke" />
          <rect x="14" y="21" width="12" height="10" rx="5" className="m-fill m-b1" />
          <rect x="28" y="21" width="12" height="10" rx="5" className="m-soft m-b2" />
          <rect x="42" y="21" width="8" height="10" rx="5" className="m-soft m-b3" />
        </svg>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------ scroll story -- */
// Text steps on the left scroll normally; the frame on the right sticks and
// cross-fades to the active step's picture. On phones each step carries its
// own picture inline and the sticky frame is hidden.

export function StoryScroll({ steps, idPrefix = 'step' }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.i)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);
  const pct = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 100;

  return (
    <div className="story">
      <ol className="story-steps">
        <span className="story-rail" aria-hidden="true"><span style={{ height: `${pct}%` }} /></span>
        {steps.map((s, i) => (
          <li key={s.title} id={`${idPrefix}-${i + 1}`} data-i={i} ref={(el) => (refs.current[i] = el)}
            className={'story-step' + (i === active ? ' on' : '')}>
            <div className="story-head">
              <span className="story-mark"><StepMark kind={s.mark} /></span>
              <span className="story-n">Step {i + 1}</span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            {s.points && <ul className="story-points">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>}
            <div className="story-inline"><AppFrame media={s.media} /></div>
          </li>
        ))}
      </ol>
      <div className="story-stage" aria-hidden="true">
        <div className="story-sticky">
          {steps.map((s, i) => (
            <div key={s.title} className={'story-slide' + (i === active ? ' on' : '')}>
              <AppFrame media={{ ...s.media, eager: i === 0 }} />
            </div>
          ))}
          <div className="story-dots">
            {steps.map((s, i) => <span key={s.title} className={i === active ? 'on' : ''} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ bento -- */

export function Bento({ items }) {
  const onMove = (e) => {
    const t = e.target.closest('.bento-card');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${e.clientX - r.left}px`);
    t.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <ul className="bento" onMouseMove={onMove}>
      {items.map((it, i) => (
        <li key={it.title} className={'bento-card rv ' + (it.size ?? '')} style={{ '--rv': i }}>
          <span className="bento-glow" aria-hidden="true" />
          <div className="bento-art" aria-hidden="true">{it.art}</div>
          <h3>{it.title}</h3>
          <p>{it.body}</p>
        </li>
      ))}
    </ul>
  );
}

// Little live drawings for the bento cards.
export const BentoArt = {
  cowrite: (
    <svg viewBox="0 0 220 90" className="ba">
      <rect x="6" y="10" width="208" height="70" rx="12" className="ba-panel" />
      <path d="M22 32h120M22 48h150M22 64h90" className="ba-line" />
      <g className="ba-cur ba-cur1"><rect x="0" y="0" width="2.5" height="14" /><rect x="0" y="-12" width="34" height="11" rx="3" /><text x="5" y="-4">Meera</text></g>
      <g className="ba-cur ba-cur2"><rect x="0" y="0" width="2.5" height="14" /><rect x="0" y="-12" width="30" height="11" rx="3" /><text x="5" y="-4">Arjun</text></g>
    </svg>
  ),
  formats: (
    <div className="ba-formats">
      {['Summary', 'Mind map', 'Slides', 'Infographic', 'Audio', 'Ask'].map((f, i) => (
        <span key={f} style={{ '--i': i }}>{f}</span>
      ))}
    </div>
  ),
  board: (
    <svg viewBox="0 0 220 90" className="ba">
      {[0, 1, 2, 3].map((c) => <rect key={c} x={6 + c * 54} y="8" width="48" height="74" rx="9" className="ba-panel" />)}
      <rect x="11" y="18" width="38" height="14" rx="4" className="ba-card ba-hop" />
      <rect x="65" y="40" width="38" height="14" rx="4" className="ba-card ba-still" />
      <rect x="173" y="18" width="38" height="14" rx="4" className="ba-card ba-still" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 220 90" className="ba">
      <rect x="6" y="8" width="208" height="74" rx="12" className="ba-panel" />
      <rect x="18" y="20" width="120" height="10" rx="5" className="ba-line-fill" />
      <rect x="18" y="40" width="160" height="14" rx="5" className="ba-row" />
      <rect x="18" y="60" width="140" height="14" rx="5" className="ba-row" />
      <g className="ba-bell"><circle cx="190" cy="25" r="11" className="ba-bell-bg" /><circle cx="197" cy="18" r="4" className="ba-badge" /></g>
    </svg>
  ),
  checkin: (
    <div className="ba-checkin">
      <span className="ba-q">How is the pricing draft going?</span>
      <span className="ba-btns"><b className="on">On track</b><b>Blocked</b><b>Done</b></span>
    </div>
  ),
  comments: (
    <svg viewBox="0 0 220 90" className="ba">
      <rect x="10" y="12" width="140" height="26" rx="10" className="ba-bubble ba-b1" />
      <rect x="70" y="48" width="140" height="26" rx="10" className="ba-bubble ba-b2" />
      <text x="22" y="29" className="ba-t">@Sam can you check line 4?</text>
      <text x="82" y="65" className="ba-t">Done, updated the FAQ</text>
    </svg>
  ),
  roles: (
    <div className="ba-roles">
      <span><i style={{ background: 'var(--o1)' }} />Admin</span>
      <span><i style={{ background: 'var(--o5)' }} />Can edit</span>
      <span><i style={{ background: 'var(--o4)' }} />View only</span>
    </div>
  ),
  history: (
    <svg viewBox="0 0 220 90" className="ba">
      <path d="M20 45h180" className="ba-axis" />
      {[30, 75, 120, 165].map((x, i) => <circle key={x} cx={x} cy="45" r="7" className="ba-ver" style={{ animationDelay: `${i * 0.4}s` }} />)}
    </svg>
  ),
};

/* ----------------------------------------------------------- marquee -- */

export function Marquee({ items }) {
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}
