# Plan — moving vchichov.com off Vercel to self-hosting

**Status:** parked. Nothing here is built yet. Vedran will say when to start.
**Written:** 2026-10-31, right after PR #11 (one site + redesign) was opened.
**Read first:** `AGENTS.md` (hard rules), then `docs/handoff.md` (where PR #11 left things).

This file is a resume point. When work starts, confirm the open decisions below with
Vedran, re-check the "verify before relying on it" facts, then work through the phases on
a `feat/self-hosting` branch. Update this file as decisions get made, and delete it (or
fold what's still true into `AGENTS.md` and the handoff) once the move is done.

> **The repo is public.** No server IPs, hostnames of the VM, SSH keys, SMTP passwords or
> tokens in anything committed: not in this file, not in workflow files, not in configs.
> They go in GitHub Actions secrets and in a gitignored `.env` on the server. Domain names
> are public and fine.

---

## Why

- Vedran wants to run the site himself rather than on Vercel.
- Vedran wants a **contact form on Work with me** that sends by itself and answers "Your
  message has been sent" on the page. That needs something to receive it, so the page has
  no form until this move: today it shows his email and links. The plan is a small
  endpoint on his own server that emails him, with no third-party form service.
- **Hard requirement:** the form must never fall back to opening the visitor's email app
  (`mailto:`). He tried that version and rejected it. With JS off, the form still posts to
  the endpoint and the server answers with the sent page; it doesn't hand off to a mail
  client.

## Decisions still open (ask Vedran)

1. **Which machine.** This is the big one.
   - **A. A second Oracle Always Free VM (recommended).** GlucoRead runs on one of the two
     free AMD micro instances (`VM.Standard.E2.1.Micro`, 1 GB RAM); the second one is enough
     for a static site plus a tiny Node endpoint. It keeps the site separate from
     GlucoRead, which `AGENTS.md` requires. He already knows this exact setup (Docker
     Compose + Caddy) from GlucoRead. An Ampere A1 VM is the roomier alternative, but A1
     capacity is often unavailable in busy regions.
   - **B. The same VM as GlucoRead.** Quickest: GlucoRead's Caddy can serve one more
     domain. But a bad deploy, an outage or a compromise then hits both, and `AGENTS.md`
     says in so many words _"do not deploy this project onto it, or couple the two in any
     way."_ Only do this if Vedran explicitly lifts that rule, and then update `AGENTS.md`
     to say so.
   - A home server was also floated and set aside; Vedran asked about Oracle.
2. **Which mailbox sends the form's email.** Simplest: his Gmail with an **app password**
   over SMTP (needs 2-step verification on the account). Gmail only allows sending _as_ the
   account itself, so the visitor's address goes in `Reply-To`, not `From`.
3. **PR previews.** Vercel gives every PR a preview URL; self-hosting loses that. Options:
   live without it (review with `npm run preview` locally), or a second Caddy site on the
   same VM for a `preview.` subdomain later. Default: live without it.
4. **Deploy trigger.** Default: on every push to `main`, the same as today. Confirm.

## Where things stand (after PR #11 merges)

- Astro 7, fully static, `npm run build` → `dist/`. One Vercel project serves
  `vchichov.com` (primary) and `www.vchichov.com` (redirects to the apex), and will also
  hold `blog.vchichov.com` once Vedran moves it (handoff steps).
- `vercel.json` holds the redirects that have to survive the move:
  - `/contact` → `/work-with-me` (apex only)
  - everything on `blog.vchichov.com` → `https://vchichov.com/...`: `/` and `/archive` →
    `/blog`, `/tags/*` → `/blog/tags/*`, `/cycling`, `/rss.xml`, `/robots.txt`,
    `/sitemap-index.xml` and `/sitemap-0.xml` → the same path, `/<slug>` →
    `/blog/<slug>`, and anything else → the same path on the apex.
  - Vercel does the `www` → apex redirect at the domain level, not in `vercel.json`.
- DNS for `vchichov.com` is at **Namecheap** (apex and `www` point at Vercel; `blog` is a
  CNAME to Vercel).
- Pages make no third-party requests: fonts and icons are bundled. Keep it that way.

## Target architecture

```text
browser ──HTTPS──▶ Caddy (container, ports 80/443, automatic Let's Encrypt)
                     ├── static files: dist/client  (every page)
                     ├── /api/*  ──▶ contact (container, Node, Astro standalone server)
                     └── redirects: www → apex, blog.vchichov.com → apex, /contact
contact ──SMTP 587──▶ Gmail ──▶ Vedran's inbox
```

- **Astro stays static.** Add the `@astrojs/node` adapter in `standalone` mode, keep
  `output: 'static'`, and mark only the new endpoint `export const prerender = false`.
  Every page is still prerendered HTML. The build then produces `dist/client/` (static
  files) and `dist/server/` (the Node entry for the endpoint).
- **Caddy serves the static files itself** and proxies only `/api/*` to Node. If the Node
  container dies, the site stays up; only the form stops.
- **Docker Compose on the VM**, two services: `caddy` and `contact`. This mirrors
  GlucoRead (no database here).
- **Build in GitHub Actions, not on the VM.** A 1 GB micro VM struggles to run
  `npm install` and `astro build`. CI builds the site, then either publishes a `contact`
  image to GHCR (the VM runs `docker compose pull && up -d`) or rsyncs `dist/` to the VM
  over SSH. The GHCR route is what GlucoRead's write-up recommends; prefer it for the Node
  side, and ship `dist/client` with it (copy it into the image, or into a volume Caddy
  mounts).

## Phases

### 1. Server (Vedran does the console parts; Claude can walk him through)

- Create the VM (Ubuntu, Always Free shape) in his Oracle tenancy, with an SSH key.
- Add swap if it's a 1 GB micro.
- Open 80 and 443 in **both** firewalls: the VCN security list _and_ the VM's own
  `iptables`. Oracle's Ubuntu images reject everything but SSH even after the security
  list is opened. Insert the ACCEPT rules above the REJECT rule, then
  `netfilter-persistent save`.
- Install Docker and the Compose plugin. Create a deploy user and a directory for the app.
- Put SMTP credentials in a `.env` on the server (never in git): `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`.

### 2. The contact endpoint (code, in the repo)

- `npm i @astrojs/node nodemailer` (+ `@types/nodemailer`). Wire the adapter in
  `astro.config.mjs`.
- `src/pages/api/contact.ts` (`prerender = false`), `POST` only:
  - read `name`, `email`, `message` from form data; trim; validate (all required, email
    shaped, message length cap of a few thousand characters, name cap);
  - **spam guards, no CAPTCHA service** (that would be a third-party request): a hidden
    honeypot field that must stay empty, a minimum fill time via a timestamp field, and
    a small in-memory per-IP rate limit (Caddy passes `X-Forwarded-For`);
  - send with nodemailer: `From` = the SMTP account, `Reply-To` = the visitor,
    `To` = `CONTACT_TO`, and a subject like "Message from {name} via vchichov.com";
  - answer for both kinds of client: a JS `fetch` gets JSON `{ ok }`; a plain form POST
    (no JS) gets a `303` redirect to `/work-with-me?sent=1` (or `?error=1`).
- `src/pages/work-with-me.astro`: put the form back. A finished, styled version exists in
  git: `git show 2deb5dc:src/pages/work-with-me.astro` (name, email and message fields,
  labels above, field borders in `--text-muted`, the form beside an "Elsewhere" column,
  one orange "Send message" button, a `role="status"` line). Take its markup and styles,
  but change it as follows:
  - `action="/api/contact"`, `method="post"`, no `enctype="text/plain"`;
  - delete its `mailto:` script and the "This opens your email app" note entirely;
  - add the honeypot and timestamp fields;
  - add a small script that `fetch`es the endpoint, disables the button while sending,
    then shows "Your message has been sent." (or the failure, keeping the typed text) in
    the status line and clears the form on success;
  - read `?sent=1` / `?error=1` for the no-JS path.
- Never log message bodies or addresses beyond what's needed to debug a failure.

### 3. Deploy config (in the repo, no secrets)

- `deploy/compose.yaml`: `caddy` (official image; ports 80 and 443; volumes for
  `caddy_data`/`caddy_config`, the static files and the `deploy/caddy/` **folder**) and
  `contact` (Node image running `dist/server/entry.mjs`, `env_file: .env`, internal port
  only).
- `deploy/caddy/Caddyfile`: the `vchichov.com` site (`root` + `file_server` for the
  static files, `handle /api/*` → `reverse_proxy contact:4321`, Astro's `404.html` as the
  error page, the `/contact` redirect); `www.vchichov.com` → a permanent `redir` to
  `https://vchichov.com{uri}`; `blog.vchichov.com` → the rules listed above.
  Keep their order: the named files above the single-segment slug, the catch-all last.
  Add cache headers for `/_astro/*` (hashed, so immutable).
- `.github/workflows/deploy.yml`: on push to `main`, run `npm ci`, `npm run check` and
  `npm run build`; build and push the image to GHCR; SSH to the VM (host, user and key
  from **secrets**) and run `docker compose pull && docker compose up -d`.
- Gotchas from GlucoRead: mount the Caddy **folder**, not the single file (a `git pull`
  or rsync replaces the file and the container keeps the old one). `.env` changes need
  `docker compose up -d --force-recreate contact`, not `restart`.

### 4. Cutover

1. A day ahead, lower the TTL on the Namecheap records (apex, `www`, `blog`).
2. Deploy to the VM while DNS still points at Vercel. Test with
   `curl --resolve vchichov.com:443:<vm-ip> ...` (the IP stays in the terminal, never in
   git). Caddy can't get certificates until DNS points at it, so test over HTTP first or
   accept the brief switch-over window.
3. Switch the Namecheap records to the VM: an `A` record for the apex, and `www` and `blog`
   as `A` records (or CNAMEs to the apex). Watch Caddy's logs for the certificates.
4. Run the verification list below.
5. **Keep the Vercel project for about a week** as the rollback. Then remove the domains
   from it, delete it, and delete `vercel.json` (Caddy holds the redirects now).
6. Rewrite the Deploy section of `AGENTS.md` and `docs/handoff.md`, and replace the "no
   contact form yet" notes there with how the form works now.

**Rollback:** point the Namecheap records back at Vercel. With the lowered TTL, that takes
effect within minutes.

## Verification

```bash
curl -sI https://vchichov.com/                    # 200, valid cert
curl -sI https://www.vchichov.com/about           # 308/301 -> https://vchichov.com/about
curl -sI https://vchichov.com/contact             # -> /work-with-me
curl -sI https://blog.vchichov.com/welcome        # -> https://vchichov.com/blog/welcome
curl -sI https://blog.vchichov.com/               # -> https://vchichov.com/blog
curl -sI https://blog.vchichov.com/tags/cycling   # -> https://vchichov.com/blog/tags/cycling
curl -sI https://blog.vchichov.com/rss.xml        # -> https://vchichov.com/rss.xml
curl -sI https://vchichov.com/nope                # 404 with the site's own 404 page
curl -sI https://vchichov.com/_astro/<some file>  # long-lived cache header
```

- The form, with JS: it sends, the email arrives, and Reply-To is the visitor. With JS off:
  it sends, and the page shows the sent state. Errors: with SMTP broken it shows a failure
  and keeps the text. The honeypot and fast-submit guards are rejected. The rate limit
  trips.
- Stop the `contact` container: pages still load and only the form fails, gracefully.
- Push a trivial change to `main`: the workflow deploys it with no manual step.
- The page still makes no third-party requests (browser devtools, network tab).

## Verify before relying on it

These were true as of writing but drift:

- Oracle Always Free limits (two AMD micros, A1 totals, idle-reclaim policy) and whether
  his tenancy still has a free AMD slot.
- Whether Oracle blocks outbound SMTP. Port 25 is commonly blocked by cloud providers;
  587 normally isn't. Test from the VM before writing code that depends on it.
- The current `@astrojs/node` API for Astro 7 (the adapter options, the `dist/` layout it
  produces, the entry file name).
- Gmail app-password availability on his account.

## Related

- Vedran's draft post on hosting with Oracle Always Free (GlucoRead's Docker Compose +
  Caddy setup, the iptables fix, building in CI and publishing to GHCR) is on the unmerged
  branch `feat/blog-folders`, at `src/content/blog/tech/oracle-hosting.md`. It's his
  writing; read it for the setup details and don't edit it.
- `docs/handoff.md`: the one-site move and the Vercel domain steps that come before this.
