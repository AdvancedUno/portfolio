// loupe.js: a field magnifier that shows the real photo under a sketch.
//
// The loupe cuts a circle out of the drawing layer (a CSS radial mask at --lx, --ly) and
// zooms the photo underneath 1.15x around the same point, inside a brass rim.
//   Mouse or pen: follows the pointer while it is over the sketch.
//   Touch:        press and hold (300ms) to bring it up, then drag; lifting puts it away.
//                 A quick swipe still scrolls the page as normal.
//   Keyboard:     focus the sketch, L toggles a centered loupe, arrows move it, Esc puts it away.
// The first use anywhere announces a "loupe" discovery for the life list.

import { discover } from './discover.js';

const HOLD_MS = 300;
const MOVE_TOLERANCE = 10;   // px a finger may drift before a hold counts as a scroll instead
const KEY_STEP = 0.04;       // arrow keys move 4% of the sketch (12% with Shift)

let discovered = false;
function announceDiscovery() {
  if (discovered) return;
  discovered = true;
  discover('loupe');
}

/** Give one sketch figure its loupe. */
export function attachLoupe(figure) {
  const stage = figure.querySelector('.sketch__stage');
  let x = 0;
  let y = 0;
  let frame = 0;
  let keyboardActive = false;

  const paint = () => {
    frame = 0;
    figure.style.setProperty('--lx', `${x}px`);
    figure.style.setProperty('--ly', `${y}px`);
  };

  // Clamp to the sketch and repaint on the next frame, so fast pointer moves cost one paint each.
  const moveTo = (clientX, clientY) => {
    const box = stage.getBoundingClientRect();
    x = Math.min(Math.max(clientX - box.left, 0), box.width);
    y = Math.min(Math.max(clientY - box.top, 0), box.height);
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const show = () => {
    figure.classList.add('is-looking');
    announceDiscovery();
  };
  const hide = () => {
    figure.classList.remove('is-looking');
    keyboardActive = false;
    stage.removeAttribute('data-own-keys');
  };

  // ---------- mouse and pen ----------
  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    moveTo(event.clientX, event.clientY);
    show();
  });
  stage.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'touch' && !keyboardActive) hide();
  });

  // ---------- touch: press and hold ----------
  let holdTimer = 0;
  let start = null;
  let holding = false;

  stage.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    start = { x: touch.clientX, y: touch.clientY };
    holdTimer = setTimeout(() => {
      holding = true;
      moveTo(start.x, start.y);
      show();
    }, HOLD_MS);
  }, { passive: true });

  // Not passive: once the loupe is up, the finger drags the loupe instead of scrolling the page.
  stage.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    if (holding) {
      event.preventDefault();
      moveTo(touch.clientX, touch.clientY);
    } else if (start && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > MOVE_TOLERANCE) {
      clearTimeout(holdTimer);
    }
  }, { passive: false });

  const endTouch = () => {
    clearTimeout(holdTimer);
    if (holding) hide();
    holding = false;
    start = null;
  };
  stage.addEventListener('touchend', endTouch);
  stage.addEventListener('touchcancel', endTouch);
  // A long press would otherwise open the "save image" menu.
  stage.addEventListener('contextmenu', (event) => { if (holding) event.preventDefault(); });

  // ---------- keyboard ----------
  stage.addEventListener('keydown', (event) => {
    const box = stage.getBoundingClientRect();
    if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      if (keyboardActive) {
        hide();
      } else {
        keyboardActive = true;
        stage.setAttribute('data-own-keys', ''); // tells page navigation to leave arrow keys alone
        moveTo(box.left + box.width / 2, box.top + box.height / 2);
        show();
      }
      return;
    }
    if (!keyboardActive) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
      return;
    }
    const step = (event.shiftKey ? 3 : 1) * KEY_STEP;
    const moves = {
      ArrowLeft: [-step * box.width, 0],
      ArrowRight: [step * box.width, 0],
      ArrowUp: [0, -step * box.height],
      ArrowDown: [0, step * box.height],
    };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      moveTo(box.left + x + dx, box.top + y + dy);
    }
  });
  stage.addEventListener('blur', () => { if (keyboardActive) hide(); });
}
