// Generated rather than kept in public/, so the sitemap URL follows this build's own
// `site` config. public/ is shared by both builds, so a static file here would be wrong
// for one of them.
export function GET(context) {
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', context.site).href}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
