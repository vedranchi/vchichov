// Boots the farm on the blog's landing page: reads the posts the page was built with, lays
// out the field, and connects the engine to the dialog, the status line and the theme.

import { slugifyTag } from '@shared/lib/format';
import { FarmEngine } from './engine';
import { attachInput } from './input';
import { buildMap, type Post, type Thing } from './map';
import { readPalette } from './sprites';

interface FarmData {
  posts: Post[];
  www: string;
}

const STAGES = ['just sprouted', 'growing', 'ready to harvest'];
const IDLE_HINT = 'Every crop in the field is a post. Walk up to one to see what it is.';

export function startFarm(root: HTMLElement) {
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const data: FarmData = JSON.parse(q<HTMLScriptElement>('#farm-data').textContent!);
  const stage = q<HTMLElement>('[data-farm-stage]');
  const canvas = q<HTMLCanvasElement>('canvas');
  const status = q<HTMLElement>('[data-farm-status]');
  const dialog = q<HTMLDialogElement>('dialog');
  const ui = {
    kicker: q<HTMLElement>('[data-kicker]'),
    title: q<HTMLElement>('[data-title]'),
    body: q<HTMLElement>('[data-body]'),
    tags: q<HTMLElement>('[data-tags]'),
    link: q<HTMLAnchorElement>('[data-link]'),
    close: q<HTMLButtonElement>('[data-close]'),
  };

  const describe = (thing: Thing | null): string => {
    if (!thing) return IDLE_HINT;
    if (thing.kind === 'crop')
      return `${thing.species}, ${STAGES[thing.stage]}: “${thing.post.title}”. Press Enter or tap it to read.`;
    if (thing.kind === 'sign') return 'A signpost to vchichov.com. Press Enter or tap it.';
    if (thing.kind === 'house') return 'The farmhouse door. Press Enter or tap it to knock.';
    return IDLE_HINT;
  };

  const open = (thing: Thing) => {
    ui.tags.replaceChildren();
    ui.link.hidden = false;
    if (thing.kind === 'crop') {
      const { post } = thing;
      ui.kicker.textContent = `${post.dateLabel} · ${thing.species}, ${STAGES[thing.stage]}`;
      ui.title.textContent = post.title;
      ui.body.textContent = post.description;
      for (const tag of post.tags) {
        const a = Object.assign(document.createElement('a'), {
          href: `/tags/${slugifyTag(tag)}`,
          className: 'chip meta-label',
          textContent: `#${tag}`,
        });
        const li = document.createElement('li');
        li.append(a);
        ui.tags.append(li);
      }
      ui.link.href = `/${post.slug}`;
      ui.link.textContent = 'Read the post';
    } else if (thing.kind === 'sign') {
      ui.kicker.textContent = 'Signpost';
      ui.title.textContent = 'vchichov.com';
      ui.body.textContent =
        'This road leads to my portfolio: the projects I build, a bit about me, and how to get in touch.';
      ui.link.href = data.www;
      ui.link.textContent = 'Go to vchichov.com';
    } else {
      ui.kicker.textContent = 'The farmhouse';
      ui.title.textContent = 'Nobody’s home';
      ui.body.textContent =
        'I’m out in the field. Every crop out there is a post — walk up to one and press Enter, or tap it.';
      ui.link.hidden = true;
    }
    ui.tags.hidden = !ui.tags.childElementCount;
    ui.body.hidden = !ui.body.textContent;
    dialog.showModal();
    (ui.link.hidden ? ui.close : ui.link).focus();
  };

  let facing: Thing | null = null;
  const engine = new FarmEngine(canvas, buildMap(data.posts), {
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    onFacing: (thing) => {
      facing = thing;
      status.textContent = describe(thing);
    },
    onInteract: open,
  });

  // Keys only reach the farm while it has focus. Say so when it loses it, rather than
  // leaving the farmer to ignore the keyboard without explanation.
  canvas.addEventListener('blur', () => {
    if (!dialog.open) status.textContent = 'Paused. Click the farm to keep walking.';
  });
  canvas.addEventListener('focus', () => (status.textContent = describe(facing)));

  ui.close.addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the <dialog> itself; clicks on the panel land inside it.
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  dialog.addEventListener('close', () => canvas.focus({ preventScroll: true }));

  // Day and night follow the site's theme toggle.
  const applyTheme = () => {
    engine.setPalette(readPalette());
    engine.setNight(document.documentElement.getAttribute('data-theme') === 'dark');
  };
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  stage.hidden = false;
  status.textContent = IDLE_HINT;
  applyTheme();
  // The canvas has a 3px border on each side; the view fits inside what's left.
  const fit = () => engine.resize(stage.clientWidth - 6, Math.max(320, innerHeight * 0.7));
  new ResizeObserver(fit).observe(stage);
  fit();
  attachInput(canvas, engine);
}
