import { site } from '../data/site.ts';

// Generated rather than kept in public/, so the sitemap URL follows site.url
// instead of quietly pointing at whatever host the site used to live on.
export function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site.url).href}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
