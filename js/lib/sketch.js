// sketch.js: a photo that appears as a pencil or watercolor sketch.
//
// Each sketch is two stacked layers: the real photo below, the drawing above.
//
// The drawing is "baked": the photo and its filter are packed into one self-contained SVG
// and shown as an ordinary <img>. The browser rasterizes that SVG once, so scrolling and
// the loupe (which only masks the top layer) never re-run the expensive filter. Baking
// happens only when a sketch nears the viewport, one at a time, so the page stays smooth.

import { drawingSvg, edgeMaskSvg } from './filters.js';
import { attachLoupe } from './loupe.js';
import { fromRoot } from './data.js';

const svgUrl = (svg) => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

/**
 * Build a sketch figure for one photos.json entry.
 * @param {{id, src, webp, alt, width, height, filter, pencilWeight?}} photo   pencilWeight darkens a pencil sketch (default 1)
 * @param {{caption?: string}} [options]
 * @returns {HTMLElement} a <figure class="sketch">
 */
export function createSketch(photo, { caption } = {}) {
  const kind = photo.filter === 'watercolor' ? 'watercolor' : 'pencil';
  const hintId = `sketch-hint-${photo.id}`;

  const figure = document.createElement('figure');
  figure.className = `sketch sketch--${kind}`;
  figure.style.setProperty('--ar', `${photo.width} / ${photo.height}`);
  figure.style.setProperty('--edge', `url("${svgUrl(edgeMaskSvg(photo.width, photo.height, kind))}")`);
  figure.innerHTML = `
    <div class="sketch__stage" tabindex="0" role="img" aria-describedby="${hintId}">
      <div class="sketch__inner">
        <picture class="sketch__photo">
          <source type="image/webp" srcset="${fromRoot(photo.webp)}">
          <img src="${fromRoot(photo.src)}" alt="" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async">
        </picture>
        <img class="sketch__drawing" alt="" width="${photo.width}" height="${photo.height}">
      </div>
      <span class="loupe-rim" aria-hidden="true"></span>
    </div>
    <figcaption>
      ${caption ? `<span class="sketch__caption"></span>` : ''}
      <span class="sketch__hint" id="${hintId}">
        <span class="sketch__hint-hover">Hover to see the real photo.</span>
        <span class="sketch__hint-touch">Press and hold to see the real photo.</span>
        <span class="visually-hidden">Press L to look through the loupe, then arrow keys to move it.</span>
      </span>
    </figcaption>`;

  const stage = figure.querySelector('.sketch__stage');
  stage.setAttribute('aria-label', photo.alt);
  if (caption) figure.querySelector('.sketch__caption').textContent = caption;

  attachLoupe(figure);
  whenNear(figure, () => queueBake(figure, kind, photo.pencilWeight ?? 1));
  return figure;
}

// ---------- baking, one at a time, when near the viewport ----------

let queue = Promise.resolve();

function queueBake(figure, kind, weight) {
  queue = queue.then(() => bake(figure, kind, weight)).catch(() => {
    // If baking fails, the sketch stays a soft gray photo: still readable, never broken.
    figure.classList.add('is-unbaked');
  });
}

async function bake(figure, kind, weight) {
  const photoImg = figure.querySelector('.sketch__photo img');
  const drawing = figure.querySelector('.sketch__drawing');
  photoImg.loading = 'eager';
  if (!photoImg.complete) await new Promise((resolve, reject) => {
    photoImg.addEventListener('load', resolve, { once: true });
    photoImg.addEventListener('error', reject, { once: true });
  });

  // Use whichever file the browser chose (WebP or the JPEG fallback) as the drawing's source.
  const blob = await (await fetch(photoImg.currentSrc || photoImg.src)).blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Draw at the photo's own pixel size (from photos.json), so the filter tuning holds.
  const width = Number(photoImg.getAttribute('width'));
  const height = Number(photoImg.getAttribute('height'));
  drawing.src = svgUrl(drawingSvg(width, height, kind, dataUrl, weight));
  await drawing.decode();
  figure.classList.add('is-drawn');
}

/** Run fn once, the first time el comes within 600px of the viewport. */
function whenNear(el, fn) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      fn();
    }
  }, { rootMargin: '600px 0px' });
  observer.observe(el);
}
