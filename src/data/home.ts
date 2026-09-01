// What the homepage puts in its shop window. Change these to feature something else —
// no layout or CSS to touch.

export const home = {
  /** Repo name from src/data/projects.json to spotlight. Its blurb, languages, topics and
   *  links all still come from that generated file, so `npm run sync:projects` flows through. */
  featuredProject: 'glucoread',

  /** Blog post to pin, by filename slug in src/content/blog. Falls back to the newest
   *  published post if this one is missing or still a draft. */
  pinnedPost: 'welcome',

  /** Alt text for the two photos in src/assets. Describes the scene, names nobody. */
  alt: {
    project: 'The GlucoRead homepage: a glucose trend chart plotted across one day.',
    cycling:
      'Three riders in Velo-M Termalift kit on the national championship podium, ' +
      'Vedran on the top step with the gold medal.',
  },
} as const;
