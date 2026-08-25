import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/Store';
import { cycleTheme, currentTheme } from '../lib/theme';
import { Wordmark } from './ui';

// The public pages' shared header: wordmark, page links, theme, one CTA.
export default function PublicNav() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [, force] = useState(0);
  const label = currentTheme() === 'dark' ? 'Dark' : 'Light';
  return (
    <header className="landing-header">
      <Link to="/" style={{ textDecoration: 'none' }}><Wordmark /></Link>
      <nav className="public-nav" aria-label="Site">
        <NavLink to="/why" className={({ isActive }) => 'public-link' + (isActive ? ' on' : '')}>Why GroveStudio</NavLink>
        <NavLink to="/features" className={({ isActive }) => 'public-link' + (isActive ? ' on' : '')}>Features</NavLink>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button className="btn btn-sm" style={{ height: 34, color: 'var(--muted)', fontWeight: 500, borderColor: 'var(--border)' }}
          onClick={() => { cycleTheme(); force((x) => x + 1); }}>
          {label}
        </button>
        <button className="btn btn-primary btn-sm" style={{ height: 34 }} onClick={() => nav(user ? '/app' : '/signin')}>
          Open GroveStudio
        </button>
      </div>
    </header>
  );
}

// Per-page title + description, for search engines and answer engines alike.
export function usePageMeta(title, description) {
  React.useEffect(() => {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
    m.setAttribute('content', description);
  }, [title, description]);
}
