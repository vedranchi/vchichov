import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * Every post, newest first. Drafts show in `npm run dev` and are left out of the build —
 * every page, the feed and the sitemap go through here, so a draft can't leak through one
 * of them by forgetting the filter.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** The link to a post. Posts live under /blog; the filename is the slug. */
export const postHref = (post: Post) => `/blog/${post.id}`;

/**
 * The view-transition name a post's title carries wherever it appears, so the browser can
 * morph it from a list row into the article's heading. One per page, so it's keyed by slug.
 */
export const transitionName = (id: string) => `post-${id.replace(/[^a-z0-9-]/gi, '-')}`;
