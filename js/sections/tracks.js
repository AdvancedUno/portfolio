// tracks.js: Tracks and signs, the projects plate.
//
//   Specimens:   each project pinned like a specimen, with a typewritten label and live
//                GitHub tracks (last push, colored-pencil language strokes, stars).
//   Filter:      language names; picking one fades the other specimens to graphite.
//   Write-up:    clicking a specimen unfolds its full write-up (writeup.js).
//   Family tree: a second tab, drawn from the parents field (family-tree.js). Finding it
//                is a life list discovery.

import { loadData } from '../lib/data.js';
import { fillText, known, make } from '../lib/content.js';
import { applyTilts } from '../lib/tilt.js';
import { repoTracks, timeAgo, languageStrokes, canonical, isHabitat } from '../lib/github.js';
import { openWriteup } from '../lib/writeup.js';
import { buildFamilyTree } from '../lib/family-tree.js';
import { discover } from '../lib/discover.js';

export async function initTracks() {
  const plate = document.getElementById('tracks');
  const slot = plate?.querySelector('.fig');
  if (!slot) return;

  let nodes;
  let profile;
  try {
    [nodes, profile] = await Promise.all([loadData('projects'), loadData('profile')]);
  } catch {
    return;
  }
  const owner = /github\.com\/([^/]+)/.exec(profile.links?.github ?? '')?.[1];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const projects = nodes.filter((n) => n.kind === 'project');
  const tracks = new Map();

  const root = make('div', 'tracks');
  const { tablist, specimensTab, treeTab, specimensPanel, treePanel } = buildTabs();
  const filter = make('div', 'lang-filter');
  filter.setAttribute('role', 'group');
  filter.setAttribute('aria-label', 'Filter specimens by language');
  const grid = make('ul', 'specimens');
  specimensPanel.append(filter, grid);
  root.append(tablist, specimensPanel, treePanel);
  slot.replaceWith(root);

  const open = (node, trigger) => openWriteup(node, { byId, tracks, owner, trigger });

  // ---------- specimens ----------
  const cards = projects.map((project, i) => {
    const li = make('li', 'specimen');
    li.dataset.tilt = `specimen-${project.id}`;
    const label = make('div', 'specimen__label');
    label.append(make('span', 'specimen__no', `No. 03-${i + 1}`));
    const h3 = make('h3', 'specimen__name');
    const button = make('button', 'specimen__open', project.name);
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    h3.append(button);
    label.append(h3);

    const facts = make('dl', 'specimen__facts');
    const collected = make('dd');
    const habitat = make('dd');
    facts.append(make('dt', null, 'Collected'), collected, make('dt', null, 'Habitat'), habitat);
    fillText(collected, project.collected);
    fillText(habitat, project.habitat);
    label.append(facts, fillText(make('p', 'specimen__summary'), project.summary));

    const live = make('div', 'specimen__tracks');
    live.append(make('span', 'specimen__loading'));
    li.append(make('span', 'specimen__pin'), label, live);
    grid.append(li);

    // The whole card opens the write-up; the button inside is what keyboards and screen readers use.
    button.addEventListener('click', () => open(project, button));
    li.addEventListener('click', (event) => { if (!event.target.closest('button, a')) button.click(); });
    return { project, li, collected, habitat, live, languages: new Set(known(project.habitat) ? [project.habitat] : []) };
  });
  applyTilts(grid);

  // ---------- live GitHub tracks ----------
  await Promise.all(cards.map(async (card) => {
    const { project } = card;
    if (!owner || !known(project.repo)) {
      card.live.replaceChildren(make('span', 'specimen__quiet', 'Tracks to come.'));
      return;
    }
    const result = await repoTracks(owner, project.repo);
    tracks.set(project.id, result);
    const parts = [];
    if (result.repo?.pushed_at) parts.push(make('span', 'specimen__seen', `Last seen ${timeAgo(result.repo.pushed_at)}`));
    if (result.repo?.stargazers_count) parts.push(make('span', 'specimen__stars', `${result.repo.stargazers_count} ${result.repo.stargazers_count === 1 ? 'star' : 'stars'}`));
    if (result.languages.length) {
      const { svg, caption } = languageStrokes(result.languages);
      const strokes = make('span', 'specimen__langs');
      strokes.append(svg, make('span', 'specimen__lang-caption', caption));
      parts.push(strokes);
      result.languages.filter((l) => l.share >= 0.04 && isHabitat(l.name)).forEach((l) => card.languages.add(l.name));
    }
    // Fill missing label lines from the repo itself: first push year, main language.
    if (!known(project.collected) && result.repo?.created_at) fillText(card.collected, result.repo.created_at.slice(0, 4));
    if (!known(project.habitat) && result.repo?.language) {
      fillText(card.habitat, canonical(result.repo.language));
      card.languages.add(canonical(result.repo.language));
    }
    card.live.replaceChildren(...(parts.length ? parts : [make('span', 'specimen__quiet', 'No tracks yet.')]));
  }));

  buildFilter(filter, cards);

  // ---------- family tree, built the first time its tab opens ----------
  let treeBuilt = false;
  treeTab.addEventListener('click', () => {
    if (!treeBuilt) {
      treeBuilt = true;
      const hint = make('p', 'tree__hint note');
      hint.append(
        make('span', 'tree__hint-hover', 'Hover a project to trace what it grew out of. Click to read it.'),
        make('span', 'tree__hint-touch', 'Tap a project to read what it grew out of.'),
      );
      treePanel.append(hint, buildFamilyTree(nodes, { onOpen: open }));
      discover('family-tree');
    }
  });
}

