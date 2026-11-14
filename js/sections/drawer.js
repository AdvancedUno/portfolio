// drawer.js: the Specimen drawer.
//
// A wooden drawer in a cabinet. Pulling the handle slides it open: the tray grows above the
// drawer front, nearest row first, the way a real drawer comes out toward you. Inside, each
// object from objects.json sits in a small card tray on cotton with a handwritten slip.
// Hovering lifts an object off the cotton; clicking turns it over to its story.
//
// Objects without a photo yet show a plain pencil drawing of that kind of thing, labeled
// "Photo to come" (see lib/object-drawings.js).

import { loadData, fromRoot } from '../lib/data.js';
import { fillText, known, make } from '../lib/content.js';
import { tiltFor } from '../lib/tilt.js';
import { flipCard } from '../lib/flip.js';
import { objectDrawing } from '../lib/object-drawings.js';
import { discover } from '../lib/discover.js';

export async function initDrawer() {
  const slot = document.querySelector('#drawer .fig');
  if (!slot) return;
  let objects;
  try {
    objects = await loadData('objects');
  } catch {
    return;
  }

  const drawer = make('div', 'drawer');
  const tray = make('div', 'drawer__tray');
  tray.id = 'drawer-tray';
  tray.inert = true;
  const inside = make('div', 'drawer__inside');
  const list = make('ul', 'drawer__objects');
  list.setAttribute('aria-label', 'Objects in the drawer');
  for (const object of objects) list.append(buildObject(object));
  inside.append(list);
  tray.append(inside);

  // The drawer front is one big button; the handle and label are drawn on it.
  const front = make('button', 'drawer__front');
  front.type = 'button';
  front.setAttribute('aria-expanded', 'false');
  front.setAttribute('aria-controls', tray.id);
  const label = make('span', 'drawer__label');
  label.append(make('span', 'drawer__label-card', 'Specimens, misc.'));
  const action = make('span', 'visually-hidden', 'Open the drawer');
  front.append(label, make('span', 'drawer__handle'), action);

  const hint = make('p', 'drawer__hint', 'Give the handle a pull.');

  const set = (open) => {
    drawer.classList.toggle('is-open', open);
    front.setAttribute('aria-expanded', String(open));
    action.textContent = open ? 'Close the drawer' : 'Open the drawer';
    tray.inert = !open;
    hint.textContent = open ? 'Click a thing to turn it over.' : 'Give the handle a pull.';
    if (open) discover('drawer');
  };
  front.addEventListener('click', () => set(!drawer.classList.contains('is-open')));

  drawer.append(make('div', 'drawer__cabinet-top'), tray, front);
  const wrap = make('div', 'drawer-wrap');
  wrap.append(drawer, hint);
  slot.replaceWith(wrap);
}

function buildObject(object) {
  const name = known(object.name) ? object.name : 'An object';

  // Front: the thing on cotton, and its slip.
  const thing = make('div', 'obj__thing');
  if (known(object.photo)) {
    const picture = document.createElement('picture');
    if (known(object.webp)) {
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.srcset = fromRoot(object.webp);
      picture.append(source);
    }
    const img = document.createElement('img');
    img.src = fromRoot(object.photo);
    img.alt = known(object.alt) ? object.alt : '';
    img.loading = 'lazy';
    img.decoding = 'async';
    if (object.width) img.width = object.width;
    if (object.height) img.height = object.height;
    picture.append(img);
    thing.append(picture);
  } else {
    thing.innerHTML = objectDrawing(object.id);
    thing.classList.add('is-drawing');
  }

  const slip = make('div', 'obj__slip');
  slip.style.setProperty('--tilt', `${tiltFor(`slip-${object.id}`)}deg`);
  slip.append(make('span', 'obj__name', name));
  slip.append(fillText(make('span', 'obj__label'), object.label));
  if (!known(object.photo)) slip.append(make('span', 'obj__pending', 'Photo to come'));

  // Back: the story.
  const story = fillText(make('p', 'obj__story'), object.story);
  const backTitle = make('h3', 'obj__back-title', name);

  return flipCard({
    className: 'obj',
    front: [thing, slip],
    back: [backTitle, story],
    turnLabel: `${name}, turn over for its story`,
    backLabel: `Turn ${name.toLowerCase()} back over`,
  });
}
