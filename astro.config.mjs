// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { site } from './src/data/site.ts';

// The professional portfolio at vchichov.com.
//
// This repo builds two sites from one tree. Both share `src/` (content, data, lib) and
// differ only by `srcDir`/`outDir`. The farm blog is the other one — see
// astro.config.blog.mjs. No Markdown is rendered here, so the wikilink plugin is omitted.
export default defineConfig({
  site: site.urls.www,
  srcDir: './sites/www',
  outDir: './dist',
  integrations: [sitemap()],
});
