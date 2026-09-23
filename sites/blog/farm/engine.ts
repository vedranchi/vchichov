// The farm's engine: state, movement and drawing. It knows nothing about the page around it;
// main.ts wires it to the DOM and input.ts feeds it keys and taps.

import {
  TILE,
  findPath,
  isInteractive,
  isWalkable,
  thingAt,
  type FarmMap,
  type Thing,
} from './map';
import {
  GROWING,
  RIPE,
  SIGN,
  SPROUT,
  TREE,
  bake,
  farmerGrid,
  type Facing,
  type Palette,
} from './sprites';

const STEP: Record<Facing, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const TILES_PER_SECOND = 4;
// Under reduced motion the farmer jumps tile to tile; this paces those jumps.
const SNAP_STEP_MS = 130;

interface Options {
  reducedMotion: boolean;
  /** The interactive thing in front of the farmer changed (null when there is none). */
  onFacing: (thing: Thing | null) => void;
  onInteract: (thing: Thing) => void;
}

// Deterministic per-tile noise, so the grass doesn't reshuffle on every redraw.
function noise(x: number, y: number, i: number): number {
  let h = (x * 374761393 + y * 668265263 + i * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class FarmEngine {
  private ctx: CanvasRenderingContext2D;
  private palette: Palette = {};
  private sprites = new Map<string, HTMLCanvasElement>();
  private groundLayer: HTMLCanvasElement | null = null;
  private night = false;
  private scale = 2;

  // The farmer moves freely rather than tile by tile, so every key answers on the next
  // frame — turning a corner mid-stride included. `pos` is the top-left of their tile-sized
  // body in map pixels. When they stop they always settle on a whole tile, so there is
  // always a clear tile in front of them to look at.
  private pos: { x: number; y: number };
  private moveDir: Facing | null = null;
  private travelled = 0;
  private facing: Facing = 'down';
  private held: Facing[] = [];
  // A press not yet acted on. A key can go down and up between two frames; without this,
  // that tap would never move the farmer at all.
  private queued: Facing | null = null;
  // Enter pressed while moving: look as soon as the farmer stops.
  private wantsInteract = false;
  private route: { x: number; y: number }[] = [];
  private pending: { x: number; y: number } | null = null;
  private snapWait = 0;

  private lastFacing: Thing | null = null;
  private frameId = 0;
  private lastTime = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private map: FarmMap,
    private opts: Options,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.pos = { x: map.spawn.x * TILE, y: map.spawn.y * TILE };
  }

  /** The tile the farmer is on, or nearest to while moving. */
  private get tile() {
    return { x: Math.round(this.pos.x / TILE), y: Math.round(this.pos.y / TILE) };
  }

  private get aligned() {
    return this.pos.x % TILE === 0 && this.pos.y % TILE === 0;
  }

  /** Anything left to do: a key down, a route to walk, or a step to finish. */
  private get busy() {
    if (this.opts.reducedMotion) return !!(this.held.length || this.queued || this.route.length);
    return this.held.length > 0 || !!this.queued || this.route.length > 0 || !this.aligned;
  }

  // --- setup -------------------------------------------------------------------------------

  setPalette(palette: Palette) {
    this.palette = palette;
    this.sprites.clear();
    this.groundLayer = this.drawGround();
    this.render();
  }

  setNight(night: boolean) {
    this.night = night;
    this.render();
  }

  /** Fit the view to the space available: an integer scale, and a camera if it is too big. */
  resize(availableWidth: number, availableHeight: number) {
    const full = { w: this.map.w * TILE, h: this.map.h * TILE };
    this.scale = Math.max(2, Math.min(3, Math.floor(availableWidth / full.w)));
    this.canvas.width = Math.min(full.w, Math.floor(availableWidth / this.scale));
    this.canvas.height = Math.min(full.h, Math.floor(availableHeight / this.scale));
    this.canvas.style.width = `${this.canvas.width * this.scale}px`;
    this.canvas.style.height = `${this.canvas.height * this.scale}px`;
    this.render();
  }

  // --- input ---------------------------------------------------------------------------------

  press(dir: Facing) {
    this.held = [...this.held.filter((d) => d !== dir), dir];
    this.route = [];
    this.pending = null;
    this.wantsInteract = false;
    this.queued = dir;
    this.start();
  }

  release(dir: Facing) {
    this.held = this.held.filter((d) => d !== dir);
  }

  releaseAll() {
    this.held = [];
    this.queued = null;
  }

  /** Look at whatever is in front of the farmer — or, mid-stride, as soon as they stop. */
  interact() {
    if (!this.aligned || this.route.length) {
      this.wantsInteract = true;
      return;
    }
    const [dx, dy] = STEP[this.facing];
    const [x, y] = [this.tile.x + dx, this.tile.y + dy];
    if (isInteractive(this.map, x, y)) this.opts.onInteract(thingAt(this.map, x, y)!);
  }

  /** The tile under a pointer event, in map coordinates. */
  tileAt(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const cam = this.camera();
    return {
      // clientLeft/Top are the border widths: the drawing starts inside the border.
      x: Math.floor(((clientX - rect.left - this.canvas.clientLeft) / this.scale + cam.x) / TILE),
      y: Math.floor(((clientY - rect.top - this.canvas.clientTop) / this.scale + cam.y) / TILE),
    };
  }

  /** Walk to a tile; if it holds something to look at, walk up to it and look. */
  walkTo(target: { x: number; y: number }) {
    this.held = [];
    this.queued = null;
    this.wantsInteract = false;
    let goals = [target];
    let pending: { x: number; y: number } | null = null;
    if (isInteractive(this.map, target.x, target.y)) {
      goals = Object.values(STEP)
        .map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy }))
        .filter((t) => isWalkable(this.map, t.x, t.y));
      pending = target;
    } else if (!isWalkable(this.map, target.x, target.y)) {
      return;
    }
    const from = this.tile;
    const path = findPath(this.map, from, goals);
    if (!path) return;
    // Mid-stride, first settle onto the nearest tile, then follow the path from there.
    this.route = this.aligned ? path : [from, ...path];
    this.pending = pending;
    this.start();
  }

  // --- movement ------------------------------------------------------------------------------

  private update(ms: number) {
    if (this.opts.reducedMotion) this.jump(ms);
    else {
      const budget = (ms / 1000) * TILES_PER_SECOND * TILE;
      const want = this.held.at(-1) ?? this.queued;
      this.queued = null;
      if (want) this.walk(want, budget);
      else if (this.route.length) this.followRoute(budget);
      else if (!this.aligned) this.glide(budget);
    }
    if (!this.busy) this.settle();
    else if (this.aligned && this.held.length) this.afterMove();
  }

  /** Walk in `dir` for `budget` pixels. The other axis is eased into the nearest lane at
   *  the same time, so a turn mid-stride lands the farmer in line with the tiles. */
  private walk(dir: Facing, budget: number) {
    this.facing = dir;
    this.moveDir = dir;
    const [dx, dy] = STEP[dir];
    const [axis, other] = dx ? (['x', 'y'] as const) : (['y', 'x'] as const);
    const sign = dx || dy;

    const lane = Math.round(this.pos[other] / TILE) * TILE;
    const ease = Math.max(-budget, Math.min(budget, lane - this.pos[other]));
    this.pos[other] += ease;

    // Stop flush against anything solid in the lane ahead.
    const laneTile = lane / TILE;
    let next = this.pos[axis] + sign * budget;
    const lead = sign > 0 ? Math.ceil(next / TILE) : Math.floor(next / TILE);
    const open =
      axis === 'x' ? isWalkable(this.map, lead, laneTile) : isWalkable(this.map, laneTile, lead);
    if (!open)
      next = sign > 0 ? Math.min(next, (lead - 1) * TILE) : Math.max(next, (lead + 1) * TILE);
    this.travelled += Math.abs(next - this.pos[axis]) + Math.abs(ease);
    this.pos[axis] = next;
  }

  /** Key released mid-stride: carry on to the next whole tile, so a tap is one step. */
  private glide(budget: number) {
    const dir = this.moveDir ?? this.facing;
    const [dx, dy] = STEP[dir];
    const [axis, other] = dx ? (['x', 'y'] as const) : (['y', 'x'] as const);
    const sign = dx || dy;
    const stop = (sign > 0 ? Math.ceil : Math.floor)(this.pos[axis] / TILE) * TILE;
    const lane = Math.round(this.pos[other] / TILE) * TILE;
    const move = Math.min(budget, Math.abs(stop - this.pos[axis]));
    const ease = Math.max(-budget, Math.min(budget, lane - this.pos[other]));
    this.pos[axis] += sign * move;
    this.pos[other] += ease;
    this.travelled += move + Math.abs(ease);
  }

  /** Tap-to-walk: tile to tile along the path, one axis at a time. */
  private followRoute(budget: number) {
    while (budget > 0 && this.route.length) {
      const target = { x: this.route[0].x * TILE, y: this.route[0].y * TILE };
      const dx = target.x - this.pos.x;
      const dy = target.y - this.pos.y;
      if (!dx && !dy) {
        this.route.shift();
        continue;
      }
      // Off both axes only when settling mid-stride; straighten the smaller one first.
      const alongX = dy === 0 || (dx !== 0 && Math.abs(dx) < Math.abs(dy));
      const d = alongX ? dx : dy;
      const move = Math.min(budget, Math.abs(d));
      if (alongX) this.pos.x += Math.sign(d) * move;
      else this.pos.y += Math.sign(d) * move;
      this.facing = alongX ? (d > 0 ? 'right' : 'left') : d > 0 ? 'down' : 'up';
      this.moveDir = this.facing;
      this.travelled += move;
      budget -= move;
    }
  }

  /** Reduced motion: no gliding — the farmer jumps a whole tile at a steady pace. */
  private jump(ms: number) {
    this.snapWait -= ms;
    if (this.snapWait > 0) return;
    const next = this.route.shift();
    if (next) {
      const from = this.tile;
      this.facing =
        next.x > from.x ? 'right' : next.x < from.x ? 'left' : next.y > from.y ? 'down' : 'up';
      this.pos = { x: next.x * TILE, y: next.y * TILE };
      this.snapWait = SNAP_STEP_MS;
      return;
    }
    const dir = this.held.at(-1) ?? this.queued;
    this.queued = null;
    if (!dir) return;
    this.facing = dir;
    const [dx, dy] = STEP[dir];
    const to = { x: this.tile.x + dx, y: this.tile.y + dy };
    if (isWalkable(this.map, to.x, to.y)) this.pos = { x: to.x * TILE, y: to.y * TILE };
    this.snapWait = SNAP_STEP_MS;
  }

  /** Standing still on a whole tile: look where a tap asked to, or at a pending Enter. */
  private settle() {
    this.moveDir = null;
    if (this.pending) {
      const target = this.pending;
      this.pending = null;
      const dir = (Object.keys(STEP) as Facing[]).find(
        (d) => this.tile.x + STEP[d][0] === target.x && this.tile.y + STEP[d][1] === target.y,
      );
      if (dir) {
        this.facing = dir;
        this.wantsInteract = true;
      }
    }
    this.afterMove();
    if (this.wantsInteract) {
      this.wantsInteract = false;
      this.interact();
    }
  }

  private afterMove() {
    const [dx, dy] = STEP[this.facing];
    const [x, y] = [this.tile.x + dx, this.tile.y + dy];
    const thing = isInteractive(this.map, x, y) ? thingAt(this.map, x, y) : null;
    if (thing !== this.lastFacing) {
      this.lastFacing = thing;
      this.opts.onFacing(thing);
    }
  }

  private start() {
    if (this.frameId) return;
    this.lastTime = 0;
    this.snapWait = 0;
    const tick = (now: number) => {
      // The first frame gets one frame's worth of time. Timing it from when the key went
      // down doesn't work: a frame's timestamp is when the frame *began*, which can be
      // earlier than the keypress that started the loop — a negative step that walked the
      // farmer backwards and swallowed the press. Later steps are capped so a backgrounded
      // tab doesn't teleport the farmer on return.
      const ms = this.lastTime ? Math.min(Math.max(now - this.lastTime, 0), 50) : 1000 / 60;
      this.update(ms);
      this.lastTime = now;
      if (this.busy) {
        this.render();
        this.frameId = requestAnimationFrame(tick);
      } else {
        this.frameId = 0;
        this.travelled = 0;
        this.render();
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  // --- drawing -------------------------------------------------------------------------------

  private sprite(key: string, grid: string[], flip = false): HTMLCanvasElement {
    const id = `${key}${flip ? ':flip' : ''}`;
    let c = this.sprites.get(id);
    if (!c) this.sprites.set(id, (c = bake(grid, this.palette, flip)));
    return c;
  }

  private farmerPos() {
    return { x: Math.round(this.pos.x), y: Math.round(this.pos.y) };
  }

  private camera() {
    const p = this.farmerPos();
    const maxX = this.map.w * TILE - this.canvas.width;
    const maxY = this.map.h * TILE - this.canvas.height;
    return {
      x: Math.round(Math.max(0, Math.min(maxX, p.x + TILE / 2 - this.canvas.width / 2))),
      y: Math.round(Math.max(0, Math.min(maxY, p.y + TILE / 2 - this.canvas.height / 2))),
    };
  }

  /** The ground and fences never move, so they are drawn once onto their own canvas. */
  private drawGround(): HTMLCanvasElement {
    const { map, palette: c } = this;
    const layer = document.createElement('canvas');
    layer.width = map.w * TILE;
    layer.height = map.h * TILE;
    const g = layer.getContext('2d')!;
    const px = (color: string, x: number, y: number, w = 1, h = 1) => {
      g.fillStyle = c[color];
      g.fillRect(x, y, w, h);
    };
    const groundAt = (x: number, y: number) =>
      x < 0 || y < 0 || x >= map.w || y >= map.h ? 'grass' : map.ground[y * map.w + x];

    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const [ox, oy] = [tx * TILE, ty * TILE];
        const kind = map.ground[ty * map.w + tx];
        if (kind === 'grass') {
          px('--farm-grass', ox, oy, TILE, TILE);
          for (let i = 0; i < 7; i++) {
            const [bx, by] = [
              Math.floor(noise(tx, ty, i) * 15),
              Math.floor(noise(tx, ty, i + 9) * 14),
            ];
            px(i < 5 ? '--farm-grass-dark' : '--farm-grass-light', ox + bx, oy + by, 1, 2);
          }
          if (noise(tx, ty, 40) < 0.07) {
            for (let i = 0; i < 3; i++) {
              const [fx, fy] = [
                2 + Math.floor(noise(tx, ty, 50 + i) * 11),
                2 + Math.floor(noise(tx, ty, 60 + i) * 11),
              ];
              const petal = i % 2 ? '--farm-cream' : '--farm-gold-light';
              px(petal, ox + fx - 1, oy + fy, 3, 1);
              px(petal, ox + fx, oy + fy - 1, 1, 3);
              px('--farm-gold', ox + fx, oy + fy);
            }
          }
        } else if (kind === 'path') {
          px('--farm-path', ox, oy, TILE, TILE);
          for (let i = 0; i < 4; i++)
            px(
              '--farm-path-dark',
              ox + Math.floor(noise(tx, ty, i) * 14),
              oy + Math.floor(noise(tx, ty, i + 5) * 14),
              2,
              1,
            );
          // A ragged grass edge where the path meets the meadow.
          for (let i = 0; i < 16; i += 2) {
            if (groundAt(tx, ty - 1) === 'grass' && noise(tx, ty, 80 + i) < 0.6)
              px('--farm-grass', ox + i, oy, 2, 1);
            if (groundAt(tx, ty + 1) === 'grass' && noise(tx, ty, 90 + i) < 0.6)
              px('--farm-grass', ox + i, oy + 15, 2, 1);
          }
        } else if (kind === 'soil') {
          px('--farm-soil', ox, oy, TILE, TILE);
          for (let fy = 2; fy < TILE; fy += 4) px('--farm-soil-dark', ox + 1, oy + fy, 14, 1);
        } else {
          px('--farm-water', ox, oy, TILE, TILE);
          for (let i = 0; i < 2; i++)
            px(
              '--farm-water-light',
              ox + 2 + Math.floor(noise(tx, ty, i) * 9),
              oy + 3 + Math.floor(noise(tx, ty, i + 3) * 10),
              4,
              1,
            );
          // Shore: a dark lip on every side that meets land.
          if (groundAt(tx, ty - 1) !== 'water') px('--farm-water-dark', ox, oy, TILE, 2);
          if (groundAt(tx, ty + 1) !== 'water') px('--farm-water-dark', ox, oy + 14, TILE, 2);
          if (groundAt(tx - 1, ty) !== 'water') px('--farm-water-dark', ox, oy, 2, TILE);
          if (groundAt(tx + 1, ty) !== 'water') px('--farm-water-dark', ox + 14, oy, 2, TILE);
        }
      }
    }

    // Fences: a post per tile, with rails reaching towards fenced neighbours.
    const fenceAt = (x: number, y: number) => thingAt(map, x, y)?.kind === 'fence';
    for (const t of map.list) {
      if (t.kind !== 'fence') continue;
      const [ox, oy] = [t.x * TILE, t.y * TILE];
      if (fenceAt(t.x - 1, t.y)) {
        px('--farm-wood-light', ox, oy + 6, 7, 2);
        px('--farm-wood-light', ox, oy + 10, 7, 2);
      }
      if (fenceAt(t.x + 1, t.y)) {
        px('--farm-wood-light', ox + 9, oy + 6, 7, 2);
        px('--farm-wood-light', ox + 9, oy + 10, 7, 2);
      }
      if (fenceAt(t.x, t.y - 1)) px('--farm-wood-light', ox + 7, oy, 2, 4);
      if (fenceAt(t.x, t.y + 1)) px('--farm-wood-light', ox + 7, oy + 13, 2, 3);
      px('--farm-ink', ox + 5, oy + 3, 6, 11);
      px('--farm-wood', ox + 6, oy + 4, 4, 9);
      px('--farm-wood-light', ox + 6, oy + 4, 4, 1);
    }
    return layer;
  }

  private drawHouse(g: CanvasRenderingContext2D, t: Extract<Thing, { kind: 'house' }>) {
    const c = this.palette;
    const px = (color: string, x: number, y: number, w = 1, h = 1) => {
      g.fillStyle = c[color];
      g.fillRect(x, y, w, h);
    };
    const x0 = t.x * TILE;
    const bottom = (t.y + t.h) * TILE;
    const [wallL, wallR, wallTop] = [x0 + 4, x0 + t.w * TILE - 4, bottom - 26];

    // chimney, behind the roof
    px('--farm-ink', x0 + 44, bottom - 58, 10, 20);
    px('--farm-roof-dark', x0 + 45, bottom - 57, 8, 19);

    // walls
    px('--farm-ink', wallL - 1, wallTop, wallR - wallL + 2, bottom - wallTop);
    px('--farm-wall', wallL, wallTop, wallR - wallL, bottom - wallTop - 1);
    for (let y = wallTop + 4; y < bottom - 1; y += 5)
      px('--farm-wood-light', wallL, y, wallR - wallL, 1);

    // roof: a gable, one pixel in per row, over a two-row eave
    const [roofTop, eave] = [bottom - 50, bottom - 24];
    const mid = x0 + (t.w * TILE) / 2;
    for (let y = roofTop; y < eave; y++) {
      const half = Math.min(t.w * 8 + 3, 8 + (y - roofTop));
      px('--farm-ink', mid - half - 1, y, half * 2 + 2, 1);
      px((y - roofTop) % 4 === 3 ? '--farm-roof-dark' : '--farm-roof', mid - half, y, half * 2, 1);
    }
    px('--farm-ink', x0 - 1, eave, t.w * TILE + 2, 2);

    // door — on the door tile, facing the path
    const doorX = t.door.x * TILE + 3;
    px('--farm-ink', doorX - 1, bottom - 17, 12, 17);
    px('--farm-wood', doorX, bottom - 16, 10, 16);
    px('--farm-wood-dark', doorX + 4, bottom - 16, 2, 16);
    px('--farm-gold', doorX + 8, bottom - 9);

    // windows — sky by day; lit later, after the night wash, so they glow
    for (const w of this.windows(t)) {
      px('--farm-ink', w.x - 1, w.y - 1, w.w + 2, w.h + 2);
      px('--farm-water-light', w.x, w.y, w.w, w.h);
      px('--farm-cream', w.x, w.y, 2, 2);
      px('--farm-ink', w.x + Math.floor(w.w / 2), w.y, 1, w.h);
    }
  }

  private windows(t: Extract<Thing, { kind: 'house' }>) {
    const bottom = (t.y + t.h) * TILE;
    const x0 = t.x * TILE;
    return [
      { x: x0 + 8, y: bottom - 19, w: 9, h: 8 },
      { x: x0 + 40, y: bottom - 19, w: 13, h: 8 },
    ];
  }

  render() {
    if (!this.groundLayer) return;
    const g = this.ctx;
    const cam = this.camera();
    g.save();
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.translate(-cam.x, -cam.y);
    g.drawImage(this.groundLayer, 0, 0);

    // Everything that stands up is drawn back to front, so a tree hides the farmer's head
    // when they walk behind it.
    const farmer = this.farmerPos();
    const drawables: { base: number; draw: () => void }[] = [];
    for (const t of this.map.list) {
      if (t.kind === 'fence') continue;
      const [ox, oy] = [t.x * TILE, t.y * TILE];
      if (t.kind === 'tree') {
        drawables.push({
          base: oy + TILE,
          draw: () => g.drawImage(this.sprite('tree', TREE), ox, oy + TILE - TREE.length),
        });
      } else if (t.kind === 'sign') {
        drawables.push({
          base: oy + TILE,
          draw: () => g.drawImage(this.sprite('sign', SIGN), ox, oy),
        });
      } else if (t.kind === 'house') {
        drawables.push({ base: (t.y + t.h) * TILE, draw: () => this.drawHouse(g, t) });
      } else {
        const [key, grid] =
          t.stage === 0
            ? ['sprout', SPROUT]
            : t.stage === 1
              ? ['growing', GROWING]
              : [t.species, RIPE[t.species]];
        const img = this.sprite(key, grid);
        drawables.push({
          base: oy + TILE - 1,
          draw: () =>
            g.drawImage(img, ox + Math.floor((TILE - img.width) / 2), oy + TILE - 1 - img.height),
        });
      }
    }
    drawables.push({
      base: farmer.y + TILE,
      draw: () => {
        const moving = this.moveDir !== null && !this.opts.reducedMotion;
        const step = Math.floor(this.travelled / 8) % 2;
        const frame = (!moving ? 0 : step ? 1 : 2) as 0 | 1 | 2;
        const { grid, flip } = farmerGrid(this.facing, frame);
        g.fillStyle = this.palette['--farm-ink'];
        g.globalAlpha = 0.25;
        g.fillRect(farmer.x + 4, farmer.y + 14, 8, 2);
        g.globalAlpha = 1;
        g.drawImage(
          this.sprite(`farmer-${this.facing}-${frame}`, grid, flip),
          farmer.x + 2,
          farmer.y,
        );
      },
    });
    drawables.sort((a, b) => a.base - b.base);
    for (const d of drawables) d.draw();

    // Corner brackets around whatever the farmer can look at.
    if (this.aligned && !this.route.length && this.lastFacing) {
      const [dx, dy] = STEP[this.facing];
      const [fx, fy] = [(this.tile.x + dx) * TILE, (this.tile.y + dy) * TILE];
      g.fillStyle = this.palette['--farm-gold-light'];
      for (const [cx, cy, sx, sy] of [
        [fx, fy, 1, 1],
        [fx + TILE, fy, -1, 1],
        [fx, fy + TILE, 1, -1],
        [fx + TILE, fy + TILE, -1, -1],
      ]) {
        g.fillRect(cx, cy, 4 * sx, 1 * sy);
        g.fillRect(cx, cy, 1 * sx, 4 * sy);
      }
    }

    if (this.night) {
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = this.palette['--farm-night'];
      g.fillRect(cam.x, cam.y, this.canvas.width, this.canvas.height);
      g.globalCompositeOperation = 'source-over';
      const house = this.map.list.find((t) => t.kind === 'house');
      if (house?.kind === 'house') {
        for (const w of this.windows(house)) {
          g.fillStyle = this.palette['--farm-window'];
          g.globalAlpha = 0.25;
          g.fillRect(w.x - 3, w.y - 3, w.w + 6, w.h + 6);
          g.globalAlpha = 1;
          g.fillRect(w.x, w.y, w.w, w.h);
          g.fillStyle = this.palette['--farm-ink'];
          g.fillRect(w.x + Math.floor(w.w / 2), w.y, 1, w.h);
        }
      }
    }
    g.restore();
  }
}
