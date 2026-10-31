// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';

import remarkWikilinks from './src/lib/remark-wikilinks.mjs';
import { site } from './src/data/site.ts';

// vchichov.com: the blog, projects, about, cycling and work-with-me pages in one site.
//
// The blog's posts are the Obsidian vault at src/content/blog (see src/content.config.ts).
export default defineConfig({
  site: site.url,
  integrations: [sitemap()],
  markdown: {
    // Obsidian [[wiki links]] -> /blog/<slug>. See src/lib/remark-wikilinks.mjs. It's a
    // remark plugin, so posts render through the unified (remark/rehype) pipeline.
    processor: unified({ remarkPlugins: [remarkWikilinks] }),
    // Code blocks carry both palettes as CSS variables; src/styles/prose.css picks one from
    // the page's data-theme, so a block follows the theme toggle like everything else.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
