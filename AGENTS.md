# Project rules — vchichov

Vedran Chichov's personal site. **One repo, two sites, two Vercel projects:**

| Site      | Domain              | `srcDir`     | Config                  | Output       | Look                                                                     |
| --------- | ------------------- | ------------ | ----------------------- | ------------ | ------------------------------------------------------------------------ |
| Portfolio | `vchichov.com`      | `sites/www`  | `astro.config.mjs`      | `dist/`      | Neobrutalism — espresso ground, orange blocks, black borders, Montserrat |
| Blog      | `blog.vchichov.com` | `sites/blog` | `astro.config.blog.mjs` | `dist-blog/` | Cozy _Stardew Valley_ pixel farm                                         |

Projects, about and contact live on the portfolio. Blog posts **and cycling** live on the
blog. The two looks share nothing — do not leak pixel styling into `sites/www`, and do not
flatten the farm into the portfolio's palette.

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
  `dist-blog`. Merging to `main` deploys both to production; every PR gets preview URLs.
- The portfolio's canonical domain is **https://vchichov.com** (apex, and the primary domain
  in Vercel); `www.vchichov.com` redirects to it. DNS lives at Namecheap — the blog's
  `blog` CNAME is added there, not in Vercel.
- **`src/data/site.ts` `urls` is the single source of both domains.** Canonical links, Open
  Graph URLs, `rss.xml`, the sitemaps and `robots.txt` all derive from each build's own
  `site` config (via `Astro.site` / `context.site`). Change domains there and nowhere else;
  never hard-code a host in a page or in `public/` — a hard-coded `public/robots.txt` once
  went stale and advertised a dead host for weeks before anyone noticed.
- Changing a canonical host means changing **`urls` and that project's Vercel primary
  domain in the same breath.** A mismatch leaves every canonical pointing at a URL that
  redirects away.
- `vercel.json` holds the 301s from the old single-site URLs (`/blog/*`, `/cycling`,
  `/rss.xml`) to the blog subdomain. **Both projects read the same file**, so every rule is
  scoped with a `has` host condition on `vchichov.com` and is inert on the blog project.
  Order matters: the `/blog/tags/:tag*` rule must stay above the generic `/blog/:slug*`.
- **Preview deployments sit behind Vercel Authentication.** An anonymous request to a
  preview URL answers `302` to `vercel.com/sso-api` — that's the login gate, not a broken
  build. Verify previews in a logged-in browser, or verify production after the merge.
- The site used to be self-hosted on an Oracle VM behind nginx alongside a café POS. **That
  box is gone** — ignore lingering references to `vchichov.duckdns.org` or its old IPs.
  Vedran's _other_ Oracle VM runs GlucoRead; **do not deploy this project onto it, or
  couple the two in any way.** He asked for them kept entirely separate.

## Conventions

- **No external CDNs.** Self-host everything (fonts via `@fontsource*`, images bundled) so
  the built site makes no third-party requests at runtime. Vercel serving our own bundle
  isn't a violation — the rule is about what the _page_ reaches out to. This overrides any
  design guidance that reaches for Google Fonts or `picsum.photos`.
- **Generated data files are never hand-edited:**
  - `src/data/projects.json` ← `npm run sync:projects` (GitHub API). It carries each repo's
    description and homepage, so changing those on GitHub means resyncing here.
    Hand-written wording goes in `src/data/home.ts` instead.
  - `src/data/cycling.json` ← `scripts/scrape_pcs.py`. Off-PCS results go in
    `src/data/palmares.ts`.
- **The cycling scraper only runs locally.** procyclingstats.com is behind Cloudflare, so
  the scraper impersonates a real browser with `curl_cffi` — and datacenter IPs (CI
  runners) get blocked regardless. Run it on Vedran's machine and commit the result; don't
  move it into CI.
- **Blog posts** are Markdown in `src/content/blog/`, which is an Obsidian vault. Filename
  is the slug; `[[wikilinks]]` become `/<slug>` via our own dependency-free
  `src/lib/remark-wikilinks.mjs` (the published plugins don't support Astro 7).
- **Projects are not a content collection** — the portfolio renders
  `src/data/projects.json`. There is no `src/content/projects/`.
- **Design:** readable body text always, light and dark modes on both sites, everything
  responsive. No decorative emojis anywhere — the blog's ☀️/🌙 theme toggle is the one
  exception. The portfolio's one hard colour rule: the orange (`#d16c19`) is always a
  filled block with black on it, never text — orange-as-text and light-on-orange both fail
  AA. Hover lightens it (`#dd7a24`); darkening fails contrast.
- Design skills live in `.agents/skills/` (not `.claude/skills/`), so they are **not**
  auto-loaded — read the `SKILL.md` files directly. Most assume React/Tailwind/GSAP; this
  repo is static Astro with hand-rolled CSS, so take their craft rules and drop their stack
  directives.
- Astro is pinned to `^7.0.6` — `create-astro` wrongly scaffolds a nonexistent `^7.0.7`.

## Working locally

- Dev servers: `npm run dev` (portfolio, :4321) and `npm run dev:blog` (blog, :4322). They
  run side by side. Drafts (`draft: true`) show in dev and are excluded from the build.
- **Before opening a PR, all three must be clean:** `npm run format`, `npm run check:all`,
  `npm run build:all` (both sites). Build too, not just check — each site's host is baked
  in at build time, so the sitemaps, RSS and `robots.txt` can only really be verified in
  `dist/` and `dist-blog/`.
