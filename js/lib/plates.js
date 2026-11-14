// plates.js: fills in the typewritten data line on each plate's specimen card,
// counted from the local data files. Placeholder values (TODO(uno) strings, nulls)
// are skipped, so a label only ever states what the data actually says.

import { loadData as load } from './data.js';
import { isTodo, known } from './content.js';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Join names as "a", "a and b", or "a, b, and c". */
function listOf(names) {
  if (names.length < 3) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

/** "Violin and Guitar" -> "Violin and guitar". Only safe for common nouns, not names. */
const sentenceCase = (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

/** The first four digits of a "YYYY" or "YYYY-MM" date, or null. */
const yearOf = (date) => (known(date) && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null);

// One function per plate: data in, label text out (or '' for nothing to say).
const LINES = {
  identification: async () => {
    const p = await load('profile');
    return known(p.name) && known(p.nickname) ? `${p.name}, known as ${p.nickname}` : '';
  },

  range: async () => {
    const lived = (await load('places')).filter((place) => place.lived === true);
    const countries = new Set(lived.map((place) => place.country).filter(known));
    return lived.length ? `${plural(lived.length, 'stop')} in ${plural(countries.size, 'country', 'countries')}` : '';
  },

  tracks: async () => {
    const projects = (await load('projects')).filter((node) => node.kind === 'project');
    return projects.length ? plural(projects.length, 'specimen') : '';
  },

  'field-log': async () => {
    const log = await load('log');
    const years = log.flatMap((entry) => [yearOf(entry.start), yearOf(entry.end)]).filter(Boolean);
    if (!log.length) return '';
    const span = years.length ? `, ${Math.min(...years)} to ${Math.max(...years)}` : '';
    return `${plural(log.length, 'entry', 'entries')}${span}`;
  },

  song: async () => {
    const names = (await load('music')).instruments.map((i) => i.name).filter(known);
    return names.length ? sentenceCase(listOf(names)) : '';
  },

  behavior: async () => {
    const behaviors = (await load('profile')).behavior.filter((b) => known(b.name));
    return behaviors.length ? plural(behaviors.length, 'sport or game', 'sports and games') : '';
  },
};

/** Fill every [data-plate-data] element. A plate whose data fails to load keeps a blank field. */
export async function fillPlateData() {
  const slots = document.querySelectorAll('[data-plate-data]');
  await Promise.all([...slots].map(async (slot) => {
    const line = LINES[slot.dataset.plateData];
    if (!line) return;
    try {
      const text = await line();
      if (!isTodo(text)) slot.textContent = text;
    } catch {
      // Leave the field blank: the label still reads as a specimen label with an empty entry.
    }
  }));
}
