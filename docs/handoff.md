# Handoff — one site, redesigned

**Branch:** `feat/one-site`
**Status:** code complete; **not merged, not deployed**. After the merge, the
`blog.vchichov.com` domain has to be moved in Vercel by hand. See
[After merging](#after-merging-move-the-blog-domain).

---

## What changed and why

`vchichov.com` used to be two sites built from one repo: a neobrutalist portfolio on the
apex and a _Stardew Valley_ pixel-farm blog on `blog.vchichov.com`, each with its own
Vercel project. It is now **one site** with a new look, and it leads with the blog:

- **One site, one Vercel project.** Posts moved to `vchichov.com/blog/<slug>`, cycling to
  `vchichov.com/cycling`, the feed to `vchichov.com/rss.xml`. The blog subdomain only
  redirects here now.
- **Blog-led.** The home page opens with the newest post as a big orange tile, then the
  rest of the writing, then projects, then "Work with me".
- **New look.** Mona Sans set wide and heavy, Geist Mono for dates and results, neutral
  grounds, and the orange kept as the one accent, with the same rule as before: always a
  fill with dark ink on it, never text. No photos or screenshots anywhere. The rules are in
  `AGENTS.md` under Design.
- **Work with me is a contact form**, and the site no longer pitches "website projects"
  anywhere. The home bio now says Vedran is passionate about constantly learning.
- **The form has no backend yet.** The site is static, so sending opens the visitor's
  email app with the message filled in (a plain `mailto:` submission without JS). The plan
  is a small endpoint on Vedran's own server once the site is self-hosted; the comment at
  the top of `src/pages/work-with-me.astro` says what to replace.
- **Tags:** the duplicate `racing` tag is gone; the ITT post is tagged `cycling` only.
- **Retired:** the pixel farm and its fonts, the neobrutalist boxes and shadows, Montserrat,
  the project screenshots and the unused podium photo. All recoverable from git history.

## Repository layout

The `sites/www` + `sites/blog` split and the `@shared/*` alias are gone; it's a standard
Astro layout under `src/`. The Obsidian vault at `src/content/blog/` **did not move**.

```text
src/pages/       index, blog/{index,[slug],tags/[tag]}, projects, about, cycling,
                 work-with-me, 404, rss.xml.js, robots.txt.js
src/components/  Nav, Footer, ThemeToggle, LatestPostTile, PostList, TagChips,
                 ProjectTile, PositionBadge, ReadingProgress
src/styles/      tokens.css, global.css, prose.css
src/lib/posts.ts getPosts() (drafts filtered, newest first), postHref(), transitionName()
```

## URL changes

| Old                                    | New                            |
| -------------------------------------- | ------------------------------ |
| `blog.vchichov.com/`                   | `vchichov.com/blog`            |
| `blog.vchichov.com/archive`            | `vchichov.com/blog`            |
| `blog.vchichov.com/<slug>`             | `vchichov.com/blog/<slug>`     |
| `blog.vchichov.com/tags/<tag>`         | `vchichov.com/blog/tags/<tag>` |
| `blog.vchichov.com/cycling`            | `vchichov.com/cycling`         |
| `blog.vchichov.com/rss.xml`            | `vchichov.com/rss.xml`         |
| `vchichov.com/blog/*` (pre-split URLs) | served directly again, no hop  |

The old apex rules that sent `/blog/*`, `/cycling` and `/rss.xml` to the subdomain are
**deleted**. Keeping them alongside the new rules would loop.

---

## After merging: move the blog domain

Do these in order, **after** the PR is merged. Until step 2, the new `vercel.json` rules
for the blog host do nothing, because that host isn't attached to this project yet.

### 1. Merge the PR

The portfolio project (the one that owns `vchichov.com`) deploys the merged site.

The **blog** project will also try to build from `main` and **fail**, because
`npm run build:blog` no longer exists. That's harmless: Vercel keeps serving its last good
deployment, so `blog.vchichov.com` stays up until you move the domain.

### 2. Move `blog.vchichov.com` to the portfolio project

1. Vercel → the **blog** project → **Settings → Domains** → remove `blog.vchichov.com`.
2. Vercel → the **portfolio** project → **Settings → Domains** → add `blog.vchichov.com`.
   Connect it to **Production**. Do **not** choose "Redirect to another domain": that would
   keep the path (`/welcome` → `vchichov.com/welcome`, a 404). `vercel.json` maps the paths.

The Namecheap `blog` CNAME stays exactly as it is; it already points at Vercel. Between
removing and adding, the subdomain is briefly unassigned, which takes a minute at most.

### 3. Verify

```bash
curl -sI https://blog.vchichov.com/welcome       # 308 -> https://vchichov.com/blog/welcome
curl -sI https://blog.vchichov.com/welcome/      # 308 -> the same
curl -sI https://blog.vchichov.com/              # 308 -> https://vchichov.com/blog
curl -sI https://blog.vchichov.com/tags/cycling  # 308 -> https://vchichov.com/blog/tags/cycling
curl -sI https://blog.vchichov.com/cycling       # 308 -> https://vchichov.com/cycling
curl -sI https://blog.vchichov.com/rss.xml       # 308 -> https://vchichov.com/rss.xml
curl -sI https://vchichov.com/blog/welcome       # 200, no redirect
curl -s  https://vchichov.com/robots.txt         # Sitemap: https://vchichov.com/sitemap-index.xml
```

If a trailing-slash request doesn't redirect, check the `/:slug` rule in `vercel.json`.
If nothing on the blog host redirects, check the domain is attached to the portfolio
project and that the `has` host value is exactly `blog.vchichov.com`.

### 4. Delete the blog project

Once the redirects check out, delete the blog project in Vercel (Settings → General →
Delete Project). Nothing else uses it.

---

## Verification done before the PR

- `npm run format`, `npm run check` (0 errors, 0 warnings) and `npm run build` (12 pages)
  are all clean.
- `dist/`: canonicals, `robots.txt`, the sitemap and RSS item links all use
  `https://vchichov.com`. No file mentions `blog.vchichov.com`. No `<link>` or `<script>`
  points off-site; the only external URLs are ordinary links.
- A temporary `draft: true` post was absent from every page, tag page, the feed and the
  sitemap, then deleted. A temporary post with a code block confirmed Shiki emits both the
  light and dark palettes, then deleted.
- `[[welcome]]` renders as `/blog/welcome`.
- No em or en dashes in the built UI copy (post bodies are Vedran's own writing and were
  left alone).
- Contrast computed for every token pair in both modes: all text pairs reach 4.5:1 or more
  (lowest: muted text, 6.55:1) and the orange UI shapes reach 3:1 or more (3.25:1 on the
  light ground).
- Looked at in headless Firefox: home, blog, a post, projects, about, cycling and
  work-with-me, in light and dark, at 1440px and 390px.

### Not verified

- **Chrome-only motion**: the cross-page view transitions and the scroll-timeline reading
  bar. Firefox doesn't do either, so they were never seen running. Both degrade to nothing
  where unsupported.
- Keyboard tab order and the focus ring were reviewed in the code, not by tabbing through
  a browser.
- Safari and real phones.

## Open items

| Item                                                  | Where                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `feat/blog-folders` (no PR yet) conflicts with this   | its `generateId` change ports 1:1 into `src/content.config.ts`; rebase it |
| The draft "host-your-own-website" post on that branch | it describes the old subdomain setup                                      |
| PR #9 (handoff rewrite)                               | superseded by this file; close it                                         |
| The two sample posts still describe the farm          | `src/content/blog/`, Vedran's writing                                     |
| `.agents/`, `skills-lock.json` untracked              | design skills; commit or delete                                           |
| Cycling scraper has no scheduled home                 | GitHub Actions IPs are Cloudflare-blocked by procyclingstats              |
