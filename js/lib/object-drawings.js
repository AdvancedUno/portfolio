// object-drawings.js: plain pencil drawings that stand in for an object until its photo
// arrives. They are generic shapes of the kind of thing (a violin, a leaf), not drawings of
// Uno's own objects, and the drawer labels them "Photo to come" so nobody mistakes them.
// Strokes use currentColor; .wash shapes take a watercolor tint from CSS.

const DRAWINGS = {
  'challenge-coins': `
    <g transform="rotate(-8 60 64)">
      <circle class="wash wash--slate" cx="76" cy="50" r="25"/>
      <circle cx="76" cy="50" r="25"/><circle cx="76" cy="50" r="19" stroke-dasharray="2 3"/>
      <circle class="wash wash--ochre" cx="50" cy="70" r="30"/>
      <circle cx="50" cy="70" r="30"/><circle cx="50" cy="70" r="23"/>
      <path d="M50 54l4.6 10 10.8 1.2-8 7.3 2.3 10.6L50 77.7l-9.7 5.4 2.3-10.6-8-7.3 10.8-1.2z"/>
    </g>`,
  'aikido-belt': `
    <g transform="rotate(-6 60 60)">
      <path d="M6 52c18-4 34-3 46-1M68 51c16-2 30-3 46 1M6 66c18-4 34-3 46-1M68 65c16-2 30-3 46 1"/>
      <path d="M6 52l1 14M114 53l-1 14" stroke-dasharray="2 2"/>
      <path class="wash wash--paper" d="M50 46h20l2 24H48z"/>
      <path d="M50 46h20l2 24H48z"/>
      <path class="wash wash--paper" d="M52 70l-14 40 12 3 10-36M66 70l12 40-12 3-6-36"/>
      <path d="M52 70l-14 40 12 3 10-36M66 70l12 40-12 3-6-36"/>
      <path d="M42 98l11 3M70 101l11-3" stroke-dasharray="1.5 2.5"/>
    </g>`,
  violin: `
    <g transform="rotate(-24 60 74)">
      <path class="wash wash--ochre" d="M60 48c-16 0-24 8-23 18 1 8 9 10 9 16s-12 8-13 22c-1 16 11 26 27 26s28-10 27-26c-1-14-13-16-13-22s8-8 9-16c1-10-7-18-23-18z"/>
      <path d="M60 48c-16 0-24 8-23 18 1 8 9 10 9 16s-12 8-13 22c-1 16 11 26 27 26s28-10 27-26c-1-14-13-16-13-22s8-8 9-16c1-10-7-18-23-18z"/>
      <path d="M57 50V14h6v36"/>
      <path d="M60 14c-6 0-7-4-7-7s3-5 6-4c3 1 3 4 1 5"/>
      <path d="M58.5 16v102M61.5 16v102" stroke-width=".8"/>
      <path d="M50 88c3 2-3 6 0 12M70 88c-3 2 3 6 0 12"/>
      <path d="M52 104h16"/>
      <path d="M56 112h8l-1 10h-6z"/>
    </g>`,
  shuttlecock: `
    <g transform="rotate(18 60 64)">
      <ellipse cx="60" cy="18" rx="30" ry="7"/>
      <path class="wash wash--paper" d="M30 18l18 76h24l18-76"/>
      <path d="M30 18l18 76M90 18L72 94M40 18l11 76M50 18l5 76M60 18v76M70 18l-5 76M80 18L69 94"/>
      <path d="M38 52c14 3 30 3 44 0M44 74c10 2 22 2 32 0" stroke-dasharray="2 2.5"/>
      <path class="wash wash--ochre" d="M47 94h26c0 10-6 18-13 18s-13-8-13-18z"/>
      <path d="M47 94h26c0 10-6 18-13 18s-13-8-13-18z"/>
    </g>`,
  'pressed-leaf': `
    <g transform="rotate(14 60 64)">
      <path class="wash wash--sage" d="M60 98C30 86 22 52 60 12c38 40 30 74 0 86z"/>
      <path d="M60 98C30 86 22 52 60 12c38 40 30 74 0 86z"/>
      <path d="M60 116c0-8 0-12 0-18M60 98c1-28 1-56 0-82"/>
      <path d="M60 80l-18-12M60 80l18-12M60 62l-16-14M60 62l16-14M60 44l-10-12M60 44l10-12"/>
    </g>`,
};

// For any other object: a blank specimen tag on a string.
const TAG = `
  <path class="wash wash--paper" d="M34 40h58l14 20-14 20H34z"/>
  <path d="M34 40h58l14 20-14 20H34z"/>
  <circle cx="92" cy="60" r="4"/>
  <path d="M96 60c10 0 14-12 10-20" stroke-dasharray="2 2"/>
  <path d="M44 54h34M44 66h24" stroke-dasharray="3 3"/>`;

/** A pencil drawing for an object id, as SVG markup. */
export function objectDrawing(id) {
  return `<svg class="obj__drawing" viewBox="0 0 120 128" aria-hidden="true" focusable="false">${DRAWINGS[id] ?? TAG}</svg>`;
}
