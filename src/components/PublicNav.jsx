import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/Store';
import { cycleTheme, currentTheme } from '../lib/theme';
import { Wordmark } from './ui';

// The public site's shared chrome: header, footer, closing band, and the
// small hooks the pages use. Styles live in styles/site.css under .site.

const LINKS = [
  ['/', 'Home'],
  ['/why', 'Why GroveStudio'],
  ['/features', 'Features'],
];

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
          <nav className="site-links" aria-label="Site">
            {LINKS.slice(1).map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => 'site-link' + (isActive ? ' on' : '')}>{label}</NavLink>
            ))}
          </nav>
          <div className="site-actions">
            <button className="icon-btn" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
              <SunMoon dark={dark} />
            </button>
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

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-row">
        <div className="footer-brand">
          <Wordmark small />
          <p>Shared notes that turn into finished work.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/why">Why GroveStudio</Link>
          <Link to="/features">Features</Link>
          <Link to="/signin">Sign in</Link>
        </nav>
      </div>
      <div className="wrap footer-base">© {new Date().getFullYear()} GroveStudio</div>
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
    window.scrollTo(0, 0);
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
    m.setAttribute('content', description);
  }, [title, description]);
}
