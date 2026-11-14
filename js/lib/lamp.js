// lamp.js: the desk lamp. Lamp on = light paper, lamp off = dark desk.
// The page follows prefers-color-scheme until the visitor pulls the chain; after that
// the choice is remembered in localStorage. A tiny inline script in <head> applies the
// saved choice before first paint, so there is no flash of the wrong theme.

import { discover } from './discover.js';

const KEY = 'fieldguide:theme';
const root = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');

/** The theme in effect right now: an explicit choice, or the system's. */
function currentTheme() {
  return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
}

/** Wire up the lamp button. */
export function initLamp(button) {
  const label = button.querySelector('.lamp__label');

  const render = () => {
    const on = currentTheme() === 'light';
    button.classList.toggle('is-on', on);
    label.textContent = on ? 'Turn the lamp off (dark mode)' : 'Turn the lamp on (light mode)';
    // Keep the browser's toolbar color in step with the paper.
    const paper = getComputedStyle(root).getPropertyValue('--paper').trim();
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = paper;
  };

  button.addEventListener('click', () => {
    root.dataset.theme = currentTheme() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, root.dataset.theme); } catch { /* storage blocked: choice lasts this page only */ }
    // Restart the chain-pull animation.
    button.classList.remove('is-pulled');
    void button.offsetWidth;
    button.classList.add('is-pulled');
    render();
    if (root.dataset.theme === 'dark') discover('lamp');
  });

  systemDark.addEventListener('change', render);
  render();
}
