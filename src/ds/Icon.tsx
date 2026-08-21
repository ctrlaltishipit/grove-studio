// Grove — icons: one set, one weight, 16 and 20px, SVG only. GROVE-MASTER.md §6.6.
// Grove has no sparkles, shields, padlocks, warning triangles, trophies,
// lightbulbs, eyes, waveforms or equalisers.
import type { SVGProps } from 'react';

export type IconName = 'copy' | 'sun' | 'moon' | 'system' | 'mic' | 'play' | 'pause' | 'chev' | 'check';

const S: SVGProps<SVGSVGElement> = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const p: SVGProps<SVGSVGElement> = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', ...S };
  switch (name) {
    case 'copy':   return <svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>;
    case 'sun':    return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>;
    case 'moon':   return <svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>;
    case 'system': return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 4v16a8 8 0 0 0 0-16Z" fill="currentColor" stroke="none" /></svg>;
    case 'mic':    return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case 'play':   return <svg {...p}><path d="M8 5l11 7-11 7V5Z" /></svg>;
    case 'pause':  return <svg {...p}><path d="M9 5v14M15 5v14" /></svg>;
    case 'chev':   return <svg {...p} width={12} height={12}><path d="M9 6l6 6-6 6" /></svg>;
    case 'check':  return <svg {...p} width={16} height={16}><path d="M5 13l4 4L19 7" /></svg>;
    default: return null;
  }
}
