import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useData } from '../state/Store';
import { setTheme as applyTheme, currentTheme } from '../lib/theme';
import { signOut } from '../lib/auth';
import { Wordmark, Avatar, LockIcon, MenuIcon } from './ui';
import { spaceTile } from '../lib/colors';

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16"><path d="M13 9.5 A5.5 5.5 0 1 1 6.5 3 a4.3 4.3 0 0 0 6.5 6.5 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
);
const AutoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 2.8 a5.2 5.2 0 0 1 0 10.4 Z" fill="currentColor" /></svg>
);
const THEMES = [
  { key: null, label: 'System', icon: <AutoIcon /> },
  { key: 'light', label: 'Light', icon: <SunIcon /> },
  { key: 'dark', label: 'Dark', icon: <MoonIcon /> },
];

export default function Sidebar({ open = false, onNavigate, collapsed = false, onToggleCollapse }) {
  const navRaw = useNavigate();
  const nav = (to) => { navRaw(to); onNavigate?.(); };
  const { spaceId } = useParams();
  const { displayName, avatarUrl } = useAuth();
  const { spaces, myTasks, openModal, tasksReady } = useData();
  const [query, setQuery] = useState('');
  const [, force] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const theme = currentTheme(); // null | 'light' | 'dark'
  const setTheme = (t) => applyTheme(t);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const q = query.trim().toLowerCase();
  const all = spaces ?? [];
  const match = (s) => !q || s.name.toLowerCase().includes(q);
  const privates = all.filter((s) => s.kind === 'private' && match(s));
  const shared = all.filter((s) => s.kind === 'shared' && match(s));
  const openCount = tasksReady ? myTasks.filter((t) => t.status !== 'done').length : 0;
  const isHome = !spaceId;

  const openSpace = (id) => nav(`/app/s/${id}`);

  // Collapsed to a slim strip on desktop; the mobile drawer (open) still
  // renders the full nav so the topbar burger keeps working.
  if (collapsed && !open) {
    return (
      <aside className="sidebar-min">
        <button className="sidebar-min-btn" aria-label="Open the menu" title="Open the menu" onClick={onToggleCollapse}>
          <MenuIcon size={15} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div className="sidebar-head">
        <button className="sidebar-collapse" aria-label="Collapse the menu" title="Collapse the menu" onClick={onToggleCollapse}>
          <MenuIcon size={15} />
        </button>
        <Wordmark small onClick={() => nav('/')} />
      </div>

      <label className="sidebar-search">
        <svg width="13" height="13" viewBox="0 0 14 14" style={{ flex: 'none' }}>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="9.6" y1="9.6" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input ref={searchRef} placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <kbd>⌘K</kbd>
      </label>

      <button className={'nav-item' + (isHome ? ' active' : '')} onClick={() => nav('/app')}>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ flex: 'none' }}>
          <path d="M2 6.5 L7 2 L12 6.5 V12 a0.8 0.8 0 0 1 -0.8 0.8 H9 V9 H5 v3.8 H2.8 A0.8 0.8 0 0 1 2 12 Z"
            fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="label">Home</span>
        {openCount > 0 && <span className="count">{openCount}</span>}
      </button>

      <div className="nav-section">Private</div>
      <div className="nav-list">
        {privates.map((s) => (
          <button key={s.id} className={'nav-item' + (spaceId === s.id ? ' active' : '')} onClick={() => openSpace(s.id)}>
            <LockIcon color={spaceTile(s.id)} />
            <span className="label">{s.name}</span>
          </button>
        ))}
        {!privates.length && (
          <div style={{ padding: '2px 10px', fontSize: 12, color: 'var(--faint)' }}>
            {q ? 'No matches' : 'Only you can see these'}
          </div>
        )}
      </div>

      <div className="nav-section">
        Shared
        <button className="plus" aria-label="New space" onClick={() => openModal('new')}>+</button>
      </div>
      <div className="nav-list">
        {shared.map((s) => (
          <button key={s.id} className={'nav-item' + (spaceId === s.id ? ' active' : '')} onClick={() => openSpace(s.id)}>
            <span className="space-dot" style={{ background: spaceTile(s.id) }} />
            <span className="label">{s.name}</span>
          </button>
        ))}
        {!shared.length && (
          <div style={{ padding: '2px 10px', fontSize: 12, color: 'var(--faint)' }}>
            {q ? 'No matches' : 'Create one, or join with a code'}
          </div>
        )}
      </div>
      <button className="nav-new" onClick={() => openModal('new')}>+ New space</button>

      <div className="sidebar-foot" ref={menuRef}>
        {menuOpen && (
          <div className="profile-menu">
            <div className="pm-label">Appearance</div>
            <div className="pm-themes">
              {THEMES.map((t) => (
                <button key={t.key}
                  className={'pm-theme' + (theme === t.key ? ' on' : '')}
                  onClick={() => { setTheme(t.key); force((x) => x + 1); }}>
                  {t.icon}<span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="pm-divider" />
            <button className="pm-item danger" onClick={async () => { await signOut(); nav('/'); }}>
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M5.5 2 H3 a1 1 0 0 0 -1 1 v8 a1 1 0 0 0 1 1 h2.5 M9 4.5 L11.5 7 L9 9.5 M11.5 7 H5.5"
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign out
            </button>
          </div>
        )}
        <button className={'sidebar-user' + (menuOpen ? ' open' : '')} onClick={() => setMenuOpen((v) => !v)}>
          <Avatar name={displayName} avatarUrl={avatarUrl} size={26} />
          <span className="name">{displayName}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginLeft: 'auto', color: 'var(--faint)', flex: 'none' }}>
            <path d="M3.5 8.5 L7 5 L10.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
