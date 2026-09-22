// The portfolio renders no Markdown, but it declares the same collections as the blog so
// both builds generate identical content types into the shared .astro/ directory. Without
// this, `astro check` would pass or fail depending on which build ran last.
export { collections } from '@shared/lib/collections';
