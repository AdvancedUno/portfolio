// tilt.js: placed objects (labels, photos, postcards) sit slightly off-axis.
// Each element with data-tilt="<seed>" gets a --tilt between -2.5deg and 2.5deg,
// derived from its seed string, so the same object has the same tilt on every visit.

const MAX_TILT = 2.5;

/** Set --tilt on every [data-tilt] element inside root. */
export function applyTilts(root = document) {
  for (const el of root.querySelectorAll('[data-tilt]')) {
    el.style.setProperty('--tilt', `${tiltFor(el.dataset.tilt)}deg`);
  }
}

/** Map a seed string to a tilt in degrees, rounded to 0.1deg. */
export function tiltFor(seed) {
  const unit = hash(seed) / 0xffffffff;              // 0..1
  return Math.round((unit * 2 - 1) * MAX_TILT * 10) / 10;
}

/** 32-bit FNV-1a hash: tiny, fast, and well spread for short strings. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
