# Project rules — vchichov

Vedran Chichov's personal site. **One repo, two sites, two Vercel projects:**

| Site      | Domain              | `srcDir`     | Config                  | Output       | Look                                                                  |
| --------- | ------------------- | ------------ | ----------------------- | ------------ | --------------------------------------------------------------------- |
| Portfolio | `vchichov.com`      | `sites/www`  | `astro.config.mjs`      | `dist/`      | Minimal "start house" signage — ink/chalk, one signal yellow, Archivo |
| Blog      | `blog.vchichov.com` | `sites/blog` | `astro.config.blog.mjs` | `dist-blog/` | Cozy _Stardew Valley_ pixel farm                                      |

Projects, about and contact live on the portfolio. Blog posts **and cycling** live on the
blog. The two looks share nothing — do not leak pixel styling into `sites/www`, and do not
flatten the farm into the portfolio's palette.

## Git & review (hard rules)

- Work on feature branches named `feat/<milestone>` — one per milestone.
- Commit locally as you go. **Never `git push` or merge to `main` without asking for a
  review first.** `main` is the deploy trigger.
- **While a design is still being figured out, do not commit at all** — leave the work in
  the tree until Vedran has seen it and settled the look.
- When in doubt about anything, ask before proceeding — resolve it together.
- Remote: `git@github.com:vedranchi/vchichov.git` (renamed from `personal-site`; GitHub
  still redirects the old URL, but update your local remote).

## Layout

```text
src/            SHARED ONLY — no pages, no components, no styles
  assets/  content/blog/  data/  lib/
sites/www/      pages/ layouts/ components/ styles/
sites/blog/     pages/ layouts/ components/ styles/ content.config.ts
```

- Both builds keep `root` at the repo root, so `sites/blog/content.config.ts` resolves its
  glob `base: './src/content/blog'` unchanged. **That path is an Obsidian vault — never
  move it.**
- Shared code is imported with the `@shared/*` alias (`tsconfig.json` → `src/*`).
  Within a site, component/layout/style imports stay relative.
- `.astro/` generated types live at the repo root and are **shared by both builds**, and a
  single `tsconfig.json` type-checks both sites at once. So collections are defined once in
  `src/lib/collections.ts` and re-exported by both `sites/*/content.config.ts`. If only the
  blog declared them, `astro check` would pass or fail depending on which build ran last.
  Keep both re-exports.
- `public/` is shared by both builds. Anything host-specific (`robots.txt`) is therefore a
  generated route, not a static file.

## Deploy

- Hosted on **Vercel**, static Astro output, no adapter. Two projects from this one repo:
  the portfolio builds `npm run build` → `dist`, the blog builds `npm run build:blog` →
  `dist-blog`. Pushing `main` deploys both; PRs get preview URLs.
- **`src/data/site.ts` `urls` is the single source of both domains.** Canonical links, Open
  Graph URLs, `rss.xml`, the sitemaps and `robots.txt` all derive from each build's own
  `site` config (via `Astro.site` / `context.site`). Change domains there and nowhere else;
  never hard-code a host in a page or in `public/`.
- `vercel.json` holds the 301s from the old single-site URLs (`/blog/*`, `/cycling`,
  `/rss.xml`) to the blog subdomain. **Both projects read the same file**, so every rule is
  scoped with a `has` host condition on `vchichov.com` and is inert on the blog project.
  Order matters: the `/blog/tags/:tag*` rule must stay above the generic `/blog/:slug*`.
- The site used to be self-hosted on an Oracle VM behind nginx alongside a café POS. That
  box is gone — ignore any lingering references to `vchichov.duckdns.org`, and do **not**
  deploy this project onto the VM that runs GlucoRead. The two share nothing.

## Conventions

- **No external CDNs.** Self-host everything (fonts via `@fontsource*`, images bundled) so
  the built site has no runtime third-party dependencies. This overrides any design guidance
  that reaches for Google Fonts or `picsum.photos`.
- **Content lives in fixed places:** blog posts = Markdown in `src/content/blog/` (an
  Obsidian vault). Projects come from the generated `src/data/projects.json`
  (`npm run sync:projects`) — hand-written wording goes in `src/data/home.ts` instead.
  Cycling data is generated to `src/data/cycling.json` by `scripts/scrape_pcs.py`; off-PCS
  results go in `src/data/palmares.ts`. **Never hand-edit a generated file.**
- **Design:** readable body text always, light and dark modes on both sites, everything
  responsive. The portfolio's one hard colour rule: the signal yellow is never text in
  light mode (1.4:1) — there it is only ever a ground with ink on top.
- Design skills live in `.agents/skills/` (not `.claude/skills/`), so they are **not**
  auto-loaded — read the `SKILL.md` files directly. Most assume React/Tailwind/GSAP; this
  repo is static Astro with hand-rolled CSS, so take their craft rules and drop their stack
  directives.
- Astro is pinned to `^7.0.6` — `create-astro` wrongly scaffolds a nonexistent `^7.0.7`.

## Workflow

- Dev servers: `npm run dev` (portfolio, :4321) and `npm run dev:blog` (blog, :4322). They
  run side by side.
- Before committing, run `npm run format` and `npm run check:all` (both sites must be
  clean). `npm run build:all` builds both.
