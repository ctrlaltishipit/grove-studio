#!/usr/bin/env bash
# Rasterise the brand SVGs into the PNGs that browsers and phones need.
# Run after scripts/brand-gen.mjs. Needs rsvg-convert (brew install librsvg).
# Amendment A18 (25 Nov 2026): sprout-on-a-page mark, green palette.
set -euo pipefail
cd "$(dirname "$0")/.."

APP=public/brand/grovestudio-appicon.svg   # icon on Warm Off-White, 80% safe zone
ICON=public/brand/grovestudio-icon-light.svg
OUT=public/icons
mkdir -p "$OUT"

# Favicon fallback for browsers that do not take an SVG tab icon (Safari):
# transparent, so it sits on any tab colour.
rsvg-convert -w 32 -h 32 "$ICON" -o "$OUT/favicon-32.png"

# Home-screen icons: opaque, because iOS paints transparency black and
# Android masks the outer 20% away.
rsvg-convert -w 180 -h 180 "$APP" -o "$OUT/apple-touch-icon.png"
rsvg-convert -w 192 -h 192 "$APP" -o "$OUT/icon-192.png"
rsvg-convert -w 512 -h 512 "$APP" -o "$OUT/icon-512.png"
rsvg-convert -w 512 -h 512 "$APP" -o "$OUT/icon-512-maskable.png"

# Social preview card.
rsvg-convert -w 1200 -h 630 public/brand/og.svg -o public/brand/og.png

ls -la "$OUT" public/brand/og.png
