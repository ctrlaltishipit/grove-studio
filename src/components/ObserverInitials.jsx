// Initials in the observer's join-order colour. Colour is identity only,
// never status — the initials always disambiguate, so a colour collision
// between two simultaneous joiners degrades nothing that matters.
export function initialsOf(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ObserverInitials({ name, colourIndex = 0, small = false }) {
  return (
    <span
      className={`initials o-${colourIndex % 5}${small ? ' initials--sm' : ''}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
