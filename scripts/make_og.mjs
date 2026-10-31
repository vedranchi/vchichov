#!/usr/bin/env node
// Render the site's brand images by hand after changing the name or the look: `npm run og`.
//
//   src/assets/og.png           the share image link previews show (1200×630)
//   public/favicon.svg          the tab icon: an ink "V" on an orange square
//   public/apple-touch-icon.png the same mark at 180×180, for home screens
//
// The results are committed, not built on Vercel, and checked by eye. Mona Sans comes from
// the same @fontsource package the site self-hosts.
//
// Text is drawn as outlines rather than set in a font: sharp's text rendering can't load a
// .woff2 or pick a weight or width out of a variable font, and on macOS it quietly falls
// back to a system sans. So fontTools turns each line into SVG path data at the right
// weight and width, and sharp only has to rasterise shapes. That needs Python with
// fontTools: `pip install fonttools brotli`, or point PYTHON at an interpreter that has it.

import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OG_OUT = join(root, 'src', 'assets', 'og.png');
const FAVICON_OUT = join(root, 'public', 'favicon.svg');
const TOUCH_OUT = join(root, 'public', 'apple-touch-icon.png');
const FONT = join(
  root,
  'node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-standard-normal.woff2',
);

// The site's tokens (src/styles/tokens.css), dark mode. Ink on orange, never the reverse.
const NIGHT = '#111214';
const CHALK = '#ececea';
const CHALK_SOFT = '#a2a4aa';
const ORANGE = '#d16c19';
const INK = '#111214';

// Glyph outlines for one line of text, as SVG path data with its origin at the left end of
// the baseline, plus the ink bounds. Tracking matches the site's display type (-0.025em at
// full width). No kerning: these strings are short enough not to need it.
const OUTLINE = `
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont

path, weight, width, size, track, text = sys.argv[1:7]
weight, width, size, track = int(weight), float(width), float(size), float(track)
font = instantiateVariableFont(TTFont(path), {"wght": weight, "wdth": width})
glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
scale = size / font["head"].unitsPerEm
spacing = track * size

pen, bounds, x = SVGPathPen(glyphs), BoundsPen(glyphs), 0.0
for ch in text:
    name = cmap[ord(ch)]
    m = (scale, 0, 0, -scale, x, 0)
    glyphs[name].draw(TransformPen(pen, m))
    glyphs[name].draw(TransformPen(bounds, m))
    x += hmtx[name][0] * scale + spacing
print(json.dumps({"d": pen.getCommands(), "width": x - spacing, "bounds": bounds.bounds}))
`;

function outline(text, { size, weight, width = 100, track = 0 }) {
  const out = execFileSync(process.env.PYTHON ?? 'python3', [
    '-I',
    '-c',
    OUTLINE,
    FONT,
    String(weight),
    String(width),
    String(size),
    String(track),
    text,
  ]);
  return JSON.parse(out.toString());
}

// --- share image ---------------------------------------------------------------------------
// The home page in miniature: the name in wide, heavy type on the left, and an orange tile
// on the right with ink words on it.

const W = 1200;
const H = 630;
const display = { weight: 850, width: 125, track: -0.035 };

const first = outline('Vedran', { size: 132, ...display });
const last = outline('Chichov', { size: 132, ...display });
const host = outline('vchichov.com', { size: 34, weight: 520 });
const tileLines = ['Writing,', 'projects,', 'racing.'].map((t) =>
  outline(t, { size: 46, weight: 780, width: 125, track: -0.02 }),
);

const tile = { x: 800, y: 70, w: 330, h: 490 };
const tileLineHeight = 52;
const tileText = tileLines
  .map((l, i) => {
    const y = tile.y + tile.h - 44 - (tileLines.length - 1 - i) * tileLineHeight;
    return `<path transform="translate(${tile.x + 36} ${y})" d="${l.d}" fill="${INK}"/>`;
  })
  .join('\n  ');

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${NIGHT}"/>
  <path transform="translate(70 215)" d="${first.d}" fill="${CHALK}"/>
  <path transform="translate(70 345)" d="${last.d}" fill="${CHALK}"/>
  <path transform="translate(74 ${H - 72})" d="${host.d}" fill="${CHALK_SOFT}"/>
  <rect x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="12" fill="${ORANGE}"/>
  ${tileText}
</svg>`;

const widest = Math.max(first.width, last.width);
if (70 + widest > tile.x - 30) {
  throw new Error(`The name is ${Math.round(widest)}px wide and runs into the tile.`);
}

await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(OG_OUT);
console.log(`Wrote ${W}×${H} share image to ${OG_OUT}`);

// --- favicon -------------------------------------------------------------------------------
// One "V", centred on its ink rather than its advance width, so it sits optically centred.

function mark(sizePx, radius) {
  const v = outline('V', { size: sizePx * 0.62, weight: 900, width: 125 });
  const [xMin, yMin, xMax, yMax] = v.bounds;
  const dx = (sizePx - (xMax - xMin)) / 2 - xMin;
  const dy = (sizePx - (yMax - yMin)) / 2 - yMin;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}">
  <rect width="${sizePx}" height="${sizePx}" rx="${radius}" fill="${ORANGE}"/>
  <path transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})" d="${v.d}" fill="${INK}"/>
</svg>
`;
}

writeFileSync(FAVICON_OUT, mark(64, 12));
console.log(`Wrote favicon to ${FAVICON_OUT}`);

// iOS rounds the corners itself and dislikes transparency, so this one is a full square.
await sharp(Buffer.from(mark(180, 0)))
  .png({ compressionLevel: 9 })
  .toFile(TOUCH_OUT);
console.log(`Wrote 180×180 touch icon to ${TOUCH_OUT}`);
