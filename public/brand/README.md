# Grove Studio — brand assets

The source artwork for the logo, as supplied on 12 Oct 2026 (amendment A17).
Use these in decks, posts and anywhere outside the app. Inside the app the
logo is drawn by `src/ds/Mark.tsx` (tile) and `src/ds/Logo.tsx` (lockup), which
share the path data in `src/ds/brand.ts` and recolour themselves with the theme.

| File | What | Use on |
|---|---|---|
| `grovestudio-icon-light.svg` | tile only, 256×256 | light backgrounds |
| `grovestudio-icon-dark.svg` | tile only, 256×256 | dark backgrounds |
| `grovestudio-logo-light.svg` | tile + "GroveStudio" wordmark | light backgrounds |
| `grovestudio-logo-dark.svg` | tile + "GroveStudio" wordmark | dark backgrounds |
| `og.svg` → `og.png` | 1200×630 social preview card | link previews (`og:image`) |

`public/icons/*.png` and `public/favicon.svg` are derived from the icon files.
Regenerate the PNGs with `scripts/brand-icons.sh` after changing the SVGs.

Colours (light / dark): tile `#7474EE→#4B4BCB` / `#A5ADFF→#8A92F8`, leaf
`#D0D2FF` / `#444AA8`, branch `#FFFFFF` / `#14152A`, "Grove" `#1C1D26` /
`#EDEEF6`, "Studio" `#4D4FB1` / `#B9BEFF`. These are the only places those
hexes may appear: the logo carries identity, never state.
