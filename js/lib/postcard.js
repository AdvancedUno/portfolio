// postcard.js: the postcard that opens from a map pin.
//
//   Front: a photo of the place if photos.json has one, otherwise the country's outline in
//          watercolor with a dot at the place. A rust postmark carries the place and years.
//   Back:  Uno's handwritten note, country facts from REST Countries (flag, capital,
//          languages, currency), and live weather and local time from Open-Meteo.
//   Turning it over is a CSS 3D flip (a crossfade with reduced motion).
//
// It is a native <dialog>: focus stays inside while it is open, Esc closes it, and focus
// goes back to the pin that opened it. Opening the first postcard is a life list discovery.

import { fetchJSON, HOUR, MINUTE } from '../api.js';
import { REST_COUNTRIES_KEY } from '../config.js';
import { fromRoot, loadData } from './data.js';
import { fillText, known, make } from './content.js';
import { describeWeather, formatTemperature, weatherIcon } from './weather.js';
import { discover } from './discover.js';

const COUNTRY_FIELDS = 'names.common,codes.alpha_2,capitals.name,languages.name,currencies.name,currencies.symbol,currencies.code,flag.url_svg,flag.description';
// world-atlas uses ISO 3166 numeric ids for countries.
const NUMERIC = { KR: '410', CA: '124', US: '840' };

let dialog;
let returnFocusTo = null;
let discovered = false;

/** Open the postcard for one stop. world is { topojson, world, geo } once the map has loaded it. */
export async function openPostcard(stop, { trigger, world } = {}) {
  dialog ??= buildDialog();
  returnFocusTo = trigger ?? document.activeElement;
  const card = dialog.querySelector('.postcard');
  card.classList.remove('is-flipped');
  syncFaces(card);
  dialog.querySelector('#postcard-title').textContent = `Postcard from ${stop.name}`;

  await fillFront(dialog.querySelector('.postcard__front'), stop, world);
  fillBack(dialog.querySelector('.postcard__back'), stop);
  dialog.showModal();
  dialog.querySelector('.postcard__turn').focus();

  if (!discovered) {
    discovered = true;
    discover('postcard');
  }
}

function buildDialog() {
  const d = make('dialog', 'postcard-dialog');
  d.setAttribute('aria-labelledby', 'postcard-title');
  d.innerHTML = `
    <h2 id="postcard-title" class="visually-hidden"></h2>
    <div class="postcard">
      <div class="postcard__face postcard__front"></div>
      <div class="postcard__face postcard__back"></div>
    </div>
    <div class="postcard__actions">
      <button type="button" class="postcard__turn">Turn it over</button>
      <button type="button" class="postcard__close">Close</button>
    </div>`;
  document.body.append(d);

  const card = d.querySelector('.postcard');
  const turn = () => {
    card.classList.toggle('is-flipped');
    syncFaces(card);
  };
  d.querySelector('.postcard__turn').addEventListener('click', turn);
  // Clicking the card itself turns it too, unless the click was on a link.
  card.addEventListener('click', (event) => { if (!event.target.closest('a')) turn(); });
  d.querySelector('.postcard__close').addEventListener('click', () => d.close());
  d.addEventListener('click', (event) => { if (event.target === d) d.close(); });
  d.addEventListener('close', () => returnFocusTo?.focus?.({ preventScroll: true }));
  return d;
}

/** Only the face showing is reachable by keyboard and screen readers. */
function syncFaces(card) {
  const flipped = card.classList.contains('is-flipped');
  card.querySelector('.postcard__front').inert = flipped;
  card.querySelector('.postcard__back').inert = !flipped;
  dialog.querySelector('.postcard__turn').textContent = flipped ? 'Turn it back' : 'Turn it over';
}

// ---------- front ----------

async function fillFront(front, stop, world) {
  front.replaceChildren();
  const photos = await loadData('photos').catch(() => []);
  const photo = known(stop.photo) && photos.find((p) => p.id === stop.photo);

  if (photo) {
    const picture = make('picture', 'postcard__photo');
    const source = make('source');
    source.type = 'image/webp';
    source.srcset = fromRoot(photo.webp);
    const img = make('img');
    Object.assign(img, { src: fromRoot(photo.src), alt: photo.alt, width: photo.width, height: photo.height });
    picture.append(source, img);
    front.append(picture);
  } else {
    front.append(countryOutline(stop, world));
  }
  front.append(make('p', 'postcard__place', stop.name), postmark(stop));
}

