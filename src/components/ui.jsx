import React, { useEffect, useId } from 'react';
import { memberColor, initials } from '../lib/colors';
import { LEAF_PATH, SWOOSH_PATH, TILE, LOCKUP_VIEWBOX, WORD_GROVE_PATH, WORD_STUDIO_PATH } from './brand';

// The brand (A17). The tile and the lockup are drawn from one copy of the path
// data in brand.js and coloured by the six --brand-* tokens, so they swap faces
// with the theme the same way the chrome does. Nothing here animates.

// The tile's inner drawing, shared by Logo and Wordmark. The gradient id must
// be unique per instance or the first <defs> on the page wins for all of them.
function TileArt({ gradientId }) {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2={TILE.size} y2={TILE.size} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--brand-tile-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brand-tile-b)' }} />
        </linearGradient>
      </defs>
      <rect width={TILE.size} height={TILE.size} rx={TILE.radius} fill={`url(#${gradientId})`} />
      <path d={LEAF_PATH} style={{ fill: 'var(--brand-leaf)' }} />
      <path d={SWOOSH_PATH} style={{ fill: 'var(--brand-swoosh)' }} />
    </>
  );
}

// The tile on its own. Decorative unless given a label.
export function Logo({ size = 26, label }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${TILE.size} ${TILE.size}`}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}
      style={{ display: 'block', flex: 'none' }}>
      <TileArt gradientId={`grove-tile-${uid}`} />
    </svg>
  );
}

const LOCKUP_ASPECT = LOCKUP_VIEWBOX.width / LOCKUP_VIEWBOX.height;

// Tile + "GroveStudio", outlined so it is the same shape before and after the
// webfont loads. Sized by height; the width follows. It always carries the
// accessible name, because wherever it sits it is the only thing naming the app.
export function Lockup({ height = 28 }) {
  const uid = useId().replace(/:/g, '');
  const { x, y, width, height: vh } = LOCKUP_VIEWBOX;
  return (
    <svg width={Math.round(height * LOCKUP_ASPECT)} height={height} viewBox={`${x} ${y} ${width} ${vh}`}
      role="img" aria-label="GroveStudio" style={{ display: 'block', flex: 'none' }}>
      <TileArt gradientId={`grove-tile-${uid}`} />
      <path d={WORD_GROVE_PATH} style={{ fill: 'var(--brand-word)' }} />
      <path d={WORD_STUDIO_PATH} style={{ fill: 'var(--brand-word-accent)' }} />
    </svg>
  );
}

export function Wordmark({ onClick, small = false }) {
  const inner = <Lockup height={small ? 24 : 28} />;
  if (onClick) {
    return <button className="sidebar-logo" onClick={onClick} aria-label="Home">{inner}</button>;
  }
  return <div className="wordmark">{inner}</div>;
}

export function Avatar({ name, colourIndex, avatarUrl, size = 26, fontSize, title, ring }) {
  const style = {
    width: size, height: size,
    background: avatarUrl ? 'var(--sunken)' : memberColor(colourIndex ?? name ?? '?'),
    fontSize: fontSize ?? Math.max(9, Math.round(size * 0.4)),
    boxShadow: ring ? `0 0 0 2px ${memberColor(colourIndex ?? name ?? '?')}` : undefined,
  };
  return (
    <span className="avatar" style={style} title={title ?? name}>
      {avatarUrl ? <img src={avatarUrl} alt={name ?? ''} referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}

export function AvatarStack({ people, size = 26, max = 5 }) {
  const shown = (people ?? []).slice(0, max);
  return (
    <span className="avatar-stack">
      {shown.map((p, i) => (
        <Avatar key={p.userId ?? p.memberId ?? i} name={p.name} colourIndex={p.colourIndex}
          avatarUrl={p.avatarUrl} size={size} title={p.name} />
      ))}
    </span>
  );
}

export function Spinner({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="spinner" aria-label="Loading">
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--border-strong)" strokeWidth="3" />
      <path d="M12 3 a9 9 0 0 1 9 9" fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Modal({ onClose, children, width = 440 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function SparkIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      <path d="M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6 Z" fill="currentColor" />
    </svg>
  );
}

export function MenuIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M2.5 4.5 h11 M2.5 8 h11 M2.5 11.5 h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ flex: 'none' }}>
      <rect x="2" y="5" width="8" height="5.5" rx="1.4" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M4 5 V3.6 a2 2 0 0 1 4 0 V5" fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function DocIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="doc" style={{ color: 'var(--faint)', flex: 'none' }}>
      <path d="M4 1.5 h5.5 L13 5 v9.5 a1 1 0 0 1 -1 1 H4 a1 1 0 0 1 -1 -1 v-13 a1 1 0 0 1 1 -1 Z"
        fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.5 1.5 V5 H13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
