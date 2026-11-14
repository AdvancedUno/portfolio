// field-log.js: the Field log, dated field notes from log.json, newest first.
// Each entry shows its date, a rust stamp for its kind, the title and org, and a one-line
// summary; clicking the title (or Enter on it) opens the details. Entries with no date yet
// sort last, as "Year to come".

import { loadData } from '../lib/data.js';
import { fillText, known, make } from '../lib/content.js';
import { discover } from '../lib/discover.js';

/**
 * A date as a number for sorting: "2025-03" -> 2025.17. A bare year means the start of it,
 * or the end of it when it is an end date ("Summer 2025" ends after "Mar to Apr 2025").
 * Unknown dates are -Infinity, so they sort last.
 */
const when = (date, { end = false } = {}) => {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(date ?? '');
  if (!m) return -Infinity;
  if (m[2]) return Number(m[1]) + (Number(m[2]) - 1) / 12;
  return Number(m[1]) + (end ? 11 / 12 : 0);
};
const ending = (entry) => (entry.end ? when(entry.end, { end: true }) : when(entry.start));

export async function initFieldLog() {
  const slot = document.querySelector('#field-log .fig');
  if (!slot) return;
  let entries;
  try {
    entries = await loadData('log');
  } catch {
    return;
  }

  const sorted = [...entries].sort((a, b) => (ending(b) - ending(a)) || (when(b.start) - when(a.start)));

  const list = make('ol', 'log');
  for (const entry of sorted) {
    const li = make('li', 'log-entry');
    li.dataset.kind = entry.kind;

    const date = make('p', 'log-entry__when', known(entry.when) ? entry.when : 'Year to come');
    const body = make('div', 'log-entry__body');

    const detailsId = `log-details-${entry.id}`;
    const h3 = make('h3', 'log-entry__title');
    const button = make('button', 'log-entry__toggle');
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', detailsId);
    button.append(make('span', 'log-entry__role', entry.title));
    if (known(entry.org)) button.append(make('span', 'log-entry__org', entry.org));
    h3.append(button);

    const stamp = make('span', 'log-entry__kind', entry.kind);
    const summary = fillText(make('p', 'log-entry__summary'), entry.summary);

    const details = make('div', 'log-entry__details');
    details.id = detailsId;
    details.hidden = true;
    details.append(fillText(make('p'), entry.details));
    const links = (entry.links ?? []).filter((l) => known(l.url));
    if (links.length) {
      const ul = make('ul', 'log-entry__links');
      for (const link of links) {
        const a = make('a', null, link.label);
        a.href = link.url;
        const item = make('li');
        item.append(a);
        ul.append(item);
      }
      details.append(ul);
    }

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      details.hidden = !open;
      li.classList.toggle('is-open', open);
      if (open) discover('field-note');
    });

    body.append(stamp, h3, summary, details);
    li.append(date, body);
    list.append(li);
  }
  slot.replaceWith(list);
}
