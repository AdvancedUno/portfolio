// nav.js: global navigation.
// - Index tabs (bottom bar under 720px) mark the section in view with aria-current.
// - Left and right arrow keys move to the previous or next section.
// - "?" opens the index overlay, a native <dialog>: it traps focus, closes on Escape,
//   and hands focus back to wherever it was.

const tabLinks = [...document.querySelectorAll('.tabs a')];
const sections = tabLinks.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
let currentId = sections[0]?.id;

/** Mark the tab for the section crossing the middle of the viewport. */
function watchSections() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) setCurrent(entry.target.id);
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((section) => observer.observe(section));
}

function setCurrent(id) {
  currentId = id;
  for (const a of tabLinks) {
    if (a.hash === `#${id}`) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  }
}

/** Scroll to a section, put it in the address bar, and move focus there for screen readers. */
export function goTo(id, { smooth = true } = {}) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'instant', block: 'start' });
  history.replaceState(null, '', `#${id}`);
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  setCurrent(id);
}

/** Keys belong to the page only when nothing more specific wants them. */
function isTypingOrBusy(event) {
  const el = event.target;
  return event.defaultPrevented
    || event.altKey || event.ctrlKey || event.metaKey
    || el.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-own-keys]')
    || document.documentElement.dataset.cover === 'closed'
    || dialog?.open;
}

const dialog = document.getElementById('index-dialog');
let returnFocusTo = null;

function openIndex() {
  if (!dialog || dialog.open) return;
  returnFocusTo = document.activeElement;
  dialog.showModal();
}

function wireDialog() {
  if (!dialog) return;
  document.querySelectorAll('[data-open-index]').forEach((button) => button.addEventListener('click', openIndex));
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  // Clicking the backdrop (the dialog element itself, outside its content) closes it.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => returnFocusTo?.focus?.({ preventScroll: true }));
  // Links in the index close the overlay first, then go.
  dialog.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (event) => {
    event.preventDefault();
    returnFocusTo = null;
    dialog.close();
    goTo(a.hash.slice(1));
  }));
}

function wireKeys() {
  document.addEventListener('keydown', (event) => {
    if (event.key === '?' && !isTypingOrBusy(event)) {
      event.preventDefault();
      openIndex();
      return;
    }
    if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && !isTypingOrBusy(event)) {
      const i = sections.findIndex((s) => s.id === currentId);
      const next = sections[i + (event.key === 'ArrowRight' ? 1 : -1)];
      if (next) {
        event.preventDefault();
        goTo(next.id);
      }
    }
  });
}

export function initNav() {
  watchSections();
  wireDialog();
  wireKeys();
}
