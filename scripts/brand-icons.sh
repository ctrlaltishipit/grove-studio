#!/usr/bin/env bash
# Rasterise the brand SVGs into the PNGs that browsers and phones need.
# Run after changing anything in public/brand/. Needs rsvg-convert
# (brew install librsvg). Amendment A17.
set -euo pipefail
cd "$(dirname "$0")/.."

ICON=public/brand/grovestudio-icon-light.svg
OUT=public/icons
mkdir -p "$OUT"

# Favicon fallbacks for browsers that do not take an SVG tab icon (Safari).
rsvg-convert -w 32  -h 32  "$ICON" -o "$OUT/favicon-32.png"
rsvg-convert -w 180 -h 180 "$ICON" -o "$OUT/apple-touch-icon.png"

# Home-screen icons for the web manifest.
rsvg-convert -w 192 -h 192 "$ICON" -o "$OUT/icon-192.png"
rsvg-convert -w 512 -h 512 "$ICON" -o "$OUT/icon-512.png"

# Maskable: the tile sits in the central 80% so Android's shape masks keep
# the branch intact. Background is the tile's own gradient start so nothing
# shows at the corners.
MASK=$(mktemp -t grove-mask).svg
cat > "$MASK" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 640 640" width="640" height="640">
  <rect width="640" height="640" fill="#5F5FDC"/>
  <image href="grovestudio-icon-light.svg" x="64" y="64" width="512" height="512"/>
</svg>
SVG
cp "$MASK" public/brand/.maskable.svg
rsvg-convert -w 512 -h 512 public/brand/.maskable.svg -o "$OUT/icon-512-maskable.png"
rm -f public/brand/.maskable.svg "$MASK"

# Social preview card.
rsvg-convert -w 1200 -h 630 public/brand/og.svg -o public/brand/og.png

ls -la "$OUT" public/brand/og.png
