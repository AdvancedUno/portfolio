// data.js: loads the site's own JSON files from data/. Each file is fetched once and
// shared by every section that reads it. These are local files, not external APIs, so
// they do not go through api.js; a failure rejects and the caller shows its placeholder.

const siteRoot = new URL('../../', import.meta.url);
const files = new Map();

/** Load data/<name>.json. */
export function loadData(name) {
  if (!files.has(name)) {
    files.set(name, fetch(new URL(`data/${name}.json`, siteRoot)).then((response) => {
      if (!response.ok) throw new Error(`${name}.json: HTTP ${response.status}`);
      return response.json();
    }));
  }
  return files.get(name);
}

/** Resolve a path from the data files (like "./assets/photos/x.jpg") against the site root. */
export const fromRoot = (path) => new URL(path, siteRoot).href;
