// flip.js: a small card that turns over, shared by the specimen drawer and Habitat.
//
//   <li class="flip">
//     <div class="flip__card">
//       <div class="flip__face flip__front"> ... <button class="flip__turn">  </div>
//       <div class="flip__face flip__back">  ... <button class="flip__turn">  </div>
//     </div>
//   </li>
//
// Each face holds its own "turn over" button. The face turned away is inert, so Tab and
// screen readers only meet the side you can see, and focus follows the card when it turns.
// The 3D turn (and its reduced-motion crossfade) lives in css/components/flip.css.

import { make } from './content.js';

/**
 * Build a flip card.
 * @param {object} options
 * @param {string} options.className     extra class for the <li>
 * @param {Node[]} options.front         content of the front face
 * @param {Node[]} options.back          content of the back face
 * @param {string} options.turnLabel     accessible name of the front button, e.g. "Violin, turn over"
 * @param {string} [options.backLabel]   accessible name of the back button
 * @param {() => void} [options.onFirstTurn]  called the first time the card is turned over
 * @returns {HTMLLIElement}
 */
export function flipCard({ className, front, back, turnLabel, backLabel = 'Turn back', onFirstTurn }) {
  const li = make('li', `flip ${className ?? ''}`.trim());
  const card = make('div', 'flip__card');
  const frontFace = make('div', 'flip__face flip__front');
  const backFace = make('div', 'flip__face flip__back');

  // The front button covers the whole face, so the card turns from anywhere on it.
  const turn = make('button', 'flip__turn');
  turn.type = 'button';
  turn.setAttribute('aria-label', turnLabel);
  const turnBack = make('button', 'flip__back-button', 'Turn back');
  turnBack.type = 'button';
  turnBack.setAttribute('aria-label', backLabel);

  frontFace.append(...front, turn);
  backFace.append(...back, turnBack);
  backFace.inert = true;
  card.append(frontFace, backFace);
  li.append(card);

  let turned = false;
  const set = (flipped) => {
    li.classList.toggle('is-flipped', flipped);
    frontFace.inert = flipped;
    backFace.inert = !flipped;
    (flipped ? turnBack : turn).focus({ preventScroll: true });
    if (flipped && !turned) {
      turned = true;
      onFirstTurn?.();
    }
  };
  turn.addEventListener('click', () => set(true));
  turnBack.addEventListener('click', () => set(false));
  // A click anywhere on the back (except a link) also turns it back.
  backFace.addEventListener('click', (event) => {
    if (event.target === backFace) set(false);
  });
  li.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && li.classList.contains('is-flipped')) set(false);
  });
  return li;
}
