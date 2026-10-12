// Grove Studio — the logo lockup: tile + "GroveStudio" wordmark.
//
// The wordmark is outlined, not typeset, so it is the same shape before and
// after Inter loads and in every browser. "Grove" takes the ink colour of the
// theme; "Studio" takes the brand accent. Both are `--brand-*` tokens, so the
// lockup follows the theme the way the tile does.
//
// Size by height: the lockup is 4.385× wider than it is tall. 24–28px in the
// header and sidebar, 48–64px on the login screen.
// GROVE-MASTER.md §16 amendment A17.
import { useId } from 'react';
import { LOCKUP_VIEWBOX, WORD_GROVE_PATH, WORD_STUDIO_PATH } from './brand';
import { TileArt } from './Mark';

export interface LogoProps {
  /** Rendered height in px; width follows the lockup's aspect ratio. */
  height?: number;
  /** Decorative by default; give it a label when it is the only thing naming the app. */
  label?: string;
}

const ASPECT = LOCKUP_VIEWBOX.width / LOCKUP_VIEWBOX.height;

export function Logo({ height = 26, label }: LogoProps) {
  const uid = useId().replace(/:/g, '');
  const { x, y, width: vw, height: vh } = LOCKUP_VIEWBOX;

  return (
    <svg
      width={Math.round(height * ASPECT)}
      height={height}
      viewBox={`${x} ${y} ${vw} ${vh}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={{ display: 'block', flex: 'none' }}
    >
      <TileArt gradientId={`grove-tile-${uid}`} />
      <path d={WORD_GROVE_PATH} style={{ fill: 'var(--brand-word)' }} />
      <path d={WORD_STUDIO_PATH} style={{ fill: 'var(--brand-word-accent)' }} />
    </svg>
  );
}