/** The stop's country in watercolor, with a pencil dot where the stop is. */
function countryOutline(stop, world) {
  const W = 600;
  const H = 400;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'postcard__outline');
  svg.setAttribute('aria-hidden', 'true');
  if (!world) return svg;
  const { topojson, world: atlas, geo } = world;
  const feature = topojson.feature(atlas, atlas.objects.countries).features.find((f) => f.id === NUMERIC[stop.country]);
  if (!feature) return svg;
  // The lower 48 states read better than a map stretched by Alaska and Hawaii.
  const projection = stop.country === 'US'
    ? geo.geoAlbersUsa()
    : geo.geoNaturalEarth1().rotate([-geo.geoCentroid(feature)[0], 0]);
  projection.fitExtent([[40, 40], [W - 40, H - 40]], feature);
  const path = geo.geoPath(projection);
  const point = projection(stop.coords);
  svg.innerHTML = `
    <defs><filter id="postcard-wash" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="6" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="2"/>
    </filter></defs>
    <path d="${path(feature)}" fill="#8fa58a" fill-opacity=".5" filter="url(#postcard-wash)"/>
    <path d="${path(feature)}" fill="none" stroke="#33362f" stroke-width="1.2" stroke-opacity=".8" stroke-linejoin="round"/>
    ${point ? `<circle cx="${point[0]}" cy="${point[1]}" r="7" fill="#8f4632"/><circle cx="${point[0]}" cy="${point[1]}" r="13" fill="none" stroke="#8f4632" stroke-width="1.5"/>` : ''}`;
  return svg;
}

/** A round rust postmark (place around the top, years across the middle) and wavy cancel lines. */
function postmark(stop) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'postmark');
  svg.setAttribute('viewBox', '0 0 180 120');
  svg.setAttribute('aria-hidden', 'true');
  const id = `postmark-arc-${stop.id}`;
  svg.innerHTML = `
    <defs><path id="${id}" d="M20 62a40 40 0 0 1 80 0"/></defs>
    <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <circle cx="60" cy="60" r="43" fill="none" stroke="currentColor" stroke-width="1"/>
    <text class="postmark__place" font-size="11"><textPath href="#${id}" startOffset="50%" text-anchor="middle"></textPath></text>
    <text class="postmark__when" x="60" y="72" font-size="9.5" text-anchor="middle"></text>
    <path d="M118 46c10-4 18 4 28 0s18-4 28 0M118 60c10-4 18 4 28 0s18-4 28 0M118 74c10-4 18 4 28 0s18-4 28 0" fill="none" stroke="currentColor" stroke-width="2"/>`;
  svg.querySelector('textPath').textContent = stop.name;
  svg.querySelector('.postmark__when').textContent = known(stop.when) ? stop.when : '';
  return svg;
}

// ---------- back ----------

function fillBack(back, stop) {
  back.replaceChildren();
  const note = make('div', 'postcard__note');
  note.append(fillText(make('p'), stop.note));
  // What the stop was, typed under the note: "2015 to 2018. High school."
  const typed = [/\d{4}/.test(stop.when ?? '') ? stop.when : null, known(stop.role) ? stop.role : null].filter(Boolean);
  if (typed.length) note.append(make('p', 'postcard__typed', `${typed.join('. ')}.`));

  const facts = make('div', 'postcard__facts');
  const factList = make('dl', 'postcard__fact-list');
  factList.append(make('dt', null, 'Country'), make('dd', 'is-loading', ' '));
  const weather = make('p', 'postcard__weather is-loading', ' ');
  facts.append(factList, weather);
  back.append(note, facts);

  fillCountry(factList, stop.country);
  fillWeather(weather, stop);
}

