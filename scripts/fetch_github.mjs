#!/usr/bin/env node
// Fetch public repos for a GitHub user and write them to src/data/projects.json.
// Runs locally (`npm run sync:projects`) and in CI. Honors GITHUB_TOKEN if set
// (higher rate limit); works unauthenticated for public data too.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const USER = process.env.GITHUB_USER ?? 'vedranchi';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data', 'projects.json');

// Repos to keep off the site even though they're public. Add a repo name here rather than
// editing src/data/projects.json — that file is generated and this script overwrites it.
const EXCLUDE = new Set(['pos-system']);

// GitHub's linguist can return an empty language breakdown for some repos. Fill those in by
// hand rather than showing nothing.
const MANUAL_LANGUAGES = {};

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': `${USER}-portfolio-site`,
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const res = await fetch(
  `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated&type=owner`,
  { headers },
);
if (!res.ok) {
  throw new Error(`GitHub API ${res.status} ${res.statusText}: ${await res.text()}`);
}
const repos = await res.json();

async function fetchLanguages(repo) {
  const res = await fetch(`https://api.github.com/repos/${USER}/${repo.name}/languages`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const byBytes = await res.json();
  // Most-used language first.
  const detected = Object.entries(byBytes)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  return detected.length > 0 ? detected : (MANUAL_LANGUAGES[repo.name] ?? []);
}

const showcased = repos.filter((r) => !r.fork && !r.archived && !r.private && !EXCLUDE.has(r.name));

const projects = (
  await Promise.all(
    showcased.map(async (r) => ({
      name: r.name,
      description: r.description ?? '',
      url: r.html_url,
      homepage: r.homepage || null,
      languages: await fetchLanguages(r),
      topics: r.topics ?? [],
      stars: r.stargazers_count ?? 0,
      updatedAt: r.pushed_at,
    })),
  )
)
  // Most recently worked-on first.
  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

const payload = {
  generatedAt: new Date().toISOString(),
  user: USER,
  projects,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(`Wrote ${projects.length} project(s) for @${USER} to ${OUT}`);
