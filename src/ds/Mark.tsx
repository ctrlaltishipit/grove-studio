// Grove Studio — the brand mark.
//
// An orb whose gradient runs through the three OBSERVER IDENTITY colours
// (--observer-1 slate blue → --observer-2 plum → --observer-3 ochre). That is
// not decoration: those are the exact hues the roster and the convergence grid
// use to tell people apart, so the mark is three independent observers
// blending into one. The two eyes make it a character you can recognise at
// 16px in a browser tab.
//
// The hexes are hard-coded rather than tokenised on purpose — a brand mark is
// the one thing in the product that must look identical in both themes.
// GROVE-MASTER.md §16 amendment A13.
import { useId } from 'react';

export interface MarkProps {
  /** Rendered size in px. 20–24 in the header, 64+ on the login screen. */
  size?: number;
  /** Decorative by default; give it a label when it is the only thing identifying the app. */
  label?: string;
}

export function Mark({ size = 24, label }: MarkProps) {
  // useId keeps the gradient ids unique when several marks share a page,
  // otherwise the first instance's <defs> wins for all of them.
  const uid = useId().replace(/:/g, '');
  const skin = `grove-skin-${uid}`;
  const gloss = `grove-gloss-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={{ display: 'block', flex: 'none' }}
    >
      <defs>
        <linearGradient id={skin} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5C7FB8" />
          <stop offset="45%" stopColor="#8E5DA0" />
          <stop offset="100%" stopColor="#C77D3E" />
        </linearGradient>
        <radialGradient id={gloss} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill={`url(#${skin})`} />
      {/* the specular highlight — light falling on a real thing */}
      <ellipse cx="23" cy="20" rx="10" ry="7.5" fill={`url(#${gloss})`} transform="rotate(-18 23 20)" />
      {/* eyes: rounded slots, dark ink, evenly spaced about the centre */}
      <rect x="24.5" y="34" width="4" height="9" rx="2" fill="#2A2620" />
      <rect x="35.5" y="34" width="4" height="9" rx="2" fill="#2A2620" />
    </svg>
  );
}
