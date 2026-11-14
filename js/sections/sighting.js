// sighting.js: the field note at the top of the contents page, and the site's "plumage".
//
//   "Visitor sighted Saturday, 3:14pm."              (the visitor's own day and time)
//   "Overcast in St. Louis, 43°F (6°C)."            (live from Open-Meteo, through api.js)
//
// Plumage: the page's washes shift a little with St. Louis's season and weather, by setting
// data-season and data-weather on <html> (see css/components/plumage.css). Only a fresh
// reading can make it rain or snow on the page; an old saved reading never does.

import { fetchJSON, MINUTE } from '../api.js';
import { fromRoot } from '../lib/data.js';
import { describeWeather, formatTemperature, weatherIcon } from '../lib/weather.js';
import { make } from '../lib/content.js';

const ST_LOUIS = { latitude: 38.627, longitude: -90.1994, timeZone: 'America/Chicago' };
const URL_ST_LOUIS = 'https://api.open-meteo.com/v1/forecast'
  + `?latitude=${ST_LOUIS.latitude}&longitude=${ST_LOUIS.longitude}`
  + '&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto';
const FALLBACK = fromRoot('./data/fallback/open-meteo-st-louis.json');

/** Meteorological seasons, from the month in St. Louis right now. */
function seasonInStLouis(now = new Date()) {
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: ST_LOUIS.timeZone, month: 'numeric' }).format(now));
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

/** "Saturday, 3:14pm" in the visitor's own time zone. */
function visitorMoment(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(now).replace(/\s?([AP])M$/i, (_, m) => `${m.toLowerCase()}m`);
  return `${day}, ${time}`;
}

/** "Nov 14" from Open-Meteo's local "2026-11-14T12:00". */
function readingDate(time) {
  const [year, month, day] = time.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function initSighting() {
  const note = document.querySelector('.sighting');
  if (!note) return;
  const root = document.documentElement;
  root.dataset.season = seasonInStLouis();

  const { data, source } = await fetchJSON(URL_ST_LOUIS, { ttl: 15 * MINUTE, fallback: FALLBACK });

  const visitor = make('span', 'sighting__line', `Visitor sighted ${visitorMoment()}.`);
  const weatherLine = make('span', 'sighting__line sighting__weather');
  const current = data?.current;

  if (current && typeof current.temperature_2m === 'number') {
    const weather = describeWeather(current.weather_code, current.is_day);
    const reading = `in St. Louis, ${formatTemperature(current.temperature_2m)}.`;
    if (source === 'fallback') {
      weatherLine.append(weatherIcon(weather.icon), make('span', null,
        `The weather station is quiet right now. Last reading, ${readingDate(current.time)}: ${weather.word.toLowerCase()} ${reading}`));
    } else {
      weatherLine.append(weatherIcon(weather.icon), make('span', null, `${weather.word} ${reading}`));
      if (weather.snow) root.dataset.weather = 'snow';
      else if (weather.rain) root.dataset.weather = 'rain';
    }
  } else {
    weatherLine.append(make('span', null, 'The weather station is quiet right now.'));
  }

  note.replaceChildren(visitor, weatherLine);
  note.classList.add('is-ready');
}
