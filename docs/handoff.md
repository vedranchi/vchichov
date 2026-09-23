# Handoff — the two-site split

**Date:** 2026-09-23
**Branch:** `feat/home-sections`
**Status:** code complete and pushed; **not merged, not deployed**. The blog subdomain does
not exist yet — see [Setting up the subdomain](#setting-up-the-subdomain).

---

## What changed and why

`vchichov.com` used to be one Astro site with a _Stardew Valley_ pixel theme covering
everything: home, projects, cycling, blog. That single identity pulled in two directions —
the pixel theme is charming, but it worked against the site's job as a portfolio that
strangers evaluate you by.

It is now **two sites built from one repo**, each with its own Vercel project:

| Site      | Domain              | `srcDir`     | Config                  | Output       | Look                             |
| --------- | ------------------- | ------------ | ----------------------- | ------------ | -------------------------------- |
| Portfolio | `vchichov.com`      | `sites/www`  | `astro.config.mjs`      | `dist/`      | Neobrutalism                     |
| Blog      | `blog.vchichov.com` | `sites/blog` | `astro.config.blog.mjs` | `dist-blog/` | Cozy _Stardew Valley_ pixel farm |

Projects, about and contact live on the portfolio. Blog posts **and cycling** live on the
blog.

---

## Repository layout

```text
src/                SHARED ONLY — no pages, no components, no styles
  assets/           glucoread.png, nc2026.jpg (currently unreferenced)
  content/blog/     *.md + .obsidian/   ← the Obsidian vault. DO NOT MOVE.
  data/             site.ts, home.ts, projects.json, cycling.json, palmares.ts
  lib/              collections.ts, format.ts, cycling.ts, remark-wikilinks.mjs
sites/www/          pages/ layouts/ components/ styles/ content.config.ts
sites/blog/         pages/ layouts/ components/ styles/ content.config.ts
astro.config.mjs    astro.config.blog.mjs    vercel.json
```

Both builds keep Astro's `root` at the repo root. That is load-bearing: the content
collection's glob `base: './src/content/blog'` resolves against `root`, so **the Obsidian
vault path never changed** and Obsidian keeps working untouched.

Shared code is imported with the `@shared/*` alias (`tsconfig.json` → `src/*`). Within a
site, component/layout/style imports stay relative.

### The one non-obvious constraint

A single `tsconfig.json` type-checks both sites, and the generated types in `.astro/` are
shared between the two builds. If only the blog declared its collections, `astro check`
would pass or fail depending on **which build ran last**.

So collections are defined once in `src/lib/collections.ts` and re-exported by _both_
`sites/*/content.config.ts`. The portfolio renders no Markdown but declares them anyway.
**Keep both re-exports.**

---

## Commands

```bash
npm run dev          # portfolio, :4321
npm run dev:blog     # blog, :4322
npm run build:all    # both
npm run check:all    # both — must be clean before committing
npm run format
```

Note: in some sandboxes `astro dev` only allows one server at a time; run whichever site
you are looking at.

---

## URL changes

The blog flattened by one level, since `blog.vchichov.com/blog/…` repeats itself.

| Old (apex)         | New (subdomain) |
| ------------------ | --------------- |
| `/blog`            | `/`             |
| `/blog/<slug>`     | `/<slug>`       |
| `/blog/tags/<tag>` | `/tags/<tag>`   |
| `/cycling`         | `/cycling`      |
| `/rss.xml`         | `/rss.xml`      |

`vercel.json` holds 301s for all of these. **Both Vercel projects read the same
`vercel.json`**, so every rule is scoped with a `has` host condition on `vchichov.com` and
is inert on the blog project. Order matters — the `/blog/tags/:tag*` rule must stay above
the generic `/blog/:slug*`.

Obsidian `[[wikilinks]]` now emit `/<slug>` (`src/lib/remark-wikilinks.mjs`).

---

## Portfolio design

Neobrutalism, taken from a supplied reference screenshot. Values were sampled from the
image, not guessed.

| Token   | Value                    |
| ------- | ------------------------ |
| Ground  | `#292016` espresso       |
| Accent  | `#d16c19` orange         |
| Text    | `#e2e2e2`                |
| Borders | `#000000`, 2px           |
| Shadow  | `4px 4px 0`, no blur     |
| Radius  | `8px`                    |
| Type    | Montserrat (self-hosted) |

The system reduces to three tokens — `--border`, `--radius`, `--shadow` — plus one
behaviour: an interactive `.box--press` travels exactly `--press` (4px, equal to the shadow
offset) when clicked, so it lands where its shadow was.

**The governing colour rule: orange is always a filled block with black on it, never
text.** Black-on-orange is 5.87:1; light-on-orange is 2.76:1 and orange-as-text on the
ground is 4.47:1 — both fail AA. Hover _lightens_ to `#dd7a24` rather than darkening,
because darkening measured 4.46:1.

Light mode is derived (`#f7efe3` cream / `#1a140e` ink, 16:1) and deliberately keeps the
same orange block, so both modes read as the same site. With JavaScript off,
`prefers-color-scheme` still selects correctly.

The blog's pixel theme is untouched and shares nothing with this. Do not leak pixel styling
into `sites/www`, and do not flatten the farm into the portfolio's palette.

---

## Setting up the subdomain

**Do these in order.** The blog build only exists on this branch, so creating the Vercel
project before merging would just fail to build.

> ⚠️ Between step 1 and step 4, `/blog/*` and `/cycling` on the apex will 301 to a host that
> does not resolve yet. On a young domain with two sample posts this is near-zero cost, but
> it is why steps 2–4 should follow the merge promptly.

### 1. Merge the PR

Open it if it is not open yet:

```bash
gh pr create --repo vedranchi/vchichov --base main --head feat/home-sections \
  --title "Split into a portfolio at the apex and a farm blog on a subdomain"
```

Check the preview URL before merging. Merging `main` redeploys the **existing** project,
which now serves the new portfolio from `dist/`.

### 2. Create the second Vercel project

Vercel dashboard → **Add New… → Project** → import the **same** GitHub repo
(`vedranchi/vchichov`). When it asks to configure:

| Setting          | Value                                       |
| ---------------- | ------------------------------------------- |
| Project Name     | e.g. `vchichov-blog`                        |
| Framework Preset | Astro                                       |
| Root Directory   | `./` (leave as-is)                          |
| Build Command    | `npm run build:blog` — override the default |
| Output Directory | `dist-blog` — override the default          |
| Install Command  | default                                     |

Root Directory stays at the repo root because both sites build from there; only the build
command and output directory differ.

Deploy it. It should produce 9 pages. Confirm the generated `robots.txt` says
`Sitemap: https://blog.vchichov.com/sitemap-index.xml` — that proves the build picked up
`astro.config.blog.mjs` rather than the default config.

Leave the existing project alone: it keeps `npm run build` → `dist`.

### 3. Add the domain in Vercel

In the **new** project → **Settings → Domains** → add `blog.vchichov.com`.

Vercel will show it as **Invalid Configuration / pending** with a DNS record to create.
That is expected — Vercel cannot edit your DNS. Continue to step 4.

Do **not** add `blog.vchichov.com` to the portfolio project; the apex and `www` stay there.

### 4. Add the CNAME at Namecheap

**DNS for `vchichov.com` is at Namecheap, not Vercel.** This is the step that usually
stalls people, because Vercel's UI makes it look like one click.

Namecheap → **Domain List** → `vchichov.com` → **Manage** → **Advanced DNS** → **Add New
Record**:

| Field | Value                  |
| ----- | ---------------------- |
| Type  | `CNAME Record`         |
| Host  | `blog`                 |
| Value | `cname.vercel-dns.com` |
| TTL   | Automatic              |

Host is `blog`, **not** `blog.vchichov.com` — Namecheap appends the domain itself. Save.

Use whatever value Vercel actually displays in step 3 if it differs from
`cname.vercel-dns.com`; Vercel's target has changed before.

### 5. Wait, then verify

Propagation is usually minutes, occasionally up to an hour. Vercel's domain row flips to
**Valid Configuration** and issues a certificate automatically.

```bash
dig +short blog.vchichov.com                      # should show the Vercel CNAME target
curl -sI https://blog.vchichov.com/ | head -1     # 200
curl -sI https://blog.vchichov.com/welcome        # 200
curl -sI https://vchichov.com/blog/welcome        # 301 -> https://blog.vchichov.com/welcome
curl -sI https://vchichov.com/cycling             # 301 -> https://blog.vchichov.com/cycling
curl -s  https://blog.vchichov.com/robots.txt     # sitemap on the blog host
```

If the redirects do not fire, check that `vercel.json` deployed and that the `has` host
value matches the request host exactly (`vchichov.com`, no `www.`).

### 6. Optional — stop redundant rebuilds

Each project currently rebuilds on every push to `main`, including commits that only touch
the other site. In each project → **Settings → Git → Ignored Build Step**, set a command
that exits `0` when nothing relevant changed, e.g. for the blog project:

```bash
git diff --quiet HEAD^ HEAD -- sites/blog src astro.config.blog.mjs package.json
```

Skip this until the split is confirmed working; a wrong ignore step is confusing to debug.

---

## Verification already done

- `npm run check:all` — 0 errors on both sites, in either build order.
- `npm run build:all` — portfolio 5 pages, blog 9 pages.
- Hosts correct in both outputs: canonicals, `robots.txt`, sitemaps.
- No cross-contamination: `dist/` has no blog routes, `dist-blog/` has no portfolio pages.
- Wikilink `[[welcome]]` renders as `/welcome`, not `/blog/welcome`.
- Draft posts excluded from pages, RSS and sitemap (this was a **bug fix** — `getStaticPaths`
  was not filtering drafts, so they were built and reachable by direct URL in production).
- Portfolio ships no pixel fonts; blog keeps all three.
- Contrast ratios computed for every foreground/background pair in both modes.

### Not verified

**No browser was available in the session that built this.** Contrast is computed rather
than observed, and nobody has looked at the rendered pages. Still needs an eyeball on the
preview URL:

- rendered layout and spacing at 375 / 768 / 1024 / 1440
- hover and press feel on the boxes
- keyboard tab order and focus visibility
- reduced-motion behaviour
- the theme toggle in both directions

---

## Open items

| Item                                                     | Where                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| What and where you are studying                          | `sites/www/pages/about.astro` — marked with a comment             |
| Whether you are open to internships / freelance          | `sites/www/pages/contact.astro` — no claim made, deliberately     |
| Contact email is `vchichovv@gmail.com`                   | `src/data/site.ts` — change if you want a different one           |
| Local git remote still points at the old repo name       | `git remote set-url origin git@github.com:vedranchi/vchichov.git` |
| Root `handoff.md` documents the decommissioned Oracle VM | delete it; it is gitignored but misleading                        |
| `src/assets/` images now unreferenced                    | `glucoread.png`, `nc2026.jpg` — reuse on the blog or remove       |
| `.agents/`, `skills-lock.json`, `temp_ss/` untracked     | design skills and the reference screenshot; commit or delete      |
| Cycling scraper has no scheduled home                    | GitHub Actions IPs are Cloudflare-blocked by procyclingstats      |

### Retired components

Recoverable with `git checkout 474a3e1 -- <path>`:
`BlogSpotlight`, `CyclingSpotlight`, `ProjectSpotlight`, `ScreenshotWindow`, `HomeSection`,
and the old pixel `ProjectCard`. `PixelFarmScene` survived and now heads `/archive`.

---

## The farm (added after the split)

`blog.vchichov.com/` is a small walkable farm; the card list moved to `/archive`.

- **Playing it:** click the farm, walk with the arrow keys or WASD, press Enter to look at
  what is in front of you. On a phone, tap where to go; tapping a crop walks up to it and
  opens it.
- **Crops are posts.** One per post, newest nearest the gate; the field adds rows as posts
  come in. A post's first tag picks the species (wheat, tomatoes, pumpkin, sunflower), so a
  tag always grows the same crop. A post sprouts in its first week and is ripe after a
  month — worked out when the page loads, so crops keep growing between deploys.
- **Also on the farm:** a signpost to vchichov.com, and the farmhouse door (a hint).
- **Movement** is free rather than tile-stepped, eased into the tile lanes, so keys answer on
  the next frame; the farmer always stops on a whole tile. Under reduced motion they jump
  tile to tile.
- **Code:** `sites/blog/farm/` — `map.ts` (layout, pathfinding), `sprites.ts` (pixel art as
  character grids), `engine.ts` (movement, drawing, day/night), `input.ts`, `main.ts`
  (wiring, dialog). `components/Farm.astro` is the page markup and the fallback list.
- **The sky:** every blog page has a sky at the top (`components/Backdrop.astro`) — sun and
  drifting clouds by day, moon and stars by night — and a grass strip along the footer. The
  sun/moon is the site's day/night switch; the nav no longer has one.
