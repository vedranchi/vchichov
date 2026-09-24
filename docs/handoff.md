# Handoff — current state

**Date:** 2026-09-24
**`main`:** `2fea925` (PR #8). Everything below is merged and live; there are no open PRs
and no work in progress. Rules for working here are in `AGENTS.md` (CLAUDE.md links to it)
— read that first; this file is the "what exists and why" companion.

---

## The two sites

One repo, two Astro builds, two Vercel projects. Both deploy when `main` changes.

| Site      | Domain              | `srcDir`     | Config                  | Output       | Vercel project  |
| --------- | ------------------- | ------------ | ----------------------- | ------------ | --------------- |
| Portfolio | `vchichov.com`      | `sites/www`  | `astro.config.mjs`      | `dist/`      | `personal-site` |
| Blog      | `blog.vchichov.com` | `sites/blog` | `astro.config.blog.mjs` | `dist-blog/` | `vchichov-blog` |

- **Portfolio** (projects, about, contact): neobrutalism — espresso ground, orange blocks
  with black on them, 2px black borders, hard shadows, Montserrat.
- **Blog** (posts, cycling): a cozy _Stardew Valley_-style pixel farm. The front page is a
  walkable farm; every page has a sky at the top.

The split happened because one pixel-themed site was pulling in two directions: charming,
but working against a portfolio that strangers judge you by. The two looks share nothing —
don't leak pixel styling into `sites/www` or flatten the farm into the portfolio's palette.

### Hosting facts

- The portfolio project (`personal-site`, a name kept from the old repo) uses the Astro
  defaults: `npm run build` → `dist`. `www.vchichov.com` redirects to the apex.
- The blog project overrides **Build Command `npm run build:blog`** and **Output Directory
  `dist-blog`**, Root Directory `./`. Its first deploy failed because the command was saved
  as `astro build:blog`, which the Astro CLI answers with its help text — it must run
  through npm.
- **DNS is at Namecheap**, not Vercel. `blog` is a CNAME to the project-specific target
  Vercel shows in the blog project's Domains tab.
- PR previews sit behind Vercel login: an anonymous request gets a `302` to
  `vercel.com/sso-api`. That is the gate, not a broken build.
- Optional, not done: each project rebuilds on every push, even when only the other site
  changed. Vercel → project → Settings → Git → **Ignored Build Step**, e.g. for the blog:
  `git diff --quiet HEAD^ HEAD -- sites/blog src astro.config.blog.mjs package.json`

### Old URLs

Before the split everything lived on the apex. `vercel.json` permanently redirects the old
paths to the blog. **Both projects read the same file**, so every rule is scoped with a `has`
host condition on `vchichov.com` and does nothing on the blog. Keep `/blog/tags/:tag*` above
the generic `/blog/:slug*`.

| Old (apex)         | New (blog)    |
| ------------------ | ------------- |
| `/blog`            | `/`           |
| `/blog/<slug>`     | `/<slug>`     |
| `/blog/tags/<tag>` | `/tags/<tag>` |
| `/cycling`         | `/cycling`    |
| `/rss.xml`         | `/rss.xml`    |

---

## Repository layout

```text
src/                SHARED ONLY — no pages, no components, no styles (@shared/* alias)
  assets/           glucoread.png, nc2026.jpg (unreferenced — see open items)
  content/blog/     *.md + .obsidian/   ← the Obsidian vault. DO NOT MOVE.
  data/             site.ts (both domains, navs, socials), home.ts, projects.json (generated),
                    cycling.json (generated), palmares.ts
  lib/              collections.ts, format.ts, cycling.ts, remark-wikilinks.mjs
sites/www/          pages/ layouts/ components/ styles/ content.config.ts
sites/blog/         pages/ layouts/ components/ styles/ content.config.ts
  farm/             the walkable farm (canvas engine, vanilla TypeScript)
docs/handoff.md     this file
```

- Both builds keep Astro's `root` at the repo root; the content collection's
  `base: './src/content/blog'` depends on it, so Obsidian keeps working untouched.
- **The one non-obvious constraint:** one `tsconfig.json` type-checks both sites and the
  generated `.astro/` types are shared. Collections are defined once in
  `src/lib/collections.ts` and re-exported by **both** `sites/*/content.config.ts`; without
  that, `astro check` passes or fails depending on which build ran last.

---

## The portfolio (`sites/www`)

| Token   | Value                    |
| ------- | ------------------------ |
| Ground  | `#292016` espresso       |
| Accent  | `#d16c19` orange         |
| Text    | `#e2e2e2`                |
| Borders | `#000000`, 2px           |
| Shadow  | `4px 4px 0`, no blur     |
| Radius  | `8px`                    |
| Type    | Montserrat (self-hosted) |

- **Colour rule:** orange is always a filled block with black on it, never text
  (black-on-orange 5.87:1; orange-as-text and light-on-orange both fail AA). Hover lightens
  to `#dd7a24` — darkening fails contrast. Light mode is derived (`#f7efe3` / `#1a140e`) and
  keeps the same orange block.
- A clickable `.box--press` moves exactly its 4px shadow offset when pressed.
- **Nav on phones:** two deliberate rows — this site's pages on top, the Blog link and the
  theme toggle below a hairline. It was designed at 320 / 375 / 560px.
- **Projects** come from `src/data/projects.json` (`npm run sync:projects`, GitHub API).
  Wording we control lives in `src/data/home.ts`: `featured` (home page order), `names`
  (display names for card headings) and `blurbs` (one-liners). All three are **keyed by repo
  name** — renaming a repo in `projects.json` makes its featured card vanish, and the next
  sync would undo it anyway.

---

## The blog (`sites/blog`)

### Type and colour

Body text is Atkinson Hyperlegible Next; Pixelify Sans for headings; Silkscreen only for
chrome (nav, buttons, labels) and never below 12px. `styles/tokens.css` holds a fluid type
scale, a space scale and a three-tier text ramp (`--text` / `--text-soft` /
`--text-muted` — body copy is never muted). Interactive fills use `--accent-ui`, which clears
4.5:1 in light mode where `--accent` does not. Shared classes (`.lede`, `.body-text`,
`.meta-label`, `.chip`, `.chip-row`) live in `global.css` — use them rather than restyling
text in a scoped `<style>`. Every text element on every page type measures ≥ 4.5:1 in both
themes.

### Routes

| Route         | What                                                  |
| ------------- | ----------------------------------------------------- |
| `/`           | The walkable farm, with a plain post list under it    |
| `/archive`    | Every post as a card, newest first, tag cloud         |
| `/<slug>`     | A post                                                |
| `/tags/<tag>` | Posts with a tag                                      |
| `/cycling`    | Results and palmarès (`cycling.json` + `palmares.ts`) |
| `/rss.xml`    | Feed                                                  |

A post whose slug matches a route (`archive`, `cycling`, `tags`, `rss.xml`, `robots.txt`,
`404`) fails the build instead of being silently shadowed. Drafts (`draft: true`) show in
dev and are excluded from every built page, the RSS feed, the sitemap and the farm.

### The farm (`/`)

- **Playing:** click the farm, walk with arrows/WASD, Enter to look at what is in front. On
  a phone, tap where to go; tapping a crop walks up to it and opens it. Posts open in a
  dialog (date, crop, description, tags, "Read the post").
- **Crops are posts**, one each, newest nearest the gate; the field adds rows (six plots
  each) as posts come in, so the map grows downward. The first tag picks the species
  (wheat, tomatoes, pumpkin, sunflower) by hash, so a tag always grows the same crop. A crop
  sprouts in the post's first week and is ripe after 30 days — computed when the page loads.
- **Also there:** a signpost (→ vchichov.com) and the farmhouse door (a hint).
- **Map:** 22 tiles wide, 18 tall with up to 12 posts. Built in code in `farm/map.ts`.
- **Movement** is free, not tile-stepped: keys take effect on the next frame, including
  turns mid-stride, and the cross-axis is eased into the tile lane. Letting go glides to the
  next tile, so the farmer always stops on a whole tile and a tap is one step. Speed: 4
  tiles/s. Under reduced motion the farmer jumps tile to tile instead.
- **Two bugs worth knowing about, both fixed:** a frame's timestamp can predate the keypress
  that started the loop, which gave a negative first step and swallowed presses (the first
  frame now gets a fixed 1/60 s); and a key pressed and released within one frame is kept
  in `queued` until the next frame acts on it.
- **Day and night** follow the theme: the scene is multiplied by `--farm-night` and the
  farmhouse windows are lit. All farm colours are `--farm-*` tokens in `tokens.css`; the
  pixel art is character grids in `farm/sprites.ts`.
- **Fallback:** the server-rendered "In the field" list under the canvas is the real content
  — the page with JS off, and what screen readers get. Keep it.
- **Files:** `farm/map.ts` (layout, pathfinding), `farm/sprites.ts` (art), `farm/engine.ts`
  (movement, drawing), `farm/input.ts`, `farm/main.ts` (wiring, dialog, status line),
  `components/Farm.astro` (markup, fallback list, data), `pages/index.astro`.
- **Tuning knobs:** `TILES_PER_SECOND` in `engine.ts`; the 7/30-day ripening thresholds in
  `map.ts` (`stageFor`).

### The sky and the theme switch

- `components/Backdrop.astro` puts a sky behind the top of every blog page: a pixel sun and
  three slowly drifting clouds by day, a moon and stars (a few twinkle) by night. It fades
  into the parchment within the first screen; stars are masked out of the reading column.
  A strip of pixel grass runs along the footer's top edge. All inline SVG coloured from
  tokens (`--sky-*`, `--sun`, `--cloud`, `--star`, `--moon`, `--fringe`); the day sky's
  strength is `--sky-top`.
- **The sun/moon is the blog's only day/night switch** — the nav toggle was removed. It is a
  real button ("Toggle day / night"), first after the nav in tab order, with rays / a glow
  on hover and focus, and it sits clear of page titles at every width (checked 320–1920px).
  The one click handler for anything marked `data-theme-toggle` is in
  `layouts/BaseLayout.astro`, next to the no-flash theme init. A sunrise/moonrise plays only
  on a real switch (the handler sets `data-theme-anim` for a second).
- Under reduced motion: clouds hold still, stars don't twinkle, the switch is instant.
- Known trade-off: the switch is only reachable at the top of a page.

---

## How things were verified

The repo has no test suite. Visual and behavioural checks in these sessions were done
**outside the repo**: `playwright-core` installed in a scratch directory, driving the
Chromium that Playwright caches at `~/Library/Caches/ms-playwright/chromium-*`, against
`npm run preview` / `preview:blog` (or `astro preview --port …`). Scripts covered: every page
at 375 / 768 / 1024 / 1440 in both themes (overflow, text under 12px), per-element contrast,
tab order and focus visibility, the theme switch, reduced motion, the farm by keyboard and
by tap, and the no-JS fallback. The Claude-in-Chrome extension was not connected.

Not verified by anyone yet: how the farm feels on a real phone.

---

## Open items

| Item                                            | Where / note                                                   |
| ----------------------------------------------- | -------------------------------------------------------------- |
| What and where you are studying                 | `sites/www/pages/about.astro` — marked with a `VEDRAN` comment |
| Whether you are open to internships / freelance | `sites/www/pages/contact.astro` — no claim made, deliberately  |
| `src/assets/` images unreferenced               | `glucoread.png`, `nc2026.jpg` — reuse on the blog or remove    |
| Cycling scraper has no scheduled home           | procyclingstats is Cloudflare-blocked from CI IPs; run locally |
| Redundant Vercel rebuilds                       | optional Ignored Build Step, see Hosting facts                 |
| Merged branches still on GitHub                 | seven, all merged or closed — delete on GitHub                 |
| `.agents/`, `skills-lock.json` untracked        | the design skills AGENTS.md points to; kept on purpose         |

Ideas raised but not acted on: the ripe tomatoes' red is subtle at this size; crops are hard
to see at night; the farm is only 12 plots even with two posts (room to grow, by choice).

### Retired components

Recoverable with `git checkout 474a3e1 -- <path>`: `BlogSpotlight`, `CyclingSpotlight`,
`ProjectSpotlight`, `ScreenshotWindow`, `HomeSection`, the old pixel `ProjectCard`.
`ThemeToggle.astro` (the blog's old nav toggle) was deleted in `15c8239`.
`PixelFarmScene` survived and now heads `/archive`.

---

## History in one breath

Single pixel-theme site on an Oracle VM (gone) → Vercel at vchichov.com → split into a
neobrutalist portfolio and a pixel blog on a subdomain (#5) → blog typography and contrast
rebuilt (#6, ported from the closed #4) → walkable farm, sky and sun switch (#7) → project
display names (#8).
