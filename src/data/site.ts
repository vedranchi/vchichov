// Central config for the site. Edit this to change the name, nav, and links everywhere.
//
// `url` is the single source of the domain. Canonical links, Open Graph URLs, rss.xml, the
// sitemap and robots.txt all derive from it via the build's `site` config. Never hard-code
// a host in a page or in public/.

export const site = {
  name: 'Vedran Chichov',
  shortName: 'Vedran',
  email: 'vchichovv@gmail.com',
  url: 'https://vchichov.com',
  description:
    'Vedran Chichov is a developer and software engineering student in Skopje. ' +
    'Writing on software and bike racing, the projects he has built, and how to work with him.',
  // Vedran's club. cycling.json carries the full team name; this is just the link for it.
  team: { name: 'Velo-M Termalift', url: 'https://cyclingvelom.com/' },
  nav: [
    { href: '/blog', label: 'Blog' },
    { href: '/projects', label: 'Projects' },
    { href: '/about', label: 'About' },
    { href: '/work-with-me', label: 'Work with me' },
  ],
  // `me: true` marks a profile that is Vedran himself — only those get rel="me". The team
  // site is his club, not his identity, so it stays false.
  socials: [
    { href: 'https://github.com/vedranchi', label: 'GitHub', me: true },
    {
      href: 'https://www.procyclingstats.com/rider/vedran-cicov/',
      label: 'ProCyclingStats',
      me: true,
    },
    { href: 'https://www.instagram.com/vchichovv/', label: 'Instagram', me: true },
    { href: 'https://cyclingvelom.com/', label: 'My team', me: false },
  ],
} as const;

export type NavItem = (typeof site.nav)[number];
