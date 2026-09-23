// Pixel art for the farm, drawn as character grids. Each character is one pixel and maps to
// a --farm-* token in styles/tokens.css; '.' is transparent. Grids are baked once per palette
// into small canvases, which the engine then stamps with drawImage.

export type Palette = Record<string, string>;

// Grid character -> CSS custom property.
const KEYS: Record<string, string> = {
  k: '--farm-ink',
  h: '--farm-gold',
  H: '--farm-gold-light',
  s: '--farm-skin',
  r: '--farm-hair',
  e: '--farm-ink',
  b: '--farm-shirt',
  p: '--farm-pants',
  g: '--farm-leaf',
  G: '--farm-leaf-dark',
  l: '--farm-leaf-light',
  y: '--farm-gold',
  Y: '--farm-gold-light',
  o: '--farm-orange',
  O: '--farm-orange-dark',
  t: '--farm-red',
  T: '--farm-red-dark',
  n: '--farm-wood',
  N: '--farm-wood-dark',
  w: '--farm-wood-light',
};

/** Every colour the farm uses, read from the live stylesheet. */
export function readPalette(root: HTMLElement = document.documentElement): Palette {
  const css = getComputedStyle(root);
  const read = (name: string) => css.getPropertyValue(name).trim();
  const names = [
    ...new Set([
      ...Object.values(KEYS),
      '--farm-grass',
      '--farm-grass-dark',
      '--farm-grass-light',
      '--farm-path',
      '--farm-path-dark',
      '--farm-soil',
      '--farm-soil-dark',
      '--farm-water',
      '--farm-water-dark',
      '--farm-water-light',
      '--farm-roof',
      '--farm-roof-dark',
      '--farm-wall',
      '--farm-cream',
      '--farm-night',
      '--farm-window',
    ]),
  ];
  return Object.fromEntries(names.map((n) => [n, read(n)]));
}

// --- the farmer ------------------------------------------------------------------------------
// 12 wide. Head and body are shared between frames; only the legs change when walking.

// prettier-ignore
const HAT = [
  '...kkkkkk...',
  '..khhhhhhk..',
  '.kkhhhhhhkk.',
  'khhhhhhhhhhk',
  '.kkkkkkkkkk.',
];
// prettier-ignore
const HAT_SIDE = [
  '....kkkkk...',
  '...khhhhhk..',
  '..kkhhhhhkk.',
  '.khhhhhhhhhk',
  '..kkkkkkkkk.',
];

const FRONT = [
  ...HAT,
  '.krrssssrrk.',
  '.ksessssesk.',
  '.kssssssssk.',
  '..kssssssk..',
  '.kbbbbbbbbk.',
  'ksbbbbbbbbsk',
  'kskbbbbbbksk',
  '.kkppppppkk.',
];
const BACK = [
  ...HAT,
  '.krrrrrrrrk.',
  '.krrrrrrrrk.',
  '.krrrrrrrrk.',
  '..krrrrrrk..',
  '.kbbbbbbbbk.',
  'ksbbbbbbbbsk',
  'kskbbbbbbksk',
  '.kkppppppkk.',
];
const SIDE = [
  ...HAT_SIDE,
  '..krrrsssk..',
  '..krrsssesk.',
  '..krsssssk..',
  '...kssssk...',
  '..kbbbbbbk..',
  '..kbbbbsbk..',
  '..kbbbbbbk..',
  '..kppppppk..',
];

// prettier-ignore
const LEGS = {
  stand: ['..kppkkppk..', '..kppkkppk..', '..kkk..kkk..'],
  stepA: ['..kppkkppk..', '..kppk.kkk..', '..kkk.......'],
  stepB: ['..kppkkppk..', '..kkk.kppk..', '.......kkk..'],
  sideStand: ['...kppppk...', '...kppppk...', '...kkkkk....'],
  sideStep: ['..kppkppk...', '.kppk.kppk..', '.kkk...kkk..'],
};

export type Facing = 'down' | 'up' | 'left' | 'right';

/** Grid for the farmer facing `dir` on walk frame 0 (standing), 1 or 2. Left is mirrored. */
export function farmerGrid(dir: Facing, frame: 0 | 1 | 2): { grid: string[]; flip: boolean } {
  if (dir === 'left' || dir === 'right') {
    const legs = frame === 1 ? LEGS.sideStep : LEGS.sideStand;
    return { grid: [...SIDE, ...legs], flip: dir === 'left' };
  }
  const legs = frame === 1 ? LEGS.stepA : frame === 2 ? LEGS.stepB : LEGS.stand;
  return { grid: [...(dir === 'up' ? BACK : FRONT), ...legs], flip: false };
}