function buildTabs() {
  const tablist = make('div', 'tracks__tabs');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Projects view');
  tablist.setAttribute('data-own-keys', ''); // arrow keys move between tabs here, not sections

  const tab = (id, text) => {
    const button = make('button', 'tracks__tab', text);
    Object.assign(button, { type: 'button', id: `tracks-tab-${id}` });
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `tracks-panel-${id}`);
    return button;
  };
  const panel = (id) => {
    const p = make('div', `tracks__panel tracks__panel--${id}`);
    p.id = `tracks-panel-${id}`;
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', `tracks-tab-${id}`);
    return p;
  };
  const specimensTab = tab('specimens', 'Specimens');
  const treeTab = tab('tree', 'Family tree');
  const specimensPanel = panel('specimens');
  const treePanel = panel('tree');
  tablist.append(specimensTab, treeTab);

  const select = (chosen) => {
    for (const [t, p] of [[specimensTab, specimensPanel], [treeTab, treePanel]]) {
      const on = t === chosen;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      p.hidden = !on;
    }
  };
  specimensTab.addEventListener('click', () => select(specimensTab));
  treeTab.addEventListener('click', () => select(treeTab));
  tablist.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = document.activeElement === specimensTab ? treeTab : specimensTab;
    next.focus();
    next.click();
  });
  select(specimensTab);
  return { tablist, specimensTab, treeTab, specimensPanel, treePanel };
}

/** Language chips. One active at a time; picking it again clears the filter. */
function buildFilter(container, cards) {
  const languages = [...new Set(cards.flatMap((c) => [...c.languages]))].sort((a, b) => a.localeCompare(b));
  if (languages.length < 2) return;
  container.append(make('span', 'lang-filter__label', 'Habitat'));
  let active = null;
  const chips = languages.map((language) => {
    const chip = make('button', 'lang-chip', language);
    chip.type = 'button';
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      active = active === language ? null : language;
      for (const c of chips) c.setAttribute('aria-pressed', String(c.textContent === active));
      for (const card of cards) card.li.classList.toggle('is-faded', Boolean(active) && !card.languages.has(active));
    });
    return chip;
  });
  container.append(...chips);
}
