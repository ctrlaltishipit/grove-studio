// Observer palette from the design: five hues, assigned by colour_index
// (project_members) or by a stable hash of an id.

const PALETTE = ['var(--o1)', 'var(--o2)', 'var(--o3)', 'var(--o4)', 'var(--o5)'];
const TILES = ['var(--acc)', 'var(--o1)', 'var(--o2)', 'var(--o3)', 'var(--o4)', 'var(--o5)'];

export function hashCode(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) {
    h = (h * 31 + String(str).charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function memberColor(indexOrId) {
  if (typeof indexOrId === 'number' && Number.isFinite(indexOrId)) {
    return PALETTE[((indexOrId % 5) + 5) % 5];
  }
  return PALETTE[hashCode(indexOrId) % 5];
}

export function spaceTile(id) {
  return TILES[hashCode(id) % TILES.length];
}

export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] || 'there';
}

// Task label chip colors — tonal greens and neutrals, one brand family.
const LABEL_HUES = {
  spec: ['var(--acc-soft)', 'var(--acc-deep)'],
  design: ['color-mix(in oklab, var(--o2) 16%, var(--surface))', 'var(--o2)'],
  research: ['color-mix(in oklab, var(--o1) 14%, var(--surface))', 'var(--o1)'],
  eng: ['color-mix(in oklab, var(--o3) 16%, var(--surface))', 'var(--o3)'],
  ops: ['color-mix(in oklab, var(--o5) 14%, var(--surface))', 'var(--o5)'],
};
export function labelChip(label) {
  const key = String(label ?? '').trim().toLowerCase();
  if (LABEL_HUES[key]) return LABEL_HUES[key];
  const fallbacks = Object.values(LABEL_HUES);
  return fallbacks[hashCode(key) % fallbacks.length];
}
