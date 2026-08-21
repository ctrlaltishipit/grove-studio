// Grove — 8.7 Observer chip. Default state only. NOT interactive anywhere in
// the product: no hover, no focus, no title attribute. Identity colour by join
// order; identity, never status. GROVE-MASTER.md §8.7.
import { initials } from '../lib/initials';

export interface ChipProps {
  name: string;
  colourIndex: number;
  small?: boolean;
  self?: boolean;
}

export function Chip({ name, colourIndex, small, self }: ChipProps) {
  return (
    <span
      className={`chip${small ? ' chip--sm' : ''}${self ? ' chip--self' : ''}`}
      data-colour={colourIndex % 5}
    >
      <span aria-hidden="true">{initials(name)}</span>
      <span className="vh">{name}</span>
    </span>
  );
}