// --- crops -----------------------------------------------------------------------------------

// prettier-ignore
export const SPROUT = [
  '.l....l.',
  'lgl..lgl',
  '.lgllgl.',
  '..lggl..',
  '...gg...',
  '...GG...',
];

export const GROWING = [
  '....l.....',
  '...lgl....',
  'l..lgl..l.',
  'gl.lgl.lg.',
  '.glggglg..',
  '..gggGg...',
  '.lggGGgl..',
  'lg.gGg.gl.',
  '...gGg....',
  '....G.....',
  '....G.....',
];

export const RIPE: Record<string, string[]> = {
  wheat: [
    '..Y...Y...',
    '.YyY.YyY..',
    '.yYy.yYy.Y',
    '.YyY.YyYYy',
    '..y.Y.y.yY',
    '..y.YyYy.y',
    '..y.yYy..y',
    '..g..y..g.',
    '..g..g..g.',
    '..gg.g.gg.',
    '...g.g.g..',
    '...ggggg..',
    '....ggg...',
    '.....G....',
  ],
  tomatoes: [
    '....ll....',
    '..llggl...',
    '.lggtgggl.',
    '.gtTggtgg.',
    'lggggtTgl.',
    '.gtggggGg.',
    '.gTtgGtgg.',
    '..ggGgTg..',
    '..lgtggl..',
    '...gGGg...',
    '....nG....',
    '....n.....',
    '....n.....',
    '....n.....',
  ],
  pumpkin: [
    '....gl......',
    '...glgl..l..',
    '..lgggl.lgl.',
    '.....nG.gg..',
    '..kkkkkkkk..',
    '.kooOooOook.',
    'koooOooOoook',
    'koooOooOoook',
    '.kooOooOook.',
    '..kkkkkkkk..',
  ],
  sunflower: [
    '...YYYY...',
    '..YyyyyY..',
    '.YyNNNNyY.',
    '.YyNnnNyY.',
    '.YyNnnNyY.',
    '.YyNNNNyY.',
    '..YyyyyY..',
    '...YYYY...',
    '....g.....',
    '..lgg.....',
    '.lgGg.gl..',
    '....g.ggl.',
    '....gGg...',
    '....g.....',
    '....G.....',
    '....G.....',
  ],
};

// --- scenery ---------------------------------------------------------------------------------

export const TREE = [
  '......kkkk......',
  '....kkllllkk....',
  '...kllllgglgk...',
  '..klllggggglgk..',
  '.kllgggggggggGk.',
  '.klgggglggggGGk.',
  'kllggglllgggGGGk',
  'klgggggllggggGGk',
  'kggggggggggggGGk',
  'klggglggggggGGGk',
  '.kgggllgggggGGk.',
  '.kGgggggggGGGGk.',
  '..kGGgggGGGGGk..',
  '...kkGGGGGGkk...',
  '.....kkNnkk.....',
  '......kNnk......',
  '......kNnk......',
  '......kNnk......',
  '.....kNNnnk.....',
  '....kkkkkkkk....',
];

export const SIGN = [
  '................',
  '.kkkkkkkkkkk....',
  '.kwwwwwwwwwwk...',
  '.kwNNwNwNNwwwk..',
  '.kwwwwwwwwwwwwk.',
  '.kwNwNNwNwwwk...',
  '.kwwwwwwwwwwk...',
  '.kkkkkkkkkkk....',
  '....knk.........',
  '....knk.........',
  '....knk.........',
  '....knk.........',
  '....knk.........',
  '....knk.........',
  '...kknkk........',
  '................',
];

/** Bake a grid into a canvas using the palette. Throws on a ragged grid or unknown key. */
export function bake(grid: string[], palette: Palette, flip = false): HTMLCanvasElement {
  const w = grid[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = grid.length;
  const ctx = canvas.getContext('2d')!;
  grid.forEach((row, y) => {
    if (row.length !== w) throw new Error(`sprite row ${y} is ${row.length} wide, not ${w}`);
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const key = KEYS[ch];
      if (!key) throw new Error(`unknown sprite key "${ch}"`);
      ctx.fillStyle = palette[key];
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    });
  });
  return canvas;
}
