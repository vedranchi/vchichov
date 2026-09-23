// Central config shared by BOTH sites. Edit this to change names, nav, and links everywhere.
//
// This repo builds two sites: the portfolio at vchichov.com (sites/www) and the farm blog
// at blog.vchichov.com (sites/blog). `urls` below is the single source of both domains —
// canonical links, Open Graph URLs, rss.xml, the sitemaps and robots.txt all derive from
// it via each build's `site` config. Never hard-code a host in a page or in public/.

export const urls = {
  www: 'https://vchichov.com',
  blog: 'https://blog.vchichov.com',
} as const;

export const site = {
  name: 'Vedran Chichov',
  shortName: 'Vedran',
  email: 'vchichovv@gmail.com',
  urls,
  // One description per site — they are different places with different jobs, so a single
  // joint tagline no longer describes either.
  descriptions: {
    www:
      'Vedran Chichov — I write software for hardware that measures people. ' +
      'Projects, background, and how to reach me.',
    blog:
      'Writing and race results from Vedran Chichov: notes on building software, ' +
      'bike racing, and whatever else is growing on the farm.',
  },
  // Vedran's club. cycling.json carries the full team name; this is just the link for it.
  team: { name: 'Velo-M Termalift', url: 'https://cyclingvelom.com/' },
  // Each site gets its own nav. Cross-site links are labelled by their destination rather
  // than with an arrow, so it is obvious you are leaving for the other domain.
  nav: {
    www: [
      { href: '/', label: 'Home', external: false },
      { href: '/projects', label: 'Work', external: false },
      { href: '/about', label: 'About', external: false },
      { href: '/contact', label: 'Contact', external: false },
      { href: urls.blog, label: 'Blog', external: true },
    ],
    blog: [
      { href: '/', label: 'posts', external: false },
      { href: '/cycling', label: 'cycling', external: false },
      { href: urls.www, label: 'vchichov.com', external: true },
    ],
  },
  // `me: true` marks a profile that is Vedran himself — the footer only puts rel="me" on
  // those. The team site is his club, not his identity, so it stays false.
  socials: [
    { href: 'https://github.com/vedranchi', label: 'GitHub', me: true },
    {
      href: 'https://www.procyclingstats.com/rider/vedran-cicov/',
      label: 'ProCyclingStats',
      me: true,
    },
    { href: 'https://cyclingvelom.com/', label: 'My team', me: false },
  ],
} as const;

export type NavItem = (typeof site.nav.www)[number] | (typeof site.nav.blog)[number];
