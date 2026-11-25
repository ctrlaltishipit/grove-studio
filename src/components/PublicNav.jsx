import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/Store';
import { cycleTheme, currentTheme } from '../lib/theme';
import { Wordmark } from './ui';

// The public site's shared chrome: header, footer, closing band, and the
// small hooks the pages use. Styles live in styles/site.css under .site.

const LINKS = [
  ['/', 'Home'],
  ['/tour', 'Product tour'],
  ['/features', 'Features'],
  ['/inside', 'Inside the app'],
  ['/why', 'Why GroveStudio'],
];

// Reveal-on-scroll for any .rv element on the page. Adds .in once, then
// stops watching. Reduced motion shows everything at once (site.css).
function useReveal(pathname) {
  useEffect(() => {
    const els = [...document.querySelectorAll('.site .rv:not(.in)')];
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [pathname]);
}

// The sliding pill under the active (or hovered) nav link.
function usePill(navRef, pathname) {
  const [pill, setPill] = useState(null);
  const place = (el) => {
    if (!el || !navRef.current) return setPill(null);
    const a = el.getBoundingClientRect(), b = navRef.current.getBoundingClientRect();
    setPill({ left: a.left - b.left, width: a.width });
  };
  const toActive = () => place(navRef.current?.querySelector('.site-link.on'));
  useEffect(() => { toActive(); window.addEventListener('resize', toActive); return () => window.removeEventListener('resize', toActive); }, [pathname]);
  return [pill, place, toActive];
}

function SunMoon({ dark }) {
  return dark ? (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  );
}

export function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PublicNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [dark, setDark] = useState(currentTheme() === 'dark');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const [pill, placePill, resetPill] = usePill(navRef, pathname);
  useReveal(pathname);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc); };
  }, [open]);

  const toggleTheme = () => setDark(cycleTheme() === 'dark');
  const go = () => nav(user ? '/app' : '/signin');

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={'site-header' + (scrolled || open ? ' is-solid' : '')}>
        <div className="wrap site-header-row">
          <Link to="/" className="site-brand" aria-label="GroveStudio home"><Wordmark /></Link>
          <nav className="site-links" aria-label="Site" ref={navRef} onMouseLeave={resetPill}>
            {pill && <span className="site-pill" aria-hidden="true" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} />}
            {LINKS.slice(1).map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => 'site-link' + (isActive ? ' on' : '')}
                onMouseEnter={(e) => placePill(e.currentTarget)} onFocus={(e) => placePill(e.currentTarget)}>{label}</NavLink>
            ))}
          </nav>
          <div className="site-actions">
            <button className="icon-btn" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
              <SunMoon dark={dark} />
            </button>
            <a className="s-btn s-btn-quiet s-btn-sm hide-sm" href="#early-access">Early access</a>
            <button className="s-btn s-btn-primary s-btn-sm hide-sm" onClick={go}>
              {user ? 'Open GroveStudio' : 'Sign in'}
            </button>
            <button className="icon-btn show-sm" aria-expanded={open} aria-controls="site-menu"
              aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              <span className={'burger' + (open ? ' x' : '')} aria-hidden="true"><i /><i /></span>
            </button>
          </div>
        </div>
      </header>
      <div id="site-menu" className={'site-menu' + (open ? ' open' : '')} hidden={!open}>
        <nav aria-label="Menu">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => 'site-menu-link' + (isActive ? ' on' : '')}>{label}</NavLink>
          ))}
        </nav>
        <a className="s-btn s-btn-quiet s-btn-lg s-btn-block" href="#early-access" onClick={() => setOpen(false)}>Get early access</a>
        <button className="s-btn s-btn-primary s-btn-lg s-btn-block" onClick={go}>
          {user ? 'Open GroveStudio' : 'Sign in'} <Arrow />
        </button>
      </div>
    </>
  );
}

