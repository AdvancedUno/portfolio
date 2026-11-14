// github.js: live repo data for project specimens, through api.js.
// Unauthenticated GitHub allows 60 requests an hour per visitor, so each response is cached
// for an hour and backed by a saved real response in data/fallback/. No token, ever.

import { fetchJSON, HOUR } from '../api.js';
import { fromRoot } from './data.js';

const API = 'https://api.github.com/repos';

/**
 * Repo details and language breakdown for one repo.
 * @returns {Promise<{repo: object|null, languages: {name: string, share: number}[], source: string}>}
 */
export async function repoTracks(owner, repo) {
  const base = `${API}/${owner}/${repo}`;
  const [info, langs] = await Promise.all([
    fetchJSON(base, { ttl: HOUR, fallback: fromRoot(`./data/fallback/github-${repo}.json`) }),
    fetchJSON(`${base}/languages`, { ttl: HOUR, fallback: fromRoot(`./data/fallback/github-${repo}-languages.json`) }),
  ]);
  const bytes = Object.entries(langs.data ?? {}).map(([name, n]) => [canonical(name), n]);
  const total = bytes.reduce((sum, [, n]) => sum + n, 0);
  const languages = total
    ? bytes.map(([name, n]) => ({ name, share: n / total })).sort((a, b) => b.share - a.share)
    : [];
  return { repo: info.data, languages, source: info.source };
}

// GitHub spells a few languages differently from the data files.
const SPELLING = { Cuda: 'CUDA' };
export const canonical = (name) => SPELLING[name] ?? name;

// Build and scripting tools show in the pencil strokes but are not a project's habitat.
const TOOLING = new Set(['CMake', 'Makefile', 'Shell', 'PowerShell', 'Batchfile', 'Dockerfile', 'Tree-sitter Query']);
export const isHabitat = (name) => !TOOLING.has(name);

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 days ago", "last month", "2 years ago". */
export function timeAgo(iso, now = Date.now()) {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size || unit === 'minute') return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

// Colored-pencil inks for languages, from the palette. The same language always gets the
// same ink across the page, in the order languages are first seen.
const INKS = ['#8fa58a', '#c39a3f', '#6a8399', '#8f4632', '#7d6b8f', '#5d6157'];
const assigned = new Map();
export function inkFor(language) {
  if (!assigned.has(language)) assigned.set(language, INKS[assigned.size % INKS.length]);
  return assigned.get(language);
}

/**
 * The language breakdown as colored-pencil strokes, each as long as its share.
 * Languages under 4% are folded into "Other".
 */
export function languageStrokes(languages) {
  const main = languages.filter((l) => l.share >= 0.04);
  const other = languages.filter((l) => l.share < 0.04).reduce((sum, l) => sum + l.share, 0);
  const parts = other > 0 ? [...main, { name: 'Other', share: other }] : main;

  const W = 180;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} 14`);
  svg.setAttribute('class', 'lang-strokes');
  svg.setAttribute('aria-hidden', 'true');
  let x = 3;
  parts.forEach((part, i) => {
    const length = Math.max(part.share * (W - 6), 4);
    // Two slightly offset passes, like going over a line twice with a colored pencil.
    for (const [dy, opacity] of [[0, 0.9], [1.4, 0.45]]) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const y = 7 + dy + (i % 2 ? 0.6 : -0.6);
      path.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} q${(length / 2).toFixed(1)} ${i % 2 ? 1.2 : -1.2} ${length.toFixed(1)} 0`);
      path.setAttribute('stroke', part.name === 'Other' ? '#9a9c94' : inkFor(part.name));
      path.setAttribute('stroke-opacity', String(opacity));
      svg.append(path);
    }
    x += length;
  });
  const caption = parts.map((p) => `${p.name} ${Math.round(p.share * 100)}%`).join(', ');
  return { svg, caption };
}
