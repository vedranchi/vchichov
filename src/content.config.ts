import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

// Blog posts are Markdown files in src/content/blog — this is the Obsidian vault.
// Point Obsidian at that folder and write normally; frontmatter drives the site.
// A post's filename is its slug: src/content/blog/welcome.md -> /blog/welcome.
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

export const collections = { blog };
