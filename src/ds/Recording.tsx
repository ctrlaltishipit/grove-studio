// Grove — 8.21 Recording indicator. Static text and a button.
// NOTHING animates — no pulsing dot, no waveform, no level meter.
// GROVE-MASTER.md §8.21.

export interface RecordingProps {
  seconds: number;
  onStop: () => void;
}

export function Recording({ seconds, onStop }: RecordingProps) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <span className="recording">
      <span className="recording__time">Recording · {mm}:{ss}</span>
      <button type="button" className="btn btn--secondary btn--sm" onClick={onStop}>Stop</button>
    </span>
  );
}
