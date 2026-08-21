// Grove — 8.18 Loading placeholder. The single content-shaped exception: a
// static --sunken block at the height the text will occupy, no animation of
// any kind, replaced without a fade. GROVE-MASTER.md §8.18.

export interface PlaceholderProps {
  height?: number;
}

export function Placeholder({ height }: PlaceholderProps) {
  return <div className="placeholder-block" style={height === undefined ? undefined : { height }} />;
}
