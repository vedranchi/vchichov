# vchichov

Vedran Chichov's personal site, built with [Astro](https://astro.build) as **two sites
from one repo**:

- **[vchichov.com](https://vchichov.com)**: the portfolio (projects, about, contact).
  Neobrutalist theme; source in `sites/www/`.
- **[blog.vchichov.com](https://blog.vchichov.com)**: the blog and cycling results.
  Cozy _Stardew Valley_-style pixel farm; source in `sites/blog/`.

## Tech at a glance

- **Astro** static site (no runtime backend).
- **Content**: blog posts are Markdown files written in **Obsidian** (the vault
  lives in `src/content/blog/`); projects are synced from GitHub into
  `src/data/projects.json`.
- **Cycling**: a Python scraper (`scripts/scrape_pcs.py`) pulls results from
  [procyclingstats.com](https://www.procyclingstats.com) into
  `src/data/cycling.json`, which the site reads at build time.
- **Hosting**: [Vercel](https://vercel.com), one project per site. Merging to
  `main` deploys both; pull requests get preview URLs.

## Commands

| Command                 | Action                                              |
| :---------------------- | :-------------------------------------------------- |
| `npm install`           | Install dependencies                                |
| `npm run dev`           | Portfolio dev server at `localhost:4321`            |
| `npm run dev:blog`      | Blog dev server at `localhost:4322`                 |
| `npm run build:all`     | Build both sites to `./dist/` and `./dist-blog/`    |
| `npm run check:all`     | Type-check both sites (`astro check`)               |
| `npm run format`        | Format all files with Prettier                      |
| `npm run sync:projects` | Pull public GitHub repos → `src/data/projects.json` |

Each site also has its own `build`/`check`/`preview` script (`…:blog` for the blog).

## Project structure

```text
src/             # shared by both sites (imported as @shared/*)
├─ content/      # blog/ — the Obsidian vault
├─ data/         # site config (both domains), projects.json + cycling.json (generated)
├─ lib/          # content collections, remark-wikilinks, formatting helpers
└─ assets/
sites/www/       # the portfolio: pages, layouts, components, styles
sites/blog/      # the blog: pages, layouts, components, styles
scripts/         # scrape_pcs.py and helpers
```

## Refreshing cycling data

PCS is behind Cloudflare, so the scraper impersonates a real browser (`curl_cffi`).
One-time setup, then run whenever you want fresh results:

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/scrape_pcs.py   # writes src/data/cycling.json
```

## Git workflow

Work happens on feature branches (`feat/...`); finished, reviewed work merges to
`main`. Pushing `main` triggers a deploy. **Nothing is pushed without a review.**

## Writing a blog post (Obsidian)

Open the `src/content/blog/` folder as an Obsidian vault (Open folder as vault). Each
`.md` file in there is one post. Add this frontmatter at the top:

```markdown
---
title: My post title
description: One line shown in listings and previews.
pubDate: 2026-07-08
tags: [cycling, code]
draft: false
---

Write your post here in normal Markdown.
```

- **Filename = URL**: `my-post.md` → `blog.vchichov.com/my-post`.
- **Drafts**: `draft: true` hides a post in the built site but shows it in `npm run dev`.
- **Wiki links**: `[[my-post]]` or `[[my-post|custom text]]` link to another post
  (resolves to `/<slug>` on the blog). See `src/lib/remark-wikilinks.mjs`.
- **Images**: put an image next to the post and use standard Markdown:
  `![alt text](./my-image.png)` — Astro optimizes it at build.
- **Tags** get their own pages at `/tags/<tag>`, and posts appear in `/rss.xml`.

Commit the file on a `feat/...` branch; it appears on the site after review + deploy.
