// writeup.js: a project's full write-up, on a sheet of paper that unfolds.
// Native <dialog>: focus stays inside, Esc closes it, focus returns to whatever opened it.
// Sections Uno has not written yet show the handwritten placeholder.

import { fillText, known, make } from './content.js';
import { timeAgo } from './github.js';
import { discover } from './discover.js';

let dialog;
let returnFocusTo = null;

/**
 * @param {object} node      a projects.json entry (project or ancestor)
 * @param {object} context   { byId: Map of all nodes, tracks: Map id -> repoTracks result, owner, trigger }
 */
export function openWriteup(node, { byId, tracks, owner, trigger }) {
  dialog ??= buildDialog();
  returnFocusTo = trigger ?? document.activeElement;
  const sheet = dialog.querySelector('.writeup__sheet');
  sheet.replaceChildren(...content(node, { byId, tracks, owner }));
  dialog.showModal();
  sheet.scrollTop = 0;
  dialog.querySelector('.writeup__close').focus();
  discover('writeup');
}

function buildDialog() {
  const d = make('dialog', 'writeup');
  d.setAttribute('aria-labelledby', 'writeup-title');
  d.innerHTML = `
    <button type="button" class="writeup__close">Fold it up</button>
    <article class="writeup__sheet"></article>`;
  document.body.append(d);
  d.querySelector('.writeup__close').addEventListener('click', () => d.close());
  d.addEventListener('click', (event) => { if (event.target === d) d.close(); });
  d.addEventListener('close', () => returnFocusTo?.focus?.({ preventScroll: true }));
  return d;
}

function content(node, { byId, tracks, owner }) {
  const parts = [];
  const title = make('h2', 'writeup__title', node.name);
  title.id = 'writeup-title';
  parts.push(title);

  // The typewritten label line under the title.
  const facts = make('dl', 'writeup__facts');
  const row = (term, value) => { if (value) facts.append(make('dt', null, term), make('dd', null, value)); };
  const live = tracks.get(node.id);
  const collected = known(node.collected) ? node.collected : live?.repo?.created_at?.slice(0, 4);
  row('Collected', collected);
  row('Habitat', known(node.habitat) ? node.habitat : null);
  row('Built with', node.stack?.length ? node.stack.join(', ') : null);
  if (live?.repo?.pushed_at) row('Last seen', timeAgo(live.repo.pushed_at));
  if (live?.repo?.stargazers_count) row('Stars', String(live.repo.stargazers_count));
  if (facts.childElementCount) parts.push(facts);

  parts.push(fillText(make('p', 'writeup__summary'), node.summary));

  // Lineage, from the family tree.
  const parents = (node.parents ?? []).map((id) => byId.get(id)).filter(Boolean);
  const children = [...byId.values()].filter((n) => n.parents?.includes(node.id));
  if (parents.length || children.length) {
    const lineage = make('p', 'writeup__lineage');
    if (parents.length) lineage.append(`Grew out of ${parents.map((p) => p.name).join(' and ')}.`);
    if (children.length) lineage.append(`${parents.length ? ' ' : ''}Led to ${children.map((c) => c.name).join(' and ')}.`);
    parts.push(lineage);
  }

  if (node.kind === 'project') {
    const sections = [
      ['The problem', node.writeup?.problem],
      ['How I built it', node.writeup?.built],
      ['What was hard', node.writeup?.hard],
      ['What I would do next', node.writeup?.next],
    ];
    for (const [heading, text] of sections) {
      const section = make('section', 'writeup__section');
      section.append(make('h3', null, heading), fillText(make('p'), text));
      parts.push(section);
    }
  }

  const links = [];
  if (known(node.repo) && owner) links.push({ label: 'Code on GitHub', url: `https://github.com/${owner}/${node.repo}` });
  for (const link of node.links ?? []) if (known(link.url)) links.push(link);
  if (links.length) {
    const list = make('ul', 'writeup__links');
    for (const link of links) {
      const a = make('a', null, link.label);
      a.href = link.url;
      const li = make('li');
      li.append(a);
      list.append(li);
    }
    parts.push(list);
  }
  return parts;
}
