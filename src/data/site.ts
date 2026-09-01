// Central site configuration. Edit this to change nav, name, and links everywhere.

export const site = {
  name: 'Vedran Chichov',
  shortName: 'Vedran',
  tagline: 'code · cycling · words',
  description:
    'Personal site of Vedran Chichov — programming projects, cycling, and a blog. ' +
    'A fresh high-school grad from Macedonia building things and riding bikes.',
  url: 'https://vchichov.com',
  // Vedran's club. cycling.json carries the full team name; this is just the link for it.
  team: { name: 'Velo-M Termalift', url: 'https://cyclingvelom.com/' },
  nav: [
    { href: '/', label: 'Home' },
    { href: '/projects', label: 'Projects' },
    { href: '/cycling', label: 'Cycling' },
    { href: '/blog', label: 'Blog' },
  ],
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

export type NavItem = (typeof site.nav)[number];
