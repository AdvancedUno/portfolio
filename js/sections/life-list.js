// life-list.js: the site-wide field checklist pinned to the bottom-left corner.
//
// Collapsed, it is a small card with a count, so it never covers content on a phone.
// Opened, it lists the discoveries from lifelist.json. Each one ticks with a hand-drawn
// check and a rust stamp, and progress is remembered in localStorage.
//
// An item only appears once its section is built (its plate no longer holds the
// "still being sketched" figure), so the list can always be finished. Finishing it
// unlocks the hidden First specimen page.

import { loadData } from '../lib/data.js';
import { make } from '../lib/content.js';
import { unlockFirstSpecimen } from './first-specimen.js';

const KEY = 'fieldguide:lifelist';

const read = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
};
const save = (found) => {
  try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch { /* storage blocked: this visit only */ }
};

/** Built sections no longer contain the placeholder figure. */
const isAvailable = (item) => {
  if (!item.section) return true;
  const plate = document.getElementById(item.section);
  return Boolean(plate) && !plate.querySelector('.fig');
};

const TICK = '<svg class="life-list__tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.8c1.8 1.4 3.2 3 4.4 5.2 2.6-5.8 6-9.8 10.6-12.6"/></svg>';

export async function initLifeList() {
  const aside = document.getElementById('life-list');
  if (!aside) return;
  let items;
  try {
    items = await loadData('lifelist');
  } catch {
    return;
  }
  const found = read();
  const visible = items.filter(isAvailable);

  const toggle = make('button', 'life-list__toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'life-list-panel');
  const count = make('span', 'life-list__count');
  const icon = make('span', 'life-list__box life-list__icon');
  icon.innerHTML = TICK;
  icon.setAttribute('aria-hidden', 'true');
  toggle.append(icon, make('span', 'life-list__title', 'Life list'), count);

  const panel = make('div', 'life-list__panel');
  panel.id = 'life-list-panel';
  panel.hidden = true;
  panel.append(make('p', 'life-list__intro', 'Things to find in this guide.'));
  const list = make('ul', 'life-list__items');
  const rows = new Map();
  for (const item of visible) {
    const li = make('li', 'life-list__item');
    const box = make('span', 'life-list__box');
    box.innerHTML = TICK;
    li.append(box, make('span', 'life-list__label', item.label));
    li.classList.toggle('is-found', found.has(item.id));
    list.append(li);
    rows.set(item.id, li);
  }
  const done = make('p', 'life-list__done');
  done.hidden = true;
  const doneLink = make('a', null, 'Visit the first specimen');
  doneLink.href = '#first-specimen';
  done.append('List complete. ', doneLink, '.');
  const close = make('button', 'life-list__close', 'Fold it away');
  close.type = 'button';
  panel.append(list, done, close);

  const live = make('p', 'visually-hidden');
  live.setAttribute('aria-live', 'polite');
  aside.append(toggle, panel, live);

  const render = () => {
    const n = visible.filter((i) => found.has(i.id)).length;
    count.textContent = `${n}/${visible.length}`;
    toggle.setAttribute('aria-label', `Life list, ${n} of ${visible.length} found`);
    const complete = n === visible.length && visible.length > 0;
    done.hidden = !complete;
    if (complete) unlockFirstSpecimen();
  };

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    aside.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => { setOpen(false); toggle.focus(); });
  doneLink.addEventListener('click', () => { unlockFirstSpecimen(); setOpen(false); });
  aside.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  // A tap anywhere else folds it away, so it never sits over the page.
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !aside.contains(event.target)) setOpen(false);
  });

  document.addEventListener('fieldguide:discover', (event) => {
    const id = event.detail?.id;
    if (!id || found.has(id)) return;
    found.add(id);
    save(found);
    const row = rows.get(id);
    if (!row) return;
    row.classList.add('is-found', 'is-new');
    setTimeout(() => row.classList.remove('is-new'), 1600);
    aside.classList.remove('is-bumped');
    void aside.offsetWidth;
    aside.classList.add('is-bumped');
    live.textContent = `Added to your life list: ${row.textContent}.`;
    render();
  });

  render();
}
