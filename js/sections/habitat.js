// habitat.js: Habitat. Plants and animals seen near the places Uno has hiked.
//
// For each place in places.json with "hikes": true, iNaturalist's species counts give the
// species with the most research-grade observations (with photos) within RADIUS_KM. Six
// show at a time as specimen cards: a watercolor drawing of the species photo, the common
// and Latin names typed underneath. Turning a card over shows how often it has been seen
// there, the photo credit, and links. "Next page" walks further down the list.
//
// Photos are only turned into drawings when their license allows changes; a photo with
// all rights reserved (or "no derivatives") is shown as it is, with its credit.

import { loadData } from '../lib/data.js';
import { fetchJSON, HOUR } from '../api.js';
import { make } from '../lib/content.js';
import { flipCard } from '../lib/flip.js';
import { bakeRemote } from '../lib/sketch.js';

const PER_PAGE = 6;
const RADIUS_KM = 20;
const MAX_PAGE = Math.floor(10000 / PER_PAGE); // iNaturalist stops paging after 10,000 results

const GROUPS = {
  Aves: 'Bird', Insecta: 'Insect', Plantae: 'Plant', Mammalia: 'Mammal', Reptilia: 'Reptile',
  Amphibia: 'Amphibian', Fungi: 'Fungus', Arachnida: 'Spider or kin', Mollusca: 'Mollusk',
  Actinopterygii: 'Fish', Animalia: 'Animal', Chromista: 'Kelp or kin', Protozoa: 'Protozoan',
};

// The site is English only. A credit or name in another script is replaced, not shown.
const latinOnly = (text) => typeof text === 'string' && /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]*$/u.test(text);
const allowsChanges = (license) => Boolean(license) && !license.includes('nd');

export async function initHabitat() {
  const slot = document.querySelector('#habitat .fig');
  if (!slot) return;
  let places;
  try {
    places = await loadData('places');
  } catch {
    return;
  }
  const hikes = places.filter((p) => p.hikes === true && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const root = make('div', 'habitat');
  slot.replaceWith(root);

  if (!hikes.length) {
    root.append(emptyState());
    return;
  }

  // Which place: a row of pressed buttons (a single place needs no choosing).
  const where = make('p', 'habitat__where');
  const status = make('p', 'habitat__status');
  status.setAttribute('aria-live', 'polite');
  const cards = make('ul', 'habitat__cards');
  const pager = make('div', 'habitat__pager');
  const prev = make('button', 'habitat__page-button', 'Previous page');
  const next = make('button', 'habitat__page-button', 'Next page');
  prev.type = 'button';
  next.type = 'button';
  const pageNo = make('span', 'habitat__page-no');
  pager.append(prev, pageNo, next);

  const state = { place: hikes[0], page: 1, pages: 1, token: 0 };

  if (hikes.length > 1) {
    const picker = make('div', 'habitat__places');
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Choose a place');
    for (const place of hikes) {
      const b = make('button', 'habitat__place', place.name);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(place === state.place));
      b.addEventListener('click', () => {
        for (const other of picker.children) other.setAttribute('aria-pressed', String(other === b));
        state.place = place;
        state.page = 1;
        load();
      });
      picker.append(b);
    }
    root.append(picker);
  }
  root.append(where, cards, pager, status,
    make('p', 'habitat__credit', 'Sightings and photos from iNaturalist. Each photo is credited on the back of its card.'));

  async function load() {
    const token = ++state.token; // a newer request wins if the visitor clicks quickly
    const { place, page } = state;
    where.textContent = `Within ${RADIUS_KM} km of ${place.name}. Research-grade sightings, most seen first.`;
    cards.classList.add('is-loading');
    cards.setAttribute('aria-busy', 'true');
    prev.disabled = true;
    next.disabled = true;
    status.textContent = '';

    const url = 'https://api.inaturalist.org/v1/observations/species_counts?'
      + `lat=${place.lat}&lng=${place.lon}&radius=${RADIUS_KM}&quality_grade=research&photos=true`
      + `&locale=en&per_page=${PER_PAGE}&page=${page}`;
    const { data, source } = await fetchJSON(url, {
      ttl: 24 * HOUR,
      timeoutMs: 8000,
      fallback: page === 1 ? `./data/fallback/inaturalist-${place.id}-p1.json` : undefined,
    });
    if (token !== state.token) return;

    cards.classList.remove('is-loading');
    cards.removeAttribute('aria-busy');
    if (!data?.results?.length) {
      cards.replaceChildren();
      status.textContent = 'The field station did not answer just now. Try again in a little while.';
      status.classList.remove('visually-hidden');
      prev.disabled = page <= 1;
      pageNo.textContent = `Page ${page}`;
      return;
    }
    state.pages = Math.min(Math.ceil(data.total_results / PER_PAGE), MAX_PAGE);
    cards.replaceChildren(...data.results.map((r) => speciesCard(r, place)));
    pageNo.textContent = `Page ${page} of ${state.pages.toLocaleString('en-US')}`;
    prev.disabled = page <= 1;
    next.disabled = page >= state.pages;
    const old = source === 'fallback' || source === 'stale';
    status.textContent = old ? 'The field station is quiet right now. These are from an earlier visit.' : `Showing page ${page}.`;
    status.classList.toggle('visually-hidden', !old);
  }

  prev.addEventListener('click', () => { state.page -= 1; load(); });
  next.addEventListener('click', () => { state.page += 1; load(); });

  // Ask iNaturalist only when the plate comes near.
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      load();
    }
  }, { rootMargin: '500px 0px' });
  observer.observe(root);
}

