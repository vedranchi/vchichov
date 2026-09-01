# personal-site

Vedran Chichov's personal site — programming projects, cycling, and a blog. Cozy
_Stardew Valley_-style pixel theme, built with [Astro](https://astro.build).

## Tech at a glance

- **Astro** static site (no runtime backend).
- **Content**: blog posts are Markdown files written in **Obsidian** (the vault
  lives in `src/content/blog/`); projects are synced from GitHub into
  `src/data/projects.json`.
- **Cycling**: a Python scraper (`scripts/scrape_pcs.py`) pulls results from
  [procyclingstats.com](https://www.procyclingstats.com) into
  `src/data/cycling.json`, which the site reads at build time.
- **Hosting**: [Vercel](https://vercel.com) at
  [vchichov.com](https://vchichov.com); pushing `main` deploys, pull requests
  get preview URLs.

## Commands

| Command                 | Action                                              |
| :---------------------- | :-------------------------------------------------- |
| `npm install`           | Install dependencies                                |
| `npm run dev`           | Start the dev server at `localhost:4321`            |
| `npm run build`         | Build the production site to `./dist/`              |
| `npm run preview`       | Preview the production build locally                |
| `npm run check`         | Type-check the project (`astro check`)              |
| `npm run format`        | Format all files with Prettier                      |
| `npm run sync:projects` | Pull public GitHub repos → `src/data/projects.json` |

## Project structure

```text
src/
├─ layouts/      # shared page shells
├─ components/   # reusable pixel-theme UI pieces
├─ pages/        # routes (index, projects, cycling, blog)
├─ content/      # blog/ — the Obsidian vault
├─ data/         # projects.json + cycling.json (both generated) + site config
├─ styles/       # design tokens + global styles
└─ lib/          # remark-wikilinks + formatting helpers
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

- **Filename = URL**: `my-post.md` → `/blog/my-post`.
- **Drafts**: `draft: true` hides a post in the built site but shows it in `npm run dev`.
- **Wiki links**: `[[my-post]]` or `[[my-post|custom text]]` link to another post
  (resolves to `/blog/<slug>`). See `src/lib/remark-wikilinks.mjs`.
- **Images**: put an image next to the post and use standard Markdown:
  `![alt text](./my-image.png)` — Astro optimizes it at build.
- **Tags** get their own pages at `/blog/tags/<tag>`, and posts appear in `/rss.xml`.

Commit the file on a `feat/...` branch; it appears on the site after review + deploy.
