// A statement of provenance, not a badge. Every clause must be exactly true.
// It is true because notes are only ever read by their own author (data.js
// listMyNotes, and the notes_select_own policy) until api/synthesise.py reads
// them server-side at the moment of synthesis.
export default function IndependenceReceipt({ observerCount, noteCount, synthesisedAt }) {
  const time = (() => {
    try {
      return new Date(synthesisedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
      });
    } catch { return null; }
  })();

  return (
    <p className="receipt t-num">
      {observerCount} {observerCount === 1 ? 'observer' : 'observers'} · {noteCount}{' '}
      {noteCount === 1 ? 'note' : 'notes'} · separate lanes · no note text crossed a lane
      before synthesis{time ? ` at ${time} IST` : ''}.
    </p>
  );
}