function speciesCard(result, place) {
  const taxon = result.taxon ?? {};
  const latin = taxon.name ?? 'Unnamed';
  const common = latinOnly(taxon.preferred_common_name) ? taxon.preferred_common_name : null;
  const photo = taxon.default_photo;
  const title = common ?? latin;

  // Front: the drawing (or photo), then typed names.
  const art = make('div', 'species__art');
  if (photo?.medium_url) {
    if (allowsChanges(photo.license_code)) {
      art.classList.add('is-drawing-in');
      bakeRemote(photo.medium_url.replace(/^http:/, 'https:'), 'watercolor').then((drawn) => {
        const img = document.createElement('img');
        img.src = drawn.src;
        img.alt = `Watercolor drawing: ${title}`;
        img.width = drawn.width;
        img.height = drawn.height;
        art.style.setProperty('--edge', `url("${drawn.edge}")`);
        art.replaceChildren(img);
        art.classList.remove('is-drawing-in');
        art.classList.add('is-drawn');
      }).catch(() => showPhoto(art, photo, title));
    } else {
      showPhoto(art, photo, title);
    }
  } else {
    art.append(make('span', 'species__no-photo', 'No photo to share.'));
  }

  const names = make('p', 'species__names');
  if (common) names.append(make('span', 'species__common', common));
  const latinEl = make('i', 'species__latin', latin);
  latinEl.lang = 'la';
  names.append(latinEl);

  // Back: how often, what kind, credit, links.
  const back = [];
  back.push(make('h3', 'species__title', title));
  const facts = make('ul', 'species__facts');
  const group = GROUPS[taxon.iconic_taxon_name];
  if (group) facts.append(make('li', null, group));
  const n = result.count ?? 0;
  facts.append(make('li', null, `Seen ${n.toLocaleString('en-US')} ${n === 1 ? 'time' : 'times'} within ${RADIUS_KM} km of ${place.name}`));
  back.push(facts);
  if (photo) back.push(make('p', 'species__credit', `Photo: ${creditFor(photo)}`));
  const links = make('p', 'species__links');
  const inat = make('a', null, 'On iNaturalist');
  inat.href = `https://www.inaturalist.org/taxa/${taxon.id}`;
  links.append(inat);
  if (taxon.wikipedia_url) {
    const wiki = make('a', null, 'On Wikipedia');
    wiki.href = taxon.wikipedia_url.replace(/^http:/, 'https:');
    links.append(wiki);
  }
  back.push(links);

  return flipCard({
    className: 'species',
    front: [art, names],
    back,
    turnLabel: `${title}, turn over for details`,
    backLabel: `Turn the ${title.toLowerCase()} card back over`,
  });
}

function showPhoto(art, photo, title) {
  const img = document.createElement('img');
  img.src = photo.medium_url.replace(/^http:/, 'https:');
  img.alt = `Photo: ${title}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  art.replaceChildren(img);
  art.classList.remove('is-drawing-in');
  art.classList.add('is-photo');
}

/** iNaturalist's own credit line, unless the name is in a script this site does not show. */
function creditFor(photo) {
  if (latinOnly(photo.attribution)) return photo.attribution;
  const license = photo.license_code ? `CC ${photo.license_code.replace(/^cc-?/, '').toUpperCase()}` : 'all rights reserved';
  return `an iNaturalist observer (${license})`;
}

function emptyState() {
  const box = make('div', 'habitat__empty');
  box.innerHTML = `<svg class="habitat__sign" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M58 116V30M62 116V30"/>
      <path class="habitat__sign-board" d="M24 30h70l12 11-12 11H24z"/>
      <path d="M24 30h70l12 11-12 11H24z"/>
      <path d="M34 41h44" stroke-dasharray="3 4"/>
      <path class="habitat__sign-board" d="M98 62H30l-12 10 12 10h68z"/>
      <path d="M98 62H30l-12 10 12 10h68z"/>
      <path d="M40 72h42" stroke-dasharray="3 4"/>
      <path d="M40 116c8-6 32-6 40 0"/>
    </svg>`;
  const text = make('div');
  text.append(
    make('p', 'habitat__empty-note', 'The trail list is still to be written.'),
    make('p', null, 'Once it is, the plants and animals seen near each trail show up here, from iNaturalist.'),
  );
  box.append(text);
  return box;
}