async function fillCountry(list, code) {
  if (!code) return;
  const url = `https://api.restcountries.com/countries/v5/codes.alpha_2/${code}?response_fields=${COUNTRY_FIELDS}`;
  const { data } = await fetchJSON(url, {
    ttl: 24 * HOUR,
    headers: { Authorization: `Bearer ${REST_COUNTRIES_KEY}` },
    fallback: fromRoot(`./data/fallback/restcountries-${code}.json`),
  });
  const country = data?.data?.objects?.[0];
  list.replaceChildren();
  if (!country) {
    list.append(make('dt', null, 'Country'), make('dd', 'is-placeholder', 'The almanac is closed right now.'));
    return;
  }
  const name = make('dd', 'postcard__country');
  if (country.flag?.url_svg) {
    const flag = make('img', 'postcard__flag');
    Object.assign(flag, { src: country.flag.url_svg, alt: country.flag.description || `Flag of ${country.names.common}`, width: 36, height: 24, loading: 'lazy' });
    name.append(flag);
  }
  name.append(document.createTextNode(country.names.common));
  const row = (term, value) => { if (value) list.append(make('dt', null, term), make('dd', null, value)); };
  list.append(make('dt', null, 'Country'), name);
  row('Capital', country.capitals?.map((c) => c.name).join(', '));
  row(country.languages?.length > 1 ? 'Languages' : 'Language', country.languages?.map((l) => l.name).join(', '));
  row('Currency', country.currencies?.map((c) => (c.symbol ? `${c.name} (${c.symbol})` : c.name)).join(', '));
}

// One Open-Meteo request covers every stop with coordinates.
let weatherRequest = null;
async function stopsWeather() {
  const places = await loadData('places');
  const located = places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  weatherRequest ??= fetchJSON(
    'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${located.map((p) => p.lat).join(',')}`
      + `&longitude=${located.map((p) => p.lon).join(',')}`
      + '&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto',
    { ttl: 15 * MINUTE, fallback: fromRoot('./data/fallback/open-meteo-stops.json') },
  );
  const { data, source } = await weatherRequest;
  return { located, readings: Array.isArray(data) ? data : [data], source };
}

async function fillWeather(line, stop) {
  try {
    const { located, readings, source } = await stopsWeather();
    // A stop known only by country borrows the reading of that country's stop named like its capital,
    // or else the first stop in that country.
    let place = located.find((p) => p.id === stop.id);
    if (!place) {
      const capital = (await fetchCapital(stop.country)) ?? '';
      place = located.find((p) => p.country === stop.country && p.name === capital)
        ?? located.find((p) => p.country === stop.country);
    }
    const reading = place && readings[located.indexOf(place)];
    const current = reading?.current;
    if (!current) throw new Error('no reading');

    const weather = describeWeather(current.weather_code, current.is_day);
    const time = new Intl.DateTimeFormat('en-US', { timeZone: reading.timezone, hour: 'numeric', minute: '2-digit' })
      .format(new Date()).replace(/\s?([AP])M$/i, (_, m) => `${m.toLowerCase()}m`);
    const words = `${formatTemperature(current.temperature_2m)}, ${weather.word.toLowerCase()}`;
    line.replaceChildren(weatherIcon(weather.icon), make('span', null, source === 'fallback'
      ? `The weather station is quiet right now. Last reading in ${place.name}: ${words}. Local time there: ${time}.`
      : `Right now in ${place.name}: ${words}, ${time}.`));
  } catch {
    line.replaceChildren(make('span', null, 'The weather station is quiet right now.'));
  }
  line.classList.remove('is-loading');
}

/** The capital's name, from the same cached REST Countries response the facts use. */
async function fetchCapital(code) {
  if (!code) return null;
  const url = `https://api.restcountries.com/countries/v5/codes.alpha_2/${code}?response_fields=${COUNTRY_FIELDS}`;
  const { data } = await fetchJSON(url, {
    ttl: 24 * HOUR,
    headers: { Authorization: `Bearer ${REST_COUNTRIES_KEY}` },
    fallback: fromRoot(`./data/fallback/restcountries-${code}.json`),
  });
  return data?.data?.objects?.[0]?.capitals?.[0]?.name ?? null;
}
