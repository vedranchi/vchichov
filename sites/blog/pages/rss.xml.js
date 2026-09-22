import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '@shared/data/site.ts';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  return rss({
    title: `${site.name} — blog`,
    description: site.descriptions.blog,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/${post.id}/`,
    })),
  });
}
