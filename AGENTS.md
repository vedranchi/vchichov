# Project rules — personal-site

Vedran Chichov's personal site: programming projects, cycling, and a blog. Astro static
site with a cozy _Stardew Valley_ pixel theme ("tasteful pixel accents": pixel headings,
readable body). See the plan/memory for full context.

## Git & review (hard rules)

- Work on feature branches named `feat/<milestone>` — one per milestone.
- Commit locally as you go. **Never `git push` or merge to `main` without asking for a
  review first.** `main` is the deploy trigger.
- When in doubt about anything, ask before proceeding — resolve it together.
- Remote: `git@github.com:vedranchi/personal-site.git`.

## Deploy

- Hosted on **Vercel** (static Astro output, no adapter and no `vercel.json` needed).
  Pushing `main` deploys to production; pull requests get preview URLs.
- Canonical domain is **https://vchichov.com** — apex, with `www` redirecting to it.
- **`src/data/site.ts` `url` is the single source of the domain.** Canonical links, Open
  Graph URLs, `rss.xml`, the sitemap and `robots.txt` all derive from it. Change it there
  and nowhere else; never hard-code the host in a page or in `public/`.
- The site used to be self-hosted on an Oracle VM behind nginx alongside a café POS. That
  box is gone — ignore any lingering references to `vchichov.duckdns.org`, and do **not**
  deploy this project onto the VM that runs GlucoRead. The two share nothing.

## Conventions

- **No external CDNs.** Self-host everything (fonts via `@fontsource/*`, images bundled)
  so the built site has no runtime third-party dependencies.
- **Content lives in fixed places:** blog posts = Markdown in `src/content/blog/` (an
  Obsidian vault); projects in `src/content/projects/`; cycling data is generated to
  `src/data/cycling.json` by `scripts/scrape_pcs.py` (never hand-edit that file).
- **Design:** readable body text always, support light ("day farm") and dark ("night
  farm") modes, keep everything responsive/mobile-friendly.
- Astro is pinned to `^7.0.6` — `create-astro` wrongly scaffolds a nonexistent `^7.0.7`.

## Workflow

- Dev server: `astro dev --background`; manage with `astro dev stop | status | logs`.
- Before committing, run `npm run format` and `npm run check` (both must be clean).
