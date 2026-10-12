// Grove Studio — the brand mark: the tile on its own.
//
// A rounded indigo tile with a branch rising to the upper right and a small
// leaf at its foot. This is the app icon, the favicon, the avatar fallback —
// everywhere the product has to be recognised at 16–64px without its name.
//
// The fills are the `--brand-*` tokens, so the tile has a light face and a dark
// face and swaps with the rest of the chrome: the manual toggle wins, otherwise
// the system setting (tokens.css). Nothing here is animated.
// GROVE-MASTER.md §16 amendment A17 (supersedes A13's orb).
import { useId } from 'react';
import { LEAF_PATH, SWOOSH_PATH, TILE } from './brand';

export interface MarkProps {
  /** Rendered size in px. 20–24 in the header, 48–64 where it stands alone. */
  size?: number;
  /** Decorative by default; give it a label when it is the only thing identifying the app. */
  label?: string;
}

/** The tile's inner drawing, shared with `Logo`. Needs a unique gradient id per instance. */
export function TileArt({ gradientId }: { gradientId: string }) {
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

export function Mark({ size = 24, label }: MarkProps) {
  // useId keeps the gradient id unique when several marks share a page,
  // otherwise the first instance's <defs> wins for all of them.
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${TILE.size} ${TILE.size}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={{ display: 'block', flex: 'none' }}
    >
      <TileArt gradientId={`grove-tile-${uid}`} />
    </svg>
  );
}
