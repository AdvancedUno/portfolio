// api.js: every external API request on the site goes through fetchJSON().
//
//   const { data, source } = await fetchJSON(url, { ttl: HOUR, fallback: './data/fallback/x.json' });
//
// It never throws. `source` tells the caller where the data came from, so each
// section can show its own themed note when it is not live:
//   'live'      fresh from the network
//   'cache'     from sessionStorage, still within its TTL
//   'stale'     the network failed, so an expired cached copy was used
//   'fallback'  the network failed and nothing was cached, so the saved response was used
//   'none'      nothing worked; data is null

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

const CACHE_PREFIX = 'fieldguide:v1:';

// Requests already on their way, keyed by URL, so two sections asking for the
// same thing at the same moment share one network call.
const inFlight = new Map();

/**
 * Fetch JSON with a sessionStorage cache, a timeout, and a fallback.
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.ttl=0]          How long a cached copy stays fresh, in ms. 0 means do not cache.
 * @param {number} [options.timeoutMs=6000] Abort the request after this many ms.
 * @param {string|*} [options.fallback]     A path to a saved response (resolved against the page,
 *                                          for example './data/fallback/github-codecache.json'),
 *                                          or a ready-made value to return as is.
 * @param {object} [options.headers]        Extra request headers (for example an Authorization key).
 * @returns {Promise<{data: *, source: 'live'|'cache'|'stale'|'fallback'|'none'}>}
 */
export async function fetchJSON(url, { ttl = 0, timeoutMs = 6000, fallback, headers } = {}) {
  const cached = readCache(url);
  if (cached && !isExpired(cached)) {
    return { data: cached.data, source: 'cache' };
  }

  try {
    const data = await fetchShared(url, timeoutMs, headers);
    if (ttl > 0) writeCache(url, data, ttl);
    return { data, source: 'live' };
  } catch {
    // An expired copy from this session is fresher than the saved fallback file.
    if (cached) return { data: cached.data, source: 'stale' };

    const saved = await loadFallback(fallback);
    if (saved !== undefined) return { data: saved, source: 'fallback' };

    return { data: null, source: 'none' };
  }
}

/** Remove every cached response (handy while developing: run it from the console). */
export function clearCache() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: nothing to clear.
  }
}

// ---------- internals ----------

/** Join an identical request that is already in flight, or start a new one. */
function fetchShared(url, timeoutMs, headers) {
  if (inFlight.has(url)) return inFlight.get(url);
  const request = fetchWithTimeout(url, timeoutMs, headers).finally(() => inFlight.delete(url));
  inFlight.set(url, request);
  return request;
}

/** Fetch and parse JSON, aborting after timeoutMs. Throws on network errors, non-2xx, or bad JSON. */
async function fetchWithTimeout(url, timeoutMs, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...headers },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Load the fallback: fetch it if it is a path, otherwise return the value itself. */
async function loadFallback(fallback) {
  if (fallback === undefined || fallback === null) return undefined;
  if (typeof fallback !== 'string') return fallback;
  try {
    // Saved responses are local files, so a short timeout is plenty.
    return await fetchWithTimeout(fallback, 4000);
  } catch {
    return undefined;
  }
}

/** Read a cache entry ({ savedAt, ttl, data }) or null. Storage can be blocked in private modes. */
function readCache(url) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + url);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** True once an entry has outlived its TTL. */
function isExpired(entry) {
  return Date.now() - entry.savedAt > entry.ttl;
}

/** Save a response. If storage is full or blocked, the site just fetches again next time. */
function writeCache(url, data, ttl) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + url, JSON.stringify({ savedAt: Date.now(), ttl, data }));
  } catch {
    // Quota exceeded or storage disabled: skip caching.
  }
}
