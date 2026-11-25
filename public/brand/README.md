# GroveStudio — brand assets

Amendment A18 (25 Nov 2026): the sprout-on-a-page mark in the Grove Green
palette. It replaces the A17 indigo tile.

| File | What | Use on |
|---|---|---|
| `grovestudio-icon-light.svg` | icon only, 256×256, transparent | light backgrounds |
| `grovestudio-icon-dark.svg` | icon only, 256×256, transparent | dark backgrounds |
| `grovestudio-logo-light.svg` | icon + "GroveStudio" wordmark | light backgrounds |
| `grovestudio-logo-dark.svg` | icon + "GroveStudio" wordmark | dark backgrounds |
| `grovestudio-appicon.svg` | icon on Warm Off-White, 80% safe zone | home-screen / PWA icons |
| `og.svg` → `og.png` | 1200×630 social preview card | link previews (`og:image`) |

All of the SVGs above, `public/favicon.svg` and `src/components/brand.js` are
**generated** by `scripts/brand-gen.mjs` (the wordmark is Manrope ExtraBold
"Grove" + Manrope Medium "Studio", outlined). Then `scripts/brand-icons.sh`
rasterises `public/icons/*.png` and `og.png`:

```sh
npm i --no-save opentype.js @fontsource/manrope
node scripts/brand-gen.mjs && bash scripts/brand-icons.sh
```

## Palette

| Light | Hex | Dark | Hex |
|---|---|---|---|
| Deep Forest | `#0F4C3A` | Emerald Teal | `#1D7A62` |
| Sprout Green | `#2ECC71` | Vivid Green | `#34EB88` |
| Sage Green | `#82C99B` | Midnight | `#0A0F0D` |
| Warm Off-White | `#F7F9F6` | Forest Shadow | `#1E2D27` |

These are defined once, by name, in `src/styles/tokens.css` and mapped to role
tokens (`--acc`, `--bg`, `--surface`, `--link` …). Components use the roles.

Logo colours (light / dark): page outline Sage `#82C99B` / Emerald Teal `#1D7A62`;
sprout gradient `#1D7A62→#2ECC71` / `#2ECC71→#34EB88`; "Grove" Deep Forest
`#0F4C3A` / `#F7F9F6`; "Studio" `#0F4C3A` / `#DDE7E1`. In the app these come from
the `--brand-*` tokens, which nothing else may use: the logo carries identity,
never state.
