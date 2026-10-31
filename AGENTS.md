# Project rules — vchichov

Vedran Chichov's personal site at **https://vchichov.com**: one Astro site, one Vercel
project. It's blog-led. The home page opens with the latest post, then his projects, then
"Work with me". Writing lives under `/blog`, and there are pages for projects, about,
cycling results and work-with-me.

Until late 2026 there was also a separate pixel-farm blog at `blog.vchichov.com`. It has
been folded into this site, and that host now only redirects here (see Deploy). The farm
and its pixel theme are retired; they're recoverable from git history (PR #7) if ever wanted.

**The repo is public.** Nothing committed here may contain secrets, server addresses, or
personal data. The root `handoff.md` is gitignored deployment scratch — keep it that way
(`docs/handoff.md` is tracked and is the real handoff).

## Git & review (hard rules)

The loop is always: **branch → commit → push the branch → open a PR → Vedran reviews and
merges.** Opening the PR is where your part ends.

- Branch off an up-to-date `main`, named `feat/`, `fix/` or `chore/<short-slug>`.
- **Never commit directly to `main`, and never merge a PR** — not with `gh pr merge`, not
  in the web UI, not "just this once". Merging is Vedran's, every time.
- Pushing a _feature branch_ and running `gh pr create --base main` is expected and doesn't
  need to be asked for each time. Pushing to `main` does — don't.
- **While a design is still being figured out, do not commit at all** — leave the work in
  the tree until Vedran has seen it and settled the look.
- **No AI attribution.** No `Co-Authored-By: Claude`, no "Generated with Claude Code", in
  commit messages or PR bodies. The history reads as Vedran's own work.
- Write PR bodies that say what changed and _why_, and state what was actually verified —
  never imply a command passed if it wasn't run.
- When in doubt about anything, ask before proceeding — resolve it together.
- Remote: `git@github.com:vedranchi/vchichov.git`.

## Layout

A standard single-site Astro layout:

```text
src/
  pages/        index, blog/ (index, [slug], tags/[tag]), projects, about, cycling,
                work-with-me, 404, rss.xml.js, robots.txt.js
  layouts/      BaseLayout.astro
  components/   Nav, Footer, ThemeToggle, LatestPostTile, PostList, TagChips,
                ProjectTile, PositionBadge, ReadingProgress
  styles/       tokens.css (every colour and size), global.css, prose.css (posts)
  content/blog/ the posts — an Obsidian vault
  content.config.ts
  data/  lib/  assets/
```

- `src/content.config.ts` globs `./src/content/blog`. **That folder is an Obsidian vault —
  never move it.**
- Every page reads posts through `getPosts()` in `src/lib/posts.ts`, which filters drafts
  and sorts newest first. Use it rather than calling `getCollection` directly, so a draft
  can't leak through one page that forgot the filter.
- Posts live at `/blog/<slug>`. A post whose slug is `tags` would clash with
  `/blog/tags/` and fails the build.
- `robots.txt` is a generated route, not a file in `public/`, so its sitemap URL follows
  the configured `site`.
- **The Work with me form has no backend yet**: sending opens the visitor's email app with
  the message filled in. It is meant to post to an endpoint on Vedran's own server once the
  site is self-hosted — see the comment at the top of `src/pages/work-with-me.astro`. The
  site doesn't advertise "website projects"; keep the copy open-ended.

## Deploy

- Hosted on **Vercel**, static Astro output, no adapter: `npm run build` → `dist`. Merging
  to `main` deploys to production; every PR gets a preview URL.
- The canonical domain is **https://vchichov.com** (apex, and the primary domain in
  Vercel); `www.vchichov.com` redirects to it. DNS lives at Namecheap.
- **`src/data/site.ts` `url` is the single source of the domain.** Canonical links, Open
  Graph URLs, `rss.xml`, the sitemap and `robots.txt` all derive from it via the build's
  `site` config (`Astro.site` / `context.site`). Never hard-code a host in a page or in
  `public/` — a hard-coded `public/robots.txt` once went stale and advertised a dead host
  for weeks before anyone noticed. Changing it means changing the Vercel primary domain in
  the same breath.
- `vercel.json` holds the redirects:
  - `/contact` → `/work-with-me` on the apex.
  - Everything on **`blog.vchichov.com`** → the same thing here: `/` and `/archive` →
    `/blog`, `/tags/*` → `/blog/tags/*`, `/<slug>` → `/blog/<slug>`, and `/cycling`,
    `/rss.xml`, `robots.txt` and the sitemaps → the same path on the apex. These only work
    because `blog.vchichov.com` is attached to this Vercel project. **Order matters**: the
    named files must stay above the single-segment `/:slug` rule, and the `/:path*`
    catch-all stays last.
  - There must be **no** rule sending apex `/blog/*` anywhere. The site briefly redirected
    those to the subdomain; reintroducing that would loop.
- **Preview deployments sit behind Vercel Authentication.** An anonymous request to a
  preview URL answers `302` to `vercel.com/sso-api` — that's the login gate, not a broken
  build. Verify previews in a logged-in browser, or verify production after the merge.
