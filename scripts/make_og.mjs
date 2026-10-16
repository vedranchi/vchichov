#!/usr/bin/env node
// Render the portfolio's share image (the picture link previews show) to
// src/assets/og.png. Run it by hand after changing the name or role: `npm run og`.
//
// The result is committed, not built on Vercel, and checked by eye. Montserrat comes from
// the same @fontsource package the site self-hosts.
//
// Text is drawn as outlines rather than set in a font: sharp's text rendering can't load a
// .woff2 or pick a weight out of a variable font, and on macOS it quietly falls back to a
// system sans. So fontTools turns each line into SVG path data at the right weight, and
// sharp only has to rasterise shapes. That needs Python with fontTools:
// `pip install fonttools brotli`, or point PYTHON at an interpreter that has it.

import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src', 'assets', 'og.png');
const FONT = join(
  root,
  'node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2',
);

// The portfolio's tokens (sites/www/styles/tokens.css), dark mode.
const ESPRESSO = '#292016';
const ORANGE = '#d16c19';
const BONE = '#e2e2e2';
const BONE_DIM = '#b3a99b';
const EDGE = '#000000';

const W = 1200;
const H = 630;

// Glyph outlines for one line of text, as SVG path data with its origin at the left end
// of the baseline. Tracking matches the site's headings (-0.025em). No kerning: these
// strings are short enough not to need it.
const OUTLINE = `
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont

path, weight, size, text = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
font = instantiateVariableFont(TTFont(path), {"wght": weight})
glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
scale = size / font["head"].unitsPerEm
track = -0.025 * size

pen, x = SVGPathPen(glyphs), 0.0
for ch in text:
    name = cmap[ord(ch)]
    glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
    x += hmtx[name][0] * scale + track
print(json.dumps({"d": pen.getCommands(), "width": x - track}))
`;

function outline(text, size, weight) {
  const out = execFileSync(process.env.PYTHON ?? 'python3', [
    '-I',
    '-c',
    OUTLINE,
    FONT,
    String(weight),
    String(size),
    text,
  ]);
  return JSON.parse(out.toString());
}

const NAME_SIZE = 96;
const name = outline('Vedran Chichov', NAME_SIZE, 700);
const role = outline('Developer', 54, 500);
const host = outline('vchichov.com', 34, 600);

// The orange slab hugs the name: black on orange, never the other way round. Centred on
// the cap height (~0.7em in Montserrat) rather than the em box, so it looks centred.
const padX = 52;
const padY = 44;
const capHeight = 0.7 * NAME_SIZE;
const slab = {
  x: 80,
  y: 150,
  w: Math.round(name.width + padX * 2),
  h: Math.round(capHeight + padY * 2),
};

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${ESPRESSO}"/>
  <rect x="${slab.x + 10}" y="${slab.y + 10}" width="${slab.w}" height="${slab.h}" rx="14" fill="${EDGE}"/>
  <rect x="${slab.x}" y="${slab.y}" width="${slab.w}" height="${slab.h}" rx="14"
        fill="${ORANGE}" stroke="${EDGE}" stroke-width="5"/>
  <path transform="translate(${slab.x + padX} ${slab.y + padY + capHeight})" d="${name.d}" fill="${EDGE}"/>
  <path transform="translate(${slab.x + 4} ${slab.y + slab.h + 90})" d="${role.d}" fill="${BONE}"/>
  <path transform="translate(${slab.x + 4} ${H - 80})" d="${host.d}" fill="${BONE_DIM}"/>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`Wrote ${W}×${H} share image to ${OUT}`);
