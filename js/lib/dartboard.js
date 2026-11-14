// dartboard.js: the geometry of a standard dartboard, drawn in pencil, and its scoring.
//
// Units are the stage's SVG units. The board is centered at (CX, CY) with radius R, the
// outer edge of the double ring. Ring sizes are a regulation board's, as fractions of R:
// bull 6.35mm, outer bull 15.9mm, treble 99-107mm, double 162-170mm.

export const STAGE_W = 400;
export const STAGE_H = 520;
export const CX = 200;
export const CY = 196;
export const R = 168;

// Clockwise from the top.
export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const RINGS = { bull: 0.0374, outerBull: 0.0935, trebleIn: 0.582, trebleOut: 0.629, doubleIn: 0.953 };

/**
 * Score a landing point.
 * @returns {{score: number, label: string, short: string, segment: number|null, bull: boolean}}
 */
export function scoreAt(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  const r = Math.hypot(dx, dy) / R;
  if (r <= RINGS.bull) return { score: 50, label: 'Bullseye', short: 'Bull', segment: null, bull: true };
  if (r <= RINGS.outerBull) return { score: 25, label: 'Outer bull', short: '25', segment: null, bull: false };
  if (r > 1) return { score: 0, label: 'Off the board', short: 'Miss', segment: null, bull: false };
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // 0 at the top, clockwise
  const segment = ORDER[((Math.round(angle / 18) % 20) + 20) % 20];
  if (r >= RINGS.doubleIn) return { score: segment * 2, label: `Double ${segment}`, short: `D${segment}`, segment, bull: false };
  if (r >= RINGS.trebleIn && r <= RINGS.trebleOut) return { score: segment * 3, label: `Treble ${segment}`, short: `T${segment}`, segment, bull: false };
  return { score: segment, label: `Single ${segment}`, short: `${segment}`, segment, bull: false };
}

/** An annular sector path, angles in degrees with 0 at the top, going clockwise. */
function sector(r0, r1, a0, a1) {
  const p = (r, a) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(CX + r * Math.cos(t)).toFixed(2)} ${(CY + r * Math.sin(t)).toFixed(2)}`;
  };
  return `M${p(r0, a0)} L${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}

/** The board as SVG markup: washes for the rings, graphite for dark beds, pencil wires. */
export function boardMarkup() {
  const parts = [];
  ORDER.forEach((_, i) => {
    const a0 = i * 18 - 9;
    const a1 = a0 + 18;
    const dark = i % 2 === 0;
    const bed = dark ? 'bed bed--dark' : 'bed bed--light';
    const ring = dark ? 'ring ring--rust' : 'ring ring--sage';
    parts.push(
      `<path class="${bed}" d="${sector(R * RINGS.outerBull, R * RINGS.trebleIn, a0, a1)}"/>`,
      `<path class="${ring}" d="${sector(R * RINGS.trebleIn, R * RINGS.trebleOut, a0, a1)}"/>`,
      `<path class="${bed}" d="${sector(R * RINGS.trebleOut, R * RINGS.doubleIn, a0, a1)}"/>`,
      `<path class="${ring}" d="${sector(R * RINGS.doubleIn, R, a0, a1)}"/>`,
    );
  });
  const numbers = ORDER.map((n, i) => {
    const t = ((i * 18 - 90) * Math.PI) / 180;
    const rr = R + 15;
    return `<text class="number" x="${(CX + rr * Math.cos(t)).toFixed(1)}" y="${(CY + rr * Math.sin(t)).toFixed(1)}">${n}</text>`;
  }).join('');
  return `
    <defs>
      <filter id="board-pencil" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="12" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <pattern id="graphite" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
        <rect width="5" height="5" fill="#57594f"/>
        <path d="M0 2.5h5" stroke="#3d3f37" stroke-width="1.6"/>
      </pattern>
    </defs>
    <g filter="url(#board-pencil)">
      <circle class="surround" cx="${CX}" cy="${CY}" r="${R + 27}"/>
      ${parts.join('')}
      <circle class="ring ring--sage" cx="${CX}" cy="${CY}" r="${R * RINGS.outerBull}"/>
      <circle class="ring ring--rust" cx="${CX}" cy="${CY}" r="${R * RINGS.bull}"/>
      <circle class="wire" cx="${CX}" cy="${CY}" r="${R}"/>
      ${numbers}
    </g>`;
}
