// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import remarkWikilinks from './src/lib/remark-wikilinks.mjs';
import { site } from './src/data/site.ts';

// The farm blog at blog.vchichov.com. Run it with `npm run dev:blog` / `npm run build:blog`.
//
// `root` stays the repo root, so the content collection's glob base in
// sites/blog/content.config.ts still resolves to ./src/content/blog — that path is an
// Obsidian vault and must not move.
export default defineConfig({
  site: site.urls.blog,
  srcDir: './sites/blog',
  outDir: './dist-blog',
  integrations: [sitemap()],
  markdown: {
    // Obsidian [[wiki links]] -> /<slug>. See src/lib/remark-wikilinks.mjs.
    remarkPlugins: [remarkWikilinks],
  },
});
