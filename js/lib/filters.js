// filters.js: the pencil and watercolor filters, ported from reference/filters.svg.
//
// The reference tuned every number for a 720 x 960 image. Filter primitives work in
// user units (image pixels), so on a bigger or smaller image the same numbers would look
// finer or coarser. Each builder takes k = imageWidth / 720 and scales the lengths:
// blur radii and displacement grow with k, noise frequencies shrink with 1/k.

const n = (value) => Number(value.toFixed(4));

/** Pencil: grayscale, invert, blur, color-dodge (the classic sketch trick), darken, then grain. */
export function pencilFilter(id, k) {
  return `
  <filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray"/>
    <feComponentTransfer in="gray" result="inv">
      <feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/>
    </feComponentTransfer>
    <feGaussianBlur in="inv" stdDeviation="${n(3.2 * k)}" result="blur"/>
    <feBlend in="blur" in2="gray" mode="color-dodge" result="dodge"/>
    <feComponentTransfer in="dodge" result="dark">
      <feFuncR type="gamma" exponent="2.6"/><feFuncG type="gamma" exponent="2.6"/><feFuncB type="gamma" exponent="2.6"/>
    </feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency="${n(0.9 / k)}" numOctaves="2" seed="7" result="noise"/>
    <feColorMatrix in="noise" type="matrix" values=".22 0 0 0 .8  .22 0 0 0 .8  .22 0 0 0 .8  0 0 0 0 1" result="grain"/>
    <feBlend in="dark" in2="grain" mode="multiply" result="grainy"/>
    <feColorMatrix in="grainy" type="matrix" values=".9 0 0 0 .04  0 .92 0 0 .04  0 0 .9 0 .05  0 0 0 1 0"/>
  </filter>`;
}

/** Watercolor: wobble, soften, posterize into washes, darken pigment edges, lighten, add paper tooth.
    Tuned from the reference: less blur, stronger pigment edges, and lighter washes, so it reads
    as paint rather than as a blurry photo. */
export function watercolorFilter(id, k) {
  return `
  <filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${n(0.013 / k)}" numOctaves="2" seed="4" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="${n(20 * k)}" xChannelSelector="R" yChannelSelector="G" result="wobbled"/>
    <feGaussianBlur in="wobbled" stdDeviation="${n(2.2 * k)}" result="blurred"/>
    <feComponentTransfer in="blurred" result="soft">
      <feFuncR type="gamma" exponent=".72"/><feFuncG type="gamma" exponent=".72"/><feFuncB type="gamma" exponent=".75"/>
    </feComponentTransfer>
    <feComponentTransfer in="soft" result="steps">
      <feFuncR type="discrete" tableValues=".1 .3 .46 .6 .72 .83 .92 .98"/>
      <feFuncG type="discrete" tableValues=".1 .3 .46 .6 .72 .83 .92 .98"/>
      <feFuncB type="discrete" tableValues=".1 .3 .46 .6 .72 .83 .92 .98"/>
    </feComponentTransfer>
    <feComposite in="steps" in2="soft" operator="arithmetic" k2=".6" k3=".4" result="washes"/>
    <feColorMatrix in="washes" type="saturate" values=".72" result="muted"/>
    <feConvolveMatrix in="washes" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="edges"/>
    <feColorMatrix in="edges" type="matrix" values="-.34 -.34 -.34 0 1  -.34 -.34 -.34 0 1  -.34 -.34 -.34 0 1  0 0 0 0 1" result="pigment"/>
    <feBlend in="muted" in2="pigment" mode="multiply" result="pooled"/>
    <feComponentTransfer in="pooled" result="airy">
      <feFuncR type="linear" slope=".68" intercept=".3"/><feFuncG type="linear" slope=".68" intercept=".3"/><feFuncB type="linear" slope=".68" intercept=".28"/>
    </feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency="${n(0.6 / k)}" numOctaves="3" seed="11" result="paper"/>
    <feColorMatrix in="paper" type="matrix" values=".3 0 0 0 .74  .3 0 0 0 .74  .3 0 0 0 .73  0 0 0 0 1" result="tooth"/>
    <feBlend in="airy" in2="tooth" mode="multiply"/>
  </filter>`;
}

/**
 * The ragged-edge mask as a standalone SVG, so sketches bleed into the paper instead of
 * ending in a hard rectangle. Insets and raggedness are the reference's, scaled by k:
 * watercolor uses the rougher edge, pencil the softer one.
 */
export function edgeMaskSvg(width, height, kind) {
  const k = width / 720;
  const edge = kind === 'watercolor'
    ? { inset: 44, freq: 0.022, octaves: 4, seed: 2, scale: 54, blur: 3.5 }
    : { inset: 30, freq: 0.05, octaves: 3, seed: 9, scale: 22, blur: 9 };
  const inset = n(edge.inset * k);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
  <filter id="r" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="${n(edge.freq / k)}" numOctaves="${edge.octaves}" seed="${edge.seed}" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="${n(edge.scale * k)}" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation="${n(edge.blur * k)}"/>
  </filter>
  <rect x="${inset}" y="${inset}" width="${n(width - 2 * inset)}" height="${n(height - 2 * inset)}" fill="#fff" filter="url(#r)"/>
</svg>`;
}

/** A self-contained SVG that draws the photo (as a data URL) through one of the filters. */
export function drawingSvg(width, height, kind, photoDataUrl) {
  const k = width / 720;
  const filter = kind === 'watercolor' ? watercolorFilter('f', k) : pencilFilter('f', k);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${filter}</defs>
  <image href="${photoDataUrl}" width="${width}" height="${height}" filter="url(#f)"/>
</svg>`;
}
