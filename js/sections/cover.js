// cover.js: the closed notebook that opens the site.
// Clicking the board (or Enter on it) swings it open on its left edge; a sticker
// opens it and then jumps to its section. The opening is remembered for the session,
// so returning to the page goes straight to the contents.

import { goTo } from './nav.js';

const KEY = 'fieldguide:cover-open';
const root = document.documentElement;

export function initCover() {
  const notebook = document.getElementById('notebook');
  if (!notebook) return;
  if (root.dataset.cover !== 'closed') {
    notebook.hidden = true;
    return;
  }

  // Everything behind the notebook is out of reach (focus, clicks, screen readers) while it is closed.
  const page = [...document.body.children].filter((el) => el !== notebook && !el.matches('script, .sprite'));
  page.forEach((el) => { el.inert = true; });

  const openButton = notebook.querySelector('.notebook__open');
  openButton.focus({ preventScroll: true });

  let opening = false;

  function open(destination) {
    if (opening) return;
    opening = true;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked: the cover shows again next load */ }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      notebook.hidden = true;
      root.dataset.cover = 'open';
      page.forEach((el) => { el.inert = false; });
      if (destination) {
        goTo(destination, { smooth: false });
      } else {
        const contents = document.getElementById('cover');
        contents.setAttribute('tabindex', '-1');
        contents.focus({ preventScroll: true });
      }
    };

    // The notebook fades out last (after the swing), so the end of that fade is the end of the opening.
    notebook.addEventListener('transitionend', (event) => {
      if (event.target === notebook && event.propertyName === 'opacity') finish();
    });
    setTimeout(finish, 2200); // in case transitionend never fires
    notebook.classList.add('is-opening');
  }

  openButton.addEventListener('click', () => open());
  notebook.querySelectorAll('.sticker').forEach((sticker) => {
    sticker.addEventListener('click', (event) => {
      event.preventDefault();
      open(sticker.hash.slice(1));
    });
  });
}
