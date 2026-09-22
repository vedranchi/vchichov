import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

// Blog posts are Markdown files in src/content/blog — this is the Obsidian vault.
// Point Obsidian at that folder and write normally; frontmatter drives the site.
//
// `base` resolves against the Astro `root`, which stays at the repo root for both builds,
// so this path is correct from either site and the vault never has to move.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Defined once and re-exported by BOTH sites' content.config.ts.
//
// Only the blog renders posts, but the two builds share a single generated
// .astro/types.d.ts at the repo root. If www declared no collections, whichever build ran
// last would decide whether `getCollection('blog')` type-checks — so `astro check` would
// pass or fail depending on build order. Declaring the same collections in both keeps the
// generated types identical either way. www loads two Markdown files and emits no pages
// from them.
export const collections = { blog };
