// range.js: Range and migration, a map of everywhere Uno has lived.
//
//   Map:    d3 geoNaturalEarth1, rotated so the Pacific is in the middle (Korea on the left,
//           North America on the right), framed to fit the stops. Land is a watercolor wash
//           with pencil coastlines, baked once into an image like the sketches.
//   Route:  a dotted pencil line through the stops in order (great-circle arcs). It draws
//           itself as the visitor scrolls through the plate, with a small bird flying along.
//           The year slider scrubs the same route; whichever moved last wins.
//   Pins:   one button per stop, in route order for the keyboard; each opens a postcard.
//           Pins that would overlap fan out, with leader lines to their true spot.
//   Toggle: "Lived" pins and route, or "Want to go" pins (pencil circles).
//   Reduced motion: the route is fully drawn and the bird waits at the last stop.

import { loadData } from '../lib/data.js';
import { make } from '../lib/content.js';
import { edgeMaskSvg } from '../lib/filters.js';
import { fanOut } from '../lib/fanout.js';
import { openPostcard } from '../lib/postcard.js';

const D3_GEO = 'https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/+esm';
const TOPOJSON = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm';
const WORLD = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

// The map's drawing size. Phones get a taller, more tightly framed map so the stops spread
// out more; wide screens get more ocean and land around them. Chosen once, at load.
let W = 960;
let H = 480;
let MARGIN = [120, 110];
const SVG_NS = 'http://www.w3.org/2000/svg';
// Stops known only by country (the KATUSA years) are pinned at the country's center.
const COUNTRY_CENTERS = { KR: [127.9, 36.4], CA: [-101, 57], US: [-98.5, 39.5] };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

export async function initRange() {
  const plate = document.getElementById('range');
  const slot = plate?.querySelector('.fig');
  if (!slot) return;

  let places;
  let geo;
  try {
    [places, geo] = await Promise.all([loadData('places'), import(D3_GEO)]);
  } catch {
    return; // keep the "still being sketched" figure
  }

  const stops = places
    .map((place) => {
      const exact = Number.isFinite(place.lat) && Number.isFinite(place.lon);
      return { ...place, exact, coords: exact ? [place.lon, place.lat] : COUNTRY_CENTERS[place.country] };
    })
    .filter((stop) => stop.coords);

  if (innerWidth < 720) [W, H, MARGIN] = [600, 440, [56, 150]];
  const projection = geo.geoNaturalEarth1().rotate([161.5, 0]);
  projection.fitExtent([MARGIN, [W - MARGIN[0], H - MARGIN[1]]], { type: 'MultiPoint', coordinates: stops.map((s) => s.coords) });
  const pathOf = geo.geoPath(projection);
  for (const stop of stops) [stop.x, stop.y] = projection(stop.coords);

  const ui = buildDom();
  slot.replaceWith(ui.root);

  const lived = stops.filter((s) => s.lived === true);
  const wanted = stops.filter((s) => s.lived === false);
  const route = buildRoute(ui, lived, pathOf);
  const pins = buildPins(ui, lived, wanted, route);
  wireToggle(ui, pins, wanted);
  wireProgress(ui, route, lived, pins);

  bakeLand(ui, geo, pathOf).catch(() => ui.map.classList.add('is-landless'));
}

// ---------- DOM ----------

