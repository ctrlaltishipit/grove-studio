import opentype from 'opentype.js';
import fs from 'node:fs';
// Run from the repo root: npm i --no-save opentype.js @fontsource/manrope && node scripts/brand-gen.mjs && bash scripts/brand-icons.sh
const REPO = process.argv[2] ?? '.';
const F = 'node_modules/@fontsource/manrope/files/';
const load = w => (b => opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)))(fs.readFileSync(F + `manrope-latin-${w}-normal.woff`));
const bold = load(800), med = load(500);

// ---- icon geometry (256 box), shared by every surface ----
const DY = 12; // optical centring
const sh = d => d; // geometry already includes DY via transform below
const ICON = {
  page:  'M128 78V54a10 10 0 0 0-10-10H66a10 10 0 0 0-10 10V222a10 10 0 0 0 10 10H104M196 136V188L156 234H140',
  fold:  'M196 188H160a6 6 0 0 0-6 6L156 234Z',
  trace: 'M30 96L56 110L78 124',
  stem:  'M104 232C134 226 140 200 138 172C136 148 146 130 168 118',
  nodes: [[30, 96, 14], [128, 86, 14]],
  leafSmall: 'M138 172C136 136 110 114 72 110C74 144 100 168 138 172Z',
  leafBig:   'M160 124C150 78 186 44 236 32C244 82 212 120 160 124Z',
};
const nodePath = ([cx, cy, r]) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const LEAVES = [ICON.leafSmall, ICON.leafBig, ...ICON.nodes.map(nodePath)].join('');

// ---- wordmark, outlined ----
const SIZE = 132, X0 = 290, BASE = 128 + (SIZE * 0.72) / 2;
const g = bold.getPath('Grove', X0, BASE, SIZE, { kerning: true });
const gAdv = bold.getAdvanceWidth('Grove', SIZE, { kerning: true });
const s = med.getPath('Studio', X0 + gAdv + 2, BASE, SIZE, { kerning: true });
const r2 = p => p.toPathData(2);
const WORD_GROVE = r2(g), WORD_STUDIO = r2(s);
const bb = s.getBoundingBox();
const VB = { x: 0, y: 0, width: Math.ceil(bb.x2 + 16), height: 256 };

// ---- palettes ----
const PAL = {
  light: { page: '#82C99B', fold: '#82C99B', a: '#1D7A62', b: '#2ECC71', word: '#0F4C3A', accent: '#0F4C3A', bg: '#F7F9F6' },
  dark:  { page: '#1D7A62', fold: '#1D7A62', a: '#2ECC71', b: '#34EB88', word: '#F7F9F6', accent: '#DDE7E1', bg: '#0A0F0D' },
};