// The dark band that closes every page: one line, one action.
export function CloseBand({ title, line, action = 'Start a space' }) {
  const nav = useNavigate();
  const { user } = useAuth();
  return (
    <section className="close-band">
      <div className="wrap close-inner">
        <div>
          <h2>{title}</h2>
          <p>{line}</p>
        </div>
        <button className="s-btn s-btn-on-dark s-btn-lg" onClick={() => nav(user ? '/app' : '/signin')}>
          {action} <Arrow />
        </button>
      </div>
    </section>
  );
}

// The footer's light backdrop: a ruled page with a few doodles from the app
// (a note, a cursor flag, a Studio spark, a check, sprouts) drifting slowly.
function FooterArt() {
  return (
    <svg className="sf-art" viewBox="600 0 600 220" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g className="sf-d d1" transform="translate(760 40)"><rect width="96" height="70" rx="10" className="sf-note" /><rect x="14" y="16" width="50" height="7" rx="3.5" className="sf-ink" /><rect x="14" y="32" width="66" height="5" rx="2.5" className="sf-ink2" /><rect x="14" y="44" width="56" height="5" rx="2.5" className="sf-ink2" /></g>
      <g className="sf-d d2" transform="translate(900 120)"><rect width="3" height="22" className="sf-flag" /><rect y="-16" width="48" height="16" rx="4" className="sf-flag" /><text x="7" y="-4" className="sf-flag-t">Priya</text></g>
      <g className="sf-d d3" transform="translate(1010 50)"><path d="M14 0v10M14 18v10M0 14h10M18 14h10M4 4l6 6M18 18l6 6M4 24l6-6M18 10l6-6" className="sf-spark" /></g>
      <g className="sf-d d4" transform="translate(1080 130)"><circle r="16" cx="16" cy="16" className="sf-check-c" /><path d="M9 16l5 5 9-10" className="sf-check" /></g>
      {[[640, 200, 1], [700, 200, .7], [1150, 200, .9]].map(([x, y, sc], i) => (
        <g key={i} className={'sf-sprout s' + i} transform={`translate(${x} ${y}) scale(${sc})`}>
          <path d="M0 0V-40" className="sf-stem" />
          <path d="M0-26C-4-38-14-44-24-42C-22-32-12-26 0-26Z" className="sf-leaf" />
          <path d="M0-34C4-48 16-54 26-50C23-40 12-34 0-34Z" className="sf-leaf b" />
        </g>
      ))}
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer sf">
      <FooterArt />
      <div className="wrap sf-grid">
        <div className="footer-brand">
          <Wordmark small />
          <p>Team notes, tasks and follow-ups in one place.</p>
          <p className="sf-tag"><em>Write it together. See it your way. Get it done.</em></p>
        </div>
        <nav className="sf-cols" aria-label="Footer">
          <div><span className="sf-h">Product</span><Link to="/tour">Product tour</Link><Link to="/features">Features</Link><Link to="/inside">Inside the app</Link></div>
          <div><span className="sf-h">Company</span><Link to="/why">Why GroveStudio</Link><a href="#early-access">Early access</a><Link to="/signin">Sign in</Link></div>
          <div><span className="sf-h">Legal</span><Link to="/privacy">Privacy note</Link><Link to="/terms">Terms of use</Link></div>
        </nav>
      </div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} GroveStudio</span>
        <span className="sf-made">Made for teams that meet every day</span>
      </div>
    </footer>
  );
}

// Adds .in-view once the element is on screen, for the one moment per page.
// Under reduced motion the CSS shows the end state straight away.
export function useInView(options = { threshold: 0.35 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, options);
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

// Per-page title + description, for search engines and answer engines alike.
export function usePageMeta(title, description) {
  React.useEffect(() => {
    document.title = title;
    const id = window.location.hash.slice(1);
    const target = id && document.getElementById(id);
    if (target) setTimeout(() => target.scrollIntoView(), 60); else window.scrollTo(0, 0);
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
    m.setAttribute('content', description);
  }, [title, description]);
}
