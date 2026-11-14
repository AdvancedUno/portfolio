// discover.js: one way for any interaction to tell the life list it happened.
// Sections call discover('loupe'); the life list listens for the event.

export function discover(id) {
  document.dispatchEvent(new CustomEvent('fieldguide:discover', { detail: { id } }));
}
