import rss from '@astrojs/rss';
import { site } from '../data/site.ts';
import { getPosts } from '../lib/posts.ts';

export async function GET(context) {
  const posts = await getPosts();

  return rss({
    title: site.name,
    description: site.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
  });
}
