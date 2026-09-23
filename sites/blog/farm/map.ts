// The farm's layout. Built in code rather than drawn by hand because the field grows with
// the number of posts: one crop per post, six to a row, newest nearest the gate.

export const TILE = 16;
export const MAP_W = 22;
const PER_ROW = 6;

export type Ground = 'grass' | 'path' | 'soil' | 'water';

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  dateLabel: string;
  tags: string[];
}

export const SPECIES = ['wheat', 'tomatoes', 'pumpkin', 'sunflower'] as const;
export type Species = (typeof SPECIES)[number];
export type Stage = 0 | 1 | 2; // sprout, growing, ripe

export type Thing =
  | { kind: 'tree'; x: number; y: number }
  | { kind: 'house'; x: number; y: number; w: number; h: number; door: { x: number; y: number } }
  | { kind: 'fence'; x: number; y: number }
  | { kind: 'sign'; x: number; y: number }
  | { kind: 'crop'; x: number; y: number; post: Post; species: Species; stage: Stage };

export interface FarmMap {
  w: number;
  h: number;
  ground: Ground[];
  /** What stands on each tile, if anything. Everything that stands somewhere is solid. */
  things: (Thing | null)[];
  list: Thing[];
  spawn: { x: number; y: number };
}

/** A tag keeps its species wherever it appears, so a reader learns what a crop means. */
function speciesFor(post: Post): Species {
  const key = post.tags[0] ?? '';
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SPECIES[h % SPECIES.length];
}

/** Age since publishing, measured when the page runs, so crops keep growing between
 *  builds. A new post sprouts; within a month it is ripe and shows its species. */
function stageFor(post: Post, now: number): Stage {
  const days = (now - Date.parse(post.date)) / 86_400_000;
  return days < 7 ? 0 : days < 30 ? 1 : 2;
}

export function buildMap(posts: Post[], now = Date.now()): FarmMap {
  const rows = Math.max(2, Math.ceil(posts.length / PER_ROW));
  const w = MAP_W;
  // Fence runs from y=8 to 10 + 2*rows, with meadow below it — enough that the farm is
  // close to square rather than a wide strip.
  const fenceBottom = 10 + 2 * rows;
  const h = fenceBottom + 4;

  const ground: Ground[] = new Array(w * h).fill('grass');
  const things: (Thing | null)[] = new Array(w * h).fill(null);
  const list: Thing[] = [];
  const at = (x: number, y: number) => y * w + x;
  const setGround = (x: number, y: number, g: Ground) => (ground[at(x, y)] = g);
  const place = (t: Thing, tiles: [number, number][] = [[t.x, t.y]]) => {
    list.push(t);
    for (const [x, y] of tiles) things[at(x, y)] = t;
  };

  // The house, top left. Its door faces the path.
  const house = { kind: 'house' as const, x: 2, y: 1, w: 4, h: 3, door: { x: 3, y: 3 } };
  const houseTiles: [number, number][] = [];
  for (let y = house.y; y < house.y + house.h; y++)
    for (let x = house.x; x < house.x + house.w; x++) houseTiles.push([x, y]);
  place(house, houseTiles);

  // The path: down from the door, then east to the edge of the map, where the sign points on.
  for (let y = 4; y <= 6; y++) setGround(3, y, 'path');
  for (let x = 3; x < w; x++) setGround(x, 6, 'path');
  const gate = [13, 14];
  for (const x of gate) setGround(x, 7, 'path');
  place({ kind: 'sign', x: w - 2, y: 5 });

  // The field: a fenced plot with a gate at the top, tilled inside.
  const [left, right] = [9, 18];
  for (let x = left; x <= right; x++) {
    if (!gate.includes(x)) place({ kind: 'fence', x, y: 8 });
    place({ kind: 'fence', x, y: fenceBottom });
  }
  for (let y = 9; y < fenceBottom; y++) {
    place({ kind: 'fence', x: left, y });
    place({ kind: 'fence', x: right, y });
    for (let x = left + 1; x < right; x++) setGround(x, y, 'soil');
  }
  for (const x of gate) setGround(x, 8, 'path');

  // One crop per post, in rows with a walkway above and below each. Each row fills outward
  // from the gate, so the newest posts are the first thing through it.
  const columns = [13, 14, 12, 15, 11, 16];
  posts.forEach((post, i) => {
    const x = columns[i % PER_ROW];
    const y = 10 + 2 * Math.floor(i / PER_ROW);
    place({ kind: 'crop', x, y, post, species: speciesFor(post), stage: stageFor(post, now) });
  });

  // A pond, bottom left, with its corners rounded off.
  for (let y = 9; y <= 12; y++)
    for (let x = 2; x <= 6; x++) {
      const corner = (x === 2 || x === 6) && (y === 9 || y === 12);
      if (!corner) setGround(x, y, 'water');
    }

  // Trees: a loose border, and a few strays.
  // prettier-ignore
  const trees: [number, number][] = [
    [0, 0], [1, 0], [7, 0], [9, 0], [12, 0], [15, 0], [17, 0], [19, 0], [21, 0],
    [0, 2], [0, 4], [0, 8], [0, 11], [21, 2], [21, 3], [21, 9], [21, 12],
    [8, 2], [17, 3], [7, 12], [20, 10], [4, h - 3], [15, h - 2], [19, h - 3],
  ];
  for (let y = 14; y < h; y += 3) trees.push([0, y], [21, y]);
  for (let x = 2; x < w - 1; x += 4) trees.push([x, h - 1]);
  for (const [x, y] of trees)
    if (y < h && !things[at(x, y)] && ground[at(x, y)] === 'grass') place({ kind: 'tree', x, y });

  return { w, h, ground, things, list, spawn: { x: 3, y: 4 } };
}

export function isWalkable(map: FarmMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
  const i = y * map.w + x;
  return !map.things[i] && map.ground[i] !== 'water';
}

export function thingAt(map: FarmMap, x: number, y: number): Thing | null {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return null;
  return map.things[y * map.w + x];
}

/** Can the farmer look at this? Crops, the sign, and the house door. */
export function isInteractive(map: FarmMap, x: number, y: number): boolean {
  const t = thingAt(map, x, y);
  if (!t) return false;
  if (t.kind === 'house') return t.door.x === x && t.door.y === y;
  return t.kind === 'crop' || t.kind === 'sign';
}

/** Shortest walk (4-way BFS) from `from` to any tile in `goals`, excluding the start. */
export function findPath(
  map: FarmMap,
  from: { x: number; y: number },
  goals: { x: number; y: number }[],
): { x: number; y: number }[] | null {
  const key = (x: number, y: number) => y * map.w + x;
  const goalSet = new Set(goals.map((g) => key(g.x, g.y)));
  if (goalSet.has(key(from.x, from.y))) return [];
  const prev = new Map<number, number>([[key(from.x, from.y), -1]]);
  const queue = [key(from.x, from.y)];
  while (queue.length) {
    const cur = queue.shift()!;
    const [cx, cy] = [cur % map.w, Math.floor(cur / map.w)];
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const [nx, ny] = [cx + dx, cy + dy];
      const k = key(nx, ny);
      if (prev.has(k) || !isWalkable(map, nx, ny)) continue;
      prev.set(k, cur);
      if (goalSet.has(k)) {
        const path: { x: number; y: number }[] = [];
        for (let p = k; p !== key(from.x, from.y); p = prev.get(p)!)
          path.unshift({ x: p % map.w, y: Math.floor(p / map.w) });
        return path;
      }
      queue.push(k);
    }
  }
  return null;
}