function buildDom() {
  const root = make('div', 'range');
  const scroller = make('div', 'range__scroller');
  const sticky = make('div', 'range__sticky');

  const controls = make('div', 'range__controls');
  const toggle = make('div', 'range__toggle');
  toggle.setAttribute('role', 'group');
  toggle.setAttribute('aria-label', 'Which pins to show');
  const livedBtn = make('button', 'range__toggle-btn', 'Lived');
  const wantBtn = make('button', 'range__toggle-btn', 'Want to go');
  for (const b of [livedBtn, wantBtn]) b.type = 'button';
  livedBtn.setAttribute('aria-pressed', 'true');
  wantBtn.setAttribute('aria-pressed', 'false');
  toggle.append(livedBtn, wantBtn);

  const sliderWrap = make('div', 'range__slider');
  const sliderLabel = make('label', 'range__slider-label', 'Year');
  sliderLabel.htmlFor = 'range-year';
  const slider = make('input', 'range__slider-input');
  Object.assign(slider, { type: 'range', id: 'range-year', min: '0', step: '0.01' });
  const ticks = make('div', 'range__ticks');
  ticks.setAttribute('aria-hidden', 'true');
  sliderWrap.append(sliderLabel, slider, ticks);
  controls.append(toggle, sliderWrap);

  const map = make('div', 'range__map');
  map.style.setProperty('--ar', `${W} / ${H}`);
  map.style.setProperty('--edge', `url("${URL.createObjectURL(new Blob([edgeMaskSvg(W, H, 'watercolor')], { type: 'image/svg+xml' }))}")`);
  const land = make('img', 'range__land');
  land.alt = '';
  land.width = W;
  land.height = H;
  const overlay = svgEl('svg', { class: 'range__overlay', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false' });
  const pinLayer = make('div', 'range__pins');
  map.append(land, overlay, pinLayer);

  const now = make('p', 'range__now');
  const empty = make('p', 'range__empty note', 'No want-to-go pins yet. Still deciding.');
  empty.hidden = true;

  sticky.append(controls, map, now, empty);
  scroller.append(sticky);
  root.append(scroller);
  return { root, scroller, sticky, map, land, overlay, pinLayer, now, empty, slider, ticks, livedBtn, wantBtn };
}

// ---------- land: baked watercolor wash with pencil coastlines ----------

async function bakeLand(ui, geo, pathOf) {
  const [topojson, world] = await Promise.all([
    import(TOPOJSON),
    fetch(WORLD).then((r) => { if (!r.ok) throw new Error('world'); return r.json(); }),
  ]);
  ui.map.world = { topojson, world, geo };
  const land = pathOf(topojson.feature(world, world.objects.land));
  const borders = pathOf(topojson.mesh(world, world.objects.countries, (a, b) => a !== b));
  const graticule = pathOf(geo.geoGraticule10());
  const svg = `<svg xmlns="${SVG_NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="wash" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="5" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="1.6" result="b"/>
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -.9 .95" result="tooth"/>
      <feComposite in="b" in2="tooth" operator="in"/>
    </filter>
    <filter id="pencil" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="1" seed="8" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <path d="${graticule}" fill="none" stroke="#6a8399" stroke-width=".6" stroke-opacity=".28" stroke-dasharray="2 3"/>
  <path d="${land}" fill="#8fa58a" fill-opacity=".42" filter="url(#wash)"/>
  <path d="${borders}" fill="none" stroke="#5d6157" stroke-width=".45" stroke-opacity=".45"/>
  <path d="${land}" fill="none" stroke="#33362f" stroke-width=".9" stroke-opacity=".75" stroke-linejoin="round" filter="url(#pencil)"/>
</svg>`;
  ui.land.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await ui.land.decode();
  ui.map.classList.add('has-land');
}

// ---------- route ----------

function buildRoute(ui, lived, pathOf) {
  const defs = svgEl('defs');
  const mask = svgEl('mask', { id: 'route-reveal', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H });
  const reveal = svgEl('path', { class: 'route-reveal' });
  mask.append(reveal);
  defs.append(mask);
  const ghost = svgEl('path', { class: 'route-ghost' });
  const line = svgEl('path', { class: 'route', mask: 'url(#route-reveal)' });
  const leaders = svgEl('g', { class: 'route-leaders' });
  const bird = svgEl('g', { class: 'route-bird' });
  bird.append(svgEl('path', { d: 'M-9 1.5C-5 .4-2.2-1.6.2-6.4c.8 2.6.6 4.8-.6 6.6L9.4-.8 1.2 3.2C-2.6 5-6.2 4.2-9 1.5Z' }));
  ui.overlay.append(defs, ghost, line, leaders, bird);

  // Build the path one leg at a time, so we know where each stop falls along it.
  const legs = [];
  for (let i = 1; i < lived.length; i++) {
    const a = lived[i - 1];
    const b = lived[i];
    legs.push(Math.hypot(a.x - b.x, a.y - b.y) < 0.5 ? '' : pathOf({ type: 'LineString', coordinates: [a.coords, b.coords] }));
  }
  const d = legs.join('');
  for (const p of [reveal, ghost, line]) p.setAttribute('d', d);

  const total = line.getTotalLength() || 1;
  const measure = svgEl('path');
  ui.overlay.append(measure);
  const at = [0];
  let running = 0;
  for (const leg of legs) {
    if (leg) {
      measure.setAttribute('d', leg);
      running += measure.getTotalLength();
    }
    at.push(running / total);
  }
  measure.remove();

  // Sample the path once, so the bird never has to measure while scrolling.
  const samples = [];
  const N = 600;
  for (let i = 0; i <= N; i++) {
    const p = line.getPointAtLength((total * i) / N);
    samples.push([p.x, p.y]);
  }

  reveal.setAttribute('stroke-dasharray', `${total} ${total}`);
  return { total, at, samples, reveal, bird, leaders };
}

/** Route progress (0..1) to a fractional stop index, and back. */
function progressToIndex(at, p) {
  for (let i = 1; i < at.length; i++) {
    if (p <= at[i]) {
      const span = at[i] - at[i - 1];
      return span > 0 ? i - 1 + (p - at[i - 1]) / span : i;
    }
  }
  return at.length - 1;
}
function indexToProgress(at, v) {
  const i = Math.min(Math.floor(v), at.length - 1);
  const next = Math.min(i + 1, at.length - 1);
  return at[i] + (v - i) * (at[next] - at[i]);
}

// ---------- pins ----------

function buildPins(ui, lived, wanted, route) {
  const make1 = (stop, i, kind) => {
    const button = make('button', `pin pin--${kind}`);
    button.type = 'button';
    button.style.left = `${(stop.x / W) * 100}%`;
    button.style.top = `${(stop.y / H) * 100}%`;
    const when = stop.when && !stop.when.startsWith('TODO') ? `, ${stop.when}` : '';
    const region = stop.region && !stop.region.startsWith('TODO') ? `, ${stop.region}` : '';
    button.setAttribute('aria-label', `${stop.name}${region}${when}. Open postcard.`);
    button.append(make('span', 'pin__dot'), make('span', 'pin__label', stop.name));
    button.addEventListener('click', () => openPostcard(stop, { trigger: button, world: ui.map.world }));
    button.dataset.index = String(i);
    // Pins near the right edge put their name on the left, so it stays on the map.
    button.classList.toggle('pin--label-left', stop.x > W * 0.72);
    ui.pinLayer.append(button);
    return { stop, button, kind };
  };
  const pins = [...lived.map((s, i) => make1(s, i, 'lived')), ...wanted.map((s, i) => make1(s, i, 'wanted'))];

  // Re-fan whenever the map changes size: overlap depends on pixels, not degrees.
  const layout = () => {
    const box = ui.map.getBoundingClientRect();
    if (!box.width) return;
    const scale = box.width / W;
    route.leaders.replaceChildren();
    for (const kind of ['lived', 'wanted']) {
      const group = pins.filter((p) => p.kind === kind);
      const offsets = fanOut(group.map((p) => ({ x: p.stop.x * scale, y: p.stop.y * scale })));
      group.forEach((pin, i) => {
        const { dx, dy, fanned } = offsets[i];
        pin.button.style.setProperty('--dx', `${dx}px`);
        pin.button.style.setProperty('--dy', `${dy}px`);
        if (fanned && kind === 'lived') {
          route.leaders.append(
            svgEl('line', { x1: pin.stop.x, y1: pin.stop.y, x2: pin.stop.x + dx / scale, y2: pin.stop.y + dy / scale }),
            svgEl('circle', { cx: pin.stop.x, cy: pin.stop.y, r: 2.2 }),
          );
        }
      });
    }
  };
  new ResizeObserver(layout).observe(ui.map);
  return pins;
}

function wireToggle(ui, pins, wanted) {
  const show = (mode) => {
    ui.livedBtn.setAttribute('aria-pressed', String(mode === 'lived'));
    ui.wantBtn.setAttribute('aria-pressed', String(mode === 'wanted'));
    ui.map.dataset.mode = mode;
    for (const pin of pins) pin.button.hidden = pin.kind !== mode;
    ui.empty.hidden = !(mode === 'wanted' && wanted.length === 0);
  };
  ui.livedBtn.addEventListener('click', () => show('lived'));
  ui.wantBtn.addEventListener('click', () => show('wanted'));
  show('lived');
}

// ---------- progress: scroll and slider drive the same state ----------

function wireProgress(ui, route, lived, pins) {
  const { slider } = ui;
  slider.max = String(Math.max(lived.length - 1, 0));

  // Year ticks under the slider: the first year of each stop, once per year.
  let lastYear = null;
  lived.forEach((stop, i) => {
    const year = /^\d{4}/.exec(stop.from ?? '')?.[0];
    if (!year || year === lastYear) return;
    lastYear = year;
    const tick = make('span', 'range__tick', year);
    tick.style.left = `${(i / Math.max(lived.length - 1, 1)) * 100}%`;
    ui.ticks.append(tick);
  });

  const livedPins = pins.filter((p) => p.kind === 'lived');
  let current = -1;

  const render = (p, { fromSlider = false } = {}) => {
    route.reveal.setAttribute('stroke-dashoffset', String(route.total * (1 - p)));

    const s = route.samples;
    const k = Math.round(p * (s.length - 1));
    const [x, y] = s[k];
    const [x2, y2] = s[Math.min(k + 3, s.length - 1)];
    const [x0, y0] = s[Math.max(k - 3, 0)];
    const angle = (Math.atan2(y2 - y0, x2 - x0) * 180) / Math.PI;
    const flip = Math.abs(angle) > 90 ? ' scale(1 -1)' : '';
    route.bird.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})${flip}`);

    const index = progressToIndex(route.at, p);
    const reached = Math.floor(index + 1e-6);
    livedPins.forEach((pin, i) => pin.button.classList.toggle('is-visited', i <= reached));
    if (!fromSlider) slider.value = String(index);

    if (reached !== current && lived[reached]) {
      current = reached;
      livedPins.forEach((pin, i) => pin.button.classList.toggle('is-current', i === reached));
      const stop = lived[reached];
      // "Regina, 2015 to 2018: High school". A "when" without years (like "Home") is left out.
      const role = stop.role && !stop.role.startsWith('TODO') ? stop.role : '';
      const years = /\d{4}/.test(stop.when ?? '') ? stop.when : '';
      const text = [stop.name, years].filter(Boolean).join(', ') + (role ? `: ${role}` : '');
      ui.now.textContent = text;
      slider.setAttribute('aria-valuetext', text);
    }
  };

  slider.addEventListener('input', () => render(indexToProgress(route.at, Number(slider.value)), { fromSlider: true }));
  // Arrow keys step a whole stop at a time, rather than a hundredth.
  slider.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const v = Math.min(Math.max(Math.round(Number(slider.value)) + step, 0), lived.length - 1);
    slider.value = String(v);
    render(indexToProgress(route.at, v), { fromSlider: true });
  });

  if (reduceMotion.matches) {
    render(1);
    return;
  }

  // Scroll: progress runs from the moment the map sticks until the scroller ends.
  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const box = ui.scroller.getBoundingClientRect();
      const travel = box.height - ui.sticky.offsetHeight;
      if (travel <= 0) return;
      const top = parseFloat(getComputedStyle(ui.sticky).top) || 0;
      const p = Math.min(Math.max((top - box.top) / travel, 0), 1);
      render(p);
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  render(0);
  onScroll();
}
