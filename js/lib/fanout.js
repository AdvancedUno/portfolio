// fanout.js: spreads map pins that would sit on top of each other.
// At world scale Gwacheon, Seoul, and the KATUSA stop are one point, and on a phone the
// U.S. stops crowd together too. Pins closer than minGap pixels form a cluster, and each
// cluster fans out in an arc above its center, in route order, with a leader line back
// to the true spot. Nothing moves when pins are already far enough apart.

/**
 * @param {{x: number, y: number}[]} points  pin positions in pixels
 * @param {{minGap?: number, radius?: number}} [options]
 * @returns {{dx: number, dy: number, fanned: boolean}[]} pixel offsets, one per point
 */
export function fanOut(points, { minGap = 26, radius = 30 } = {}) {
  const offsets = points.map(() => ({ dx: 0, dy: 0, fanned: false }));
  const clusterOf = points.map((_, i) => i);

  // Merge clusters until no two points from different clusters are within minGap.
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (clusterOf[i] !== clusterOf[j] && Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < minGap) {
          const from = clusterOf[j];
          const to = clusterOf[i];
          clusterOf.forEach((c, k) => { if (c === from) clusterOf[k] = to; });
          merged = true;
        }
      }
    }
  }

  const clusters = new Map();
  clusterOf.forEach((c, i) => clusters.set(c, [...(clusters.get(c) ?? []), i]));

  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    const cx = members.reduce((sum, i) => sum + points[i].x, 0) / members.length;
    const cy = members.reduce((sum, i) => sum + points[i].y, 0) / members.length;
    const r = Math.max(radius, members.length * 11);
    // An arc above the cluster: wider for bigger clusters, capped so it never wraps around.
    const span = Math.min(Math.PI * 1.1, (members.length - 1) * 0.62);
    members.forEach((i, n) => {
      const angle = -Math.PI / 2 - span / 2 + (span * n) / (members.length - 1);
      offsets[i] = {
        dx: cx + r * Math.cos(angle) - points[i].x,
        dy: cy + r * Math.sin(angle) - points[i].y,
        fanned: true,
      };
    });
  }
  return offsets;
}