- The site used to be self-hosted on an Oracle VM behind nginx alongside a café POS. **That
  box is gone** — ignore lingering references to `vchichov.duckdns.org` or its old IPs.
  Vedran's _other_ Oracle VM runs GlucoRead; **do not deploy this project onto it, or
  couple the two in any way.** He asked for them kept entirely separate.

## Design

Editorial and sporty, carried by type rather than pictures. All values are in
`src/styles/tokens.css`.

- **Type:** Mona Sans (variable, weight _and_ width axes) for everything. Display type —
  the name, page titles, section headings, list titles — is set wide (`--wide`, 125%) and
  heavy (750–850). Geist Mono, with tabular figures, carries dates, tags, counts and
  results. Both are self-hosted via `@fontsource-variable/*`.
- **Colour:** neutral grounds (`#f4f4f1` light, `#111214` dark) and **one accent, the
  orange `#d16c19`**. The hard rule: **orange is always a filled shape with dark ink
  (`--on-accent`, `#111214` in both modes) on it, never text.** Ink on orange is 5.24:1;
  orange as text on the light ground is 3.25:1 and fails. Hover lightens to `#dd7a24`
  (6.14:1); darkening fails. Orange is used for the latest-post tile, the primary button,
  the post-row hover sweep, the active nav bar, the reading-progress bar, blockquote bars,
  position badges, `::selection` and the focus halo — nothing else.
- **No photos or screenshots anywhere** in the site's own pages (Vedran's call). Images he
  puts inside his own posts still render.
- **Shape:** flat — no shadows, no heavy outlines. One radius, `--radius: 6px`, for every
  button, tile, chip and code block. Tiles separate by tone and 1px `--line` hairlines.
- **Motion** is transform/opacity only, and all of it switches off under
  `prefers-reduced-motion`: the hero's staggered rise, the orange sweep on post rows,
  cross-page view transitions (pure CSS, a post title morphs from list to article), the
  CSS scroll-timeline reading bar, and small button lifts.
- **Copy:** no em or en dashes in UI copy (use a comma, colon, full stop or hyphen). No
  eyebrow labels above section headings. No decorative emojis anywhere.
- **Icons** are Phosphor (`@phosphor-icons/core`, bold weight), imported as Astro SVG
  components so they inline at build time. Don't hand-draw SVG icons.
- Light and dark both follow the system, with a sun/moon toggle; the choice is stored in
  `localStorage`, and with JS off `prefers-color-scheme` still picks correctly.
- Design skills live in `.agents/skills/` (not `.claude/skills/`), so they are **not**
  auto-loaded — read the `SKILL.md` files directly (the redesign followed
  `design-taste-frontend`). Most assume React/Tailwind/GSAP; this repo is static Astro with
  hand-rolled CSS, so take their craft rules and drop their stack directives.

## Conventions

- **No external CDNs.** Self-host everything (fonts via `@fontsource*`, icons inlined) so
  the built site makes no third-party requests at runtime. Vercel serving our own bundle
  isn't a violation — the rule is about what the _page_ reaches out to. This overrides any
  design guidance that reaches for Google Fonts or `picsum.photos`.
- **Generated files are never hand-edited:**
  - `src/data/projects.json` ← `npm run sync:projects` (GitHub API). It carries each repo's
    description and homepage, so changing those on GitHub means resyncing here.
    Hand-written names and wording go in `src/data/home.ts` instead.
  - `src/data/cycling.json` ← `scripts/scrape_pcs.py`. Off-PCS results go in
    `src/data/palmares.ts`. It says "North Macedonia"; Vedran says "Macedonia", so
    `displayName()` in `src/lib/cycling.ts` swaps it on the way out — never in the data.
  - `src/assets/og.png`, `public/favicon.svg` and `public/apple-touch-icon.png` ←
    `npm run og`. It needs Python with `fonttools` and `brotli` (set `PYTHON=` to an
    interpreter that has them); rerun it after changing the name or the look.
- **The cycling scraper only runs locally.** procyclingstats.com is behind Cloudflare, so
  the scraper impersonates a real browser with `curl_cffi` — and datacenter IPs (CI
  runners) get blocked regardless. Run it on Vedran's machine and commit the result; don't
  move it into CI.
- **Blog posts** are Markdown in `src/content/blog/`, the Obsidian vault. The filename is
  the slug; `[[wikilinks]]` become `/blog/<slug>` via our own dependency-free
  `src/lib/remark-wikilinks.mjs`, run through the `unified()` Markdown processor in
  `astro.config.mjs`. Code blocks carry both Shiki palettes and follow the theme toggle.
- **Projects are not a content collection** — `/projects` renders
  `src/data/projects.json`. There is no `src/content/projects/`.
- Astro is pinned to `^7.0.6` — `create-astro` wrongly scaffolds a nonexistent `^7.0.7`.

## Working locally

- `npm run dev` starts the dev server (it takes the next free port if 4321 is busy). Drafts
  (`draft: true`) show in dev and are excluded from the build.
- **Before opening a PR, all three must be clean:** `npm run format`, `npm run check`,
  `npm run build`. Build too, not just check — the host is baked in at build time, so the
  sitemap, RSS and `robots.txt` can only really be verified in `dist/`.
