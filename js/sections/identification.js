// identification.js: the Identification plate.
// A pencil-sketched portrait with numbered field marks. Each mark has a dot on the portrait,
// a hand-drawn pointer line, and a label button in the column beside it.
//   Hover a dot or label: preview its note.   Click or tap: pin it open (click again to close).
//   Keyboard: the labels are buttons (Tab, Enter); Esc closes the open note.
// Under 1024px the pointer lines are dropped and the labels become a numbered list.
// Then the plain facts: name, name origin, intro, education, and a "currently" list.

import { loadData } from '../lib/data.js';
import { createSketch } from '../lib/sketch.js';
import { fillText, formatMonth, known, make } from '../lib/content.js';
import { tiltFor } from '../lib/tilt.js';
import { discover } from '../lib/discover.js';

const wide = matchMedia('(min-width: 1024px)');

export async function initIdentification() {
  const plate = document.getElementById('identification');
  const slot = plate?.querySelector('.fig');
  if (!slot) return;

  let profile, photos;
  try {
    [profile, photos] = await Promise.all([loadData('profile'), loadData('photos')]);
  } catch {
    return; // keep the "still being sketched" figure
  }

  const ident = make('div', 'ident');
  const portrait = photos.find((photo) => photo.id === profile.portrait);
  if (portrait) ident.append(buildSpecimen(portrait, profile.fieldMarks ?? []));
  ident.append(await buildFacts(profile));
  slot.replaceWith(ident);
}

// ---------- portrait and field marks ----------

function buildSpecimen(photo, marks) {
  const specimen = make('div', 'ident__specimen');
  const figure = createSketch(photo);
  figure.classList.add('ident__portrait');
  const stage = figure.querySelector('.sketch__stage');

  const list = make('ol', 'field-marks');
  list.setAttribute('aria-label', 'Field marks');
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lines.classList.add('ident__lines');
  lines.setAttribute('aria-hidden', 'true');

  const items = marks.map((mark, i) => {
    const number = String(i + 1);
    const noteId = `field-mark-note-${mark.id}`;

    const dot = make('span', 'mark-dot');
    dot.append(make('span', 'mark-dot__no', number));
    dot.setAttribute('aria-hidden', 'true');
    dot.style.setProperty('--x', `${mark.x}%`);
    dot.style.setProperty('--y', `${mark.y}%`);
    stage.append(dot);

    const li = make('li', 'field-mark-item');
    const button = make('button', 'field-mark');
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', noteId);
    button.append(make('span', 'field-mark__no', number), make('span', 'field-mark__label', mark.label));
    const note = fillText(make('p', 'field-mark__note'), mark.note);
    note.id = noteId;
    note.hidden = true;
    li.append(button, note);
    list.append(li);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    lines.append(path);
    return { mark, dot, button, note, path };
  });

  // One note open at a time. "pinned" survives the pointer leaving; a preview does not.
  let pinned = null;
  const show = (item, on) => {
    item.note.hidden = !on;
    item.button.setAttribute('aria-expanded', String(on));
    item.dot.classList.toggle('is-active', on);
    item.path.classList.toggle('is-active', on);
    if (on) discover('field-mark');
  };
  const render = (previewed = null) => {
    for (const item of items) show(item, item === pinned || item === previewed);
  };

  for (const item of items) {
    for (const target of [item.dot, item.button]) {
      target.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') render(item); });
      target.addEventListener('pointerleave', (event) => { if (event.pointerType !== 'touch') render(); });
    }
    const toggle = () => {
      pinned = pinned === item ? null : item;
      render();
    };
    item.button.addEventListener('click', toggle);
    item.dot.addEventListener('click', toggle);
  }
  specimen.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pinned) {
      const button = pinned.button;
      pinned = null;
      render();
      button.focus();
    }
  });

  specimen.append(figure, list, lines);

  // Pointer lines depend on where things landed, so redraw whenever the layout moves.
  const redraw = () => drawLines(specimen, lines, items);
  new ResizeObserver(redraw).observe(specimen);
  wide.addEventListener('change', redraw);
  document.fonts?.ready.then(redraw);
  return specimen;
}

/** Draw a slightly bowed pencil line from each dot to the left edge of its label. */
function drawLines(specimen, svg, items) {
  if (!wide.matches) return;
  const box = specimen.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  for (const { mark, dot, button, path } of items) {
    const d = dot.getBoundingClientRect();
    const b = button.querySelector('.field-mark__no').getBoundingClientRect();
    const x1 = d.right - box.left + 2;
    const y1 = d.top + d.height / 2 - box.top;
    const x2 = b.left - box.left - 8;
    const y2 = b.top + b.height / 2 - box.top;
    // A seeded bow, so each line has its own slight curve that stays put between visits.
    const bow = tiltFor(`line-${mark.id}`) * 6;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 + bow;
    path.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${midX.toFixed(1)} ${midY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
  }
}

// ---------- the written facts ----------

async function buildFacts(profile) {
  const text = make('div', 'ident__text');

  const facts = make('dl', 'ident__facts');
  const addFact = (term, value) => {
    facts.append(make('dt', null, term), fillText(make('dd'), value));
  };
  addFact('Name', profile.name);
  addFact('Known as', profile.nickname);
  addFact('Name origin', profile.nameOrigin);
  text.append(facts);

  text.append(fillText(make('p', 'ident__intro'), profile.intro));

  if (profile.education?.length) {
    const section = make('section', 'ident__block');
    section.append(make('h3', null, 'Education'));
    const list = make('ul', 'ident__education');
    for (const school of profile.education) {
      const li = make('li');
      const span = [formatMonth(school.start), formatMonth(school.end)].filter(Boolean).join(' to ');
      li.append(make('span', 'ident__school', school.school), make('span', 'label', [school.degree, span].filter(Boolean).join(', ')));
      list.append(li);
    }
    section.append(list);
    text.append(section);
  }

  text.append(await buildCurrently(profile.currently ?? {}));
  return text;
}

/** "Currently": each entry is an id pointing into another data file. */
async function buildCurrently(currently) {
  const section = make('section', 'ident__block');
  section.append(make('h3', null, 'Currently'));
  const list = make('dl', 'ident__facts ident__currently');

  const [books, music, projects] = await Promise.all([
    loadData('books').catch(() => []),
    loadData('music').catch(() => ({})),
    loadData('projects').catch(() => []),
  ]);
  const lookups = [
    ['Reading', known(currently.reading) && books.find((b) => b.id === currently.reading), (b) => `${b.title}, ${b.author}`],
    ['Listening to', known(currently.listening) && music.mixtape?.albums?.find((a) => a.id === currently.listening), (a) => `${a.title}, ${a.artist}`],
    ['Building', known(currently.building) && projects.find((p) => p.id === currently.building), (p) => p.name],
  ];
  for (const [term, found, describe] of lookups) {
    list.append(make('dt', null, term), fillText(make('dd'), found ? describe(found) : null));
  }
  section.append(list);
  return section;
}
