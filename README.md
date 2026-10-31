# vchichov

Vedran Chichov's personal site, **[vchichov.com](https://vchichov.com)**, built with
[Astro](https://astro.build): a blog, projects, race results, and how to work with me.

## Tech at a glance

- **Astro** static site (no runtime backend), one Vercel project.
- **Type and look**: Mona Sans (set wide and heavy for display) and Geist Mono, one orange
  accent, light and dark modes. All self-hosted; the pages make no third-party requests.
- **Content**: blog posts are Markdown files written in **Obsidian** (the vault lives in
  `src/content/blog/`); projects are synced from GitHub into `src/data/projects.json`.
- **Cycling**: a Python scraper (`scripts/scrape_pcs.py`) pulls results from
  [procyclingstats.com](https://www.procyclingstats.com) into `src/data/cycling.json`,
  which the site reads at build time.
- **Hosting**: [Vercel](https://vercel.com). Merging to `main` deploys; pull requests get
  preview URLs.

## Commands

| Command                 | Action                                                      |
| :---------------------- | :---------------------------------------------------------- |
| `npm install`           | Install dependencies                                        |
| `npm run dev`           | Dev server at `localhost:4321`                              |
| `npm run build`         | Build the site to `./dist/`                                 |
| `npm run preview`       | Serve the build locally                                     |
| `npm run check`         | Type-check (`astro check`)                                  |
| `npm run format`        | Format all files with Prettier                              |
| `npm run sync:projects` | Pull public GitHub repos → `src/data/projects.json`         |
| `npm run og`            | Redraw the share image and favicon (needs Python fontTools) |

## Project structure

```text
src/
├─ pages/        # /, /blog, /blog/<slug>, /blog/tags/<tag>, /projects, /about, /cycling, …
├─ layouts/      # BaseLayout
├─ components/   # Nav, Footer, PostList, ProjectTile, …
├─ styles/       # tokens.css (colours, type, sizes), global.css, prose.css
├─ content/blog/ # the Obsidian vault
├─ data/         # site config, projects.json + cycling.json (generated), home.ts
├─ lib/          # posts, cycling results, formatting, remark-wikilinks
└─ assets/       # og.png
scripts/         # scrape_pcs.py, fetch_github.mjs, make_og.mjs
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

- **Filename = URL**: `my-post.md` → `vchichov.com/blog/my-post`.
- **The newest post** leads the home page as the big orange tile. The five newest
  (that one included) are listed below it, and every post is on `/blog`, grouped by year.
- **Drafts**: `draft: true` hides a post in the built site but shows it in `npm run dev`.
- **Wiki links**: `[[my-post]]` or `[[my-post|custom text]]` link to another post
  (resolves to `/blog/<slug>`). See `src/lib/remark-wikilinks.mjs`.
- **Images**: put an image next to the post and use standard Markdown:
  `![alt text](./my-image.png)`. Astro optimizes it at build.
- **Tags** get their own pages at `/blog/tags/<tag>`, and posts appear in `/rss.xml`.

Commit the file on a `feat/...` branch; it appears on the site after review + deploy.