function art(p, id, { bg = false, words = false } = {}) {
  return `${bg ? `<rect x="${words ? 0 : 0}" width="${words ? VB.width : 256}" height="256" fill="${p.bg}"/>\n  ` : ''}<defs>
    <linearGradient id="${id}" x1="60" y1="244" x2="230" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/>
    </linearGradient>
  </defs>
  <path d="${ICON.page}" fill="none" stroke="${p.page}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${ICON.fold}" fill="${p.fold}" fill-opacity=".55"/>
  <path d="${ICON.trace}${ICON.stem}" fill="none" stroke="url(#${id})" stroke-width="10" stroke-linecap="round"/>
  <path d="${LEAVES}" fill="url(#${id})"/>${words ? `
  <path fill="${p.word}" d="${WORD_GROVE}"/>
  <path fill="${p.accent}" d="${WORD_STUDIO}"/>` : ''}`;
}
const svg = (vb, w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-label="GroveStudio">\n  <title>GroveStudio</title>\n  ${body}\n</svg>\n`;

const B = REPO + '/public/brand/';
for (const t of ['light', 'dark']) {
  fs.writeFileSync(B + `grovestudio-icon-${t}.svg`, svg('0 0 256 256', 256, 256, art(PAL[t], `gs-icon-${t}`)));
  fs.writeFileSync(B + `grovestudio-logo-${t}.svg`, svg(`0 0 ${VB.width} 256`, 480, Math.round(480 * 256 / VB.width), art(PAL[t], `gs-logo-${t}`, { words: true })));
}
// App-icon tiles (opaque background: iOS paints transparency black).
fs.writeFileSync(B + 'grovestudio-appicon.svg', svg('0 0 256 256', 256, 256, `<rect width="256" height="256" fill="${PAL.light.bg}"/>\n  <g transform="translate(25.6 25.6) scale(.8)">${art(PAL.light, 'gs-app')}</g>`));

// Favicon: follows the OS theme.
const L = PAL.light, D = PAL.dark;
fs.writeFileSync(REPO + '/public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="GroveStudio">
  <title>GroveStudio</title>
  <!-- Standalone copy of the icon in src/components/brand.js. The tab icon follows the
       OS theme only; the in-app toggle cannot reach it. Regenerate, don't hand-edit. -->
  <style>
    :root { --page: ${L.page}; --a: ${L.a}; --b: ${L.b}; }
    @media (prefers-color-scheme: dark) { :root { --page: ${D.page}; --a: ${D.a}; --b: ${D.b}; } }
    .a { stop-color: var(--a); } .b { stop-color: var(--b); }
    .page { stroke: var(--page); } .fold { fill: var(--page); }
  </style>
  <defs>
    <linearGradient id="g" x1="60" y1="244" x2="230" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0" class="a"/><stop offset="1" class="b"/>
    </linearGradient>
  </defs>
  <path class="page" d="${ICON.page}" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="fold" d="${ICON.fold}" fill-opacity=".55"/>
  <path d="${ICON.trace}${ICON.stem}" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round"/>
  <path d="${LEAVES}" fill="url(#g)"/>
</svg>
`);

// brand.js
fs.writeFileSync(REPO + '/src/components/brand.js', `// GroveStudio — brand geometry. Amendment A18, 25 Nov 2026: the sprout-on-a-page mark
// in the green palette (replaces the A17 indigo tile).
//
// GENERATED by the brand generator (see public/brand/README.md) — do not hand-edit.
// The one copy of the logo's path data. \`Logo\` (ui.jsx) draws the icon, \`Lockup\` draws
// the icon plus the wordmark; public/favicon.svg and public/brand/*.svg are emitted
// from the same numbers.
//
// Colour is NOT here. The page, fold, sprout gradient and wordmark fills are the
// \`--brand-*\` tokens in tokens.css, so the logo follows the theme the same way
// everything else does: the manual toggle wins, otherwise the system setting.

/** The icon's square box. */
export const ICON_SIZE = 256;

/** The page outline (stroked, 12 units, round caps): top-left body and the right edge
 *  that breaks into the folded corner. */
export const PAGE_PATH = '${ICON.page}';

/** The dog-ear flap at the page's lower-right corner (filled, 55% of the page colour). */
export const FOLD_PATH = '${ICON.fold}';

/** The circuit trace and the sprout's stem (stroked, 10 units, round caps). */
export const STEM_PATH = '${ICON.trace}${ICON.stem}';

/** Both leaves and the two circuit nodes (filled with the sprout gradient). */
export const LEAVES_PATH = '${LEAVES}';

/** The sprout gradient's axis, bottom-left (deeper) to top-right (brighter). */
export const SPROUT_AXIS = { x1: 60, y1: 244, x2: 230, y2: 32 };

/** The lockup's viewBox: icon at the origin, wordmark to its right. */
export const LOCKUP_VIEWBOX = { x: 0, y: 0, width: ${VB.width}, height: 256 };

/** "Grove", Manrope ExtraBold, set as outlines so it never depends on a webfont loading. */
export const WORD_GROVE_PATH =
  '${WORD_GROVE}';

/** "Studio", Manrope Medium — the lighter half of the wordmark. */
export const WORD_STUDIO_PATH =
  '${WORD_STUDIO}';
`);
console.log('viewbox width', VB.width);
