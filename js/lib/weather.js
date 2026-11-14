// weather.js: turns Open-Meteo readings into words and pencil icons.
// Shared by the visitor sighting note (Phase 2) and the map postcards (Phase 3).
// WMO weather codes: https://open-meteo.com/en/docs (section "WMO Weather interpretation codes").

const GROUPS = [
  { codes: [0, 1], word: (day) => (day ? 'Clear' : 'Clear night'), icon: (day) => (day ? 'i-sun' : 'i-moon') },
  { codes: [2], word: () => 'Partly cloudy', icon: (day) => (day ? 'i-partly' : 'i-cloud') },
  { codes: [3], word: () => 'Overcast', icon: () => 'i-cloud' },
  { codes: [45, 48], word: () => 'Foggy', icon: () => 'i-fog' },
  { codes: [51, 53, 55, 56, 57], word: () => 'Drizzly', icon: () => 'i-rain', rain: true },
  { codes: [61, 63, 65, 80, 81, 82], word: () => 'Rainy', icon: () => 'i-rain', rain: true },
  { codes: [66, 67], word: () => 'Icy rain', icon: () => 'i-rain', rain: true },
  { codes: [71, 73, 75, 77, 85, 86], word: () => 'Snowy', icon: () => 'i-snow', snow: true },
  { codes: [95, 96, 97, 99], word: () => 'Stormy', icon: () => 'i-storm', rain: true },
];

/**
 * Describe a weather code.
 * @param {number} code   WMO weather code
 * @param {number} [isDay=1]  Open-Meteo's is_day (1 or 0)
 * @returns {{word: string, icon: string, rain: boolean, snow: boolean}}
 */
export function describeWeather(code, isDay = 1) {
  const day = isDay !== 0;
  const group = GROUPS.find((g) => g.codes.includes(code));
  if (!group) return { word: 'Unsettled', icon: 'i-cloud', rain: false, snow: false };
  return { word: group.word(day), icon: group.icon(day), rain: Boolean(group.rain), snow: Boolean(group.snow) };
}

/** "44°F (7°C)" from a Fahrenheit reading. */
export function formatTemperature(fahrenheit) {
  const celsius = Math.round(((fahrenheit - 32) * 5) / 9);
  return `${Math.round(fahrenheit)}°F (${celsius}°C)`;
}

/** An <svg> that uses one of the pencil weather icons from the page's sprite. */
export function weatherIcon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon weather-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}
