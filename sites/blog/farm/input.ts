// Keyboard and pointer input for the farm. Keys only count while the canvas has focus, so
// the arrow keys never stop scrolling the page anywhere else.

import type { FarmEngine } from './engine';
import type { Facing } from './sprites';

const DIRECTIONS: Record<string, Facing> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function attachInput(canvas: HTMLCanvasElement, engine: FarmEngine) {
  canvas.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = DIRECTIONS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (dir) {
      e.preventDefault();
      if (!e.repeat) engine.press(dir);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) engine.interact();
    }
  });
  canvas.addEventListener('keyup', (e) => {
    const dir = DIRECTIONS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (dir) engine.release(dir);
  });
  // A key released while focus was elsewhere would otherwise keep the farmer walking.
  canvas.addEventListener('blur', () => engine.releaseAll());

  // `click` rather than pointerdown: on a phone, a finger that lands on the farm to scroll
  // the page past it shouldn't send the farmer anywhere.
  canvas.addEventListener('click', (e) => {
    canvas.focus({ preventScroll: true });
    engine.walkTo(engine.tileAt(e.clientX, e.clientY));
  });
}
