// first-specimen.js: the hidden First specimen page.
// A rebuilt version of the click game Uno made in 2021 for older students at the Migrant
// Workers Welfare Society, so they could practice using a mouse. The story stays a
// placeholder until Uno writes it. The page unlocks when the life list is complete, or
// from the faded sticker on the cover; once unlocked it stays unlocked.
//
// The game: ten targets, one at a time, each a little smaller than the last. No timer
// pressure; a gentle word after each one. Targets are buttons, so Tab and Enter work too.

import { loadData } from '../lib/data.js';
import { fillText, known, make } from '../lib/content.js';

const KEY = 'fieldguide:first-specimen';
const ROUNDS = 10;
const CHEERS = ['Got it.', 'Nice.', 'Steady hands.', 'That one too.', 'Good.', 'Right on it.', 'Lovely.', 'Keep going.', 'Almost there.'];

let built = false;

/** Show the page (and remember that it was found). Safe to call more than once. */
export function unlockFirstSpecimen() {
  try { localStorage.setItem(KEY, '1'); } catch { /* this visit only */ }
  const section = document.getElementById('first-specimen');
  if (!section) return;
  section.hidden = false;
  if (!built) {
    built = true;
    build(section);
  }
}

export function initFirstSpecimen() {
  let unlocked = false;
  try { unlocked = localStorage.getItem(KEY) === '1'; } catch { /* stays hidden */ }
  if (unlocked) unlockFirstSpecimen();
  // The cover's faded sticker unlocks it on the way in.
  document.addEventListener('fieldguide:unlock-first-specimen', unlockFirstSpecimen);
}

async function build(section) {
  const profile = await loadData('profile').catch(() => ({}));
  const story = profile.firstSpecimen ?? {};

  section.replaceChildren();
  section.classList.add('plate', 'first-specimen');

  const margin = make('div', 'plate__margin');
  margin.append(make('span', 'plate__numeral', '00'), make('p', 'plate__note', 'The click game, rebuilt.'));
  margin.firstChild.setAttribute('aria-hidden', 'true');

  const body = make('div', 'plate__body');
  const card = make('div', 'specimen-card');
  card.dataset.tilt = 'card-first-specimen';
  card.style.setProperty('--tilt', '-1.4deg');
  const h2 = make('h2', null, 'First specimen');
  h2.id = 'first-specimen-title';
  const line = [known(story.year) ? story.year : null, known(story.place) ? story.place : null].filter(Boolean).join(', ');
  card.append(h2, make('p', 'specimen-card__data', line));

  const text = make('div', 'first-specimen__text');
  text.append(fillText(make('p'), story.summary), fillText(make('p', 'first-specimen__story'), story.story));

  body.append(card, text, buildGame());
  section.append(margin, body);
}

function buildGame() {
  const wrap = make('div', 'game');
  const field = make('div', 'game__field');
  const status = make('p', 'game__status');
  status.setAttribute('aria-live', 'polite');
  const start = make('button', 'game__start', 'Start');
  start.type = 'button';
  field.append(start);
  wrap.append(field, status);

  let round = 0;
  let startedAt = 0;
  let target = null;

  const place = () => {
    target?.remove();
    if (round >= ROUNDS) {
      const seconds = Math.round((performance.now() - startedAt) / 1000);
      status.textContent = `All ten, in ${seconds} seconds. Well done.`;
      start.textContent = 'Play again';
      field.append(start);
      start.focus();
      return;
    }
    // Targets start big and shrink a little each round.
    const size = Math.round(96 - (round * 48) / (ROUNDS - 1));
    target = make('button', 'game__target');
    target.type = 'button';
    target.setAttribute('aria-label', `Target ${round + 1} of ${ROUNDS}`);
    target.style.setProperty('--size', `${size}px`);
    target.style.left = `${8 + Math.random() * 84}%`;
    target.style.top = `${12 + Math.random() * 76}%`;
    target.addEventListener('click', (event) => {
      event.stopPropagation();
      round += 1;
      status.textContent = round < ROUNDS ? `${CHEERS[(round - 1) % CHEERS.length]} ${round} of ${ROUNDS}.` : '';
      place();
    });
    field.append(target);
    // Keep keyboard players on the new target.
    if (document.activeElement === field || field.contains(document.activeElement) || document.activeElement === document.body) target.focus({ preventScroll: true });
  };

  start.addEventListener('click', (event) => {
    event.stopPropagation();
    round = 0;
    startedAt = performance.now();
    status.textContent = `Click the circles as they appear. 0 of ${ROUNDS}.`;
    start.remove();
    place();
    target.focus({ preventScroll: true });
  });

  // A miss is fine: a gentle nudge, no penalty.
  field.addEventListener('click', () => {
    if (target && round < ROUNDS) status.textContent = `Close. Try the circle. ${round} of ${ROUNDS}.`;
  });

  return wrap;
}
