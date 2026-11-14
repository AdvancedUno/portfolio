// family-tree.js: the project family tree, drawn from the "parents" field in projects.json.
//
// Layout: a pencil trunk down the left. Each lineage grows to the right as a branch, one
// column per generation (on phones, an indented outline instead) (a project sits one column right of its deepest parent). A node with
// several children keeps the first on its own row and starts a new row for each of the rest.
// The layout is worked out in pixels from the container's width, and redrawn on resize, so
// labels stay readable on a phone.
//
// Hovering or focusing a node traces its ancestry back to the trunk in dark pencil.
// Nodes are buttons: clicking one opens the same write-up as the specimen.

import { make } from './content.js';
import { tiltFor } from './tilt.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TRUNK_X = 18;

export function buildFamilyTree(nodes, { onOpen }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = (n) => (n.parents ?? []).map((id) => byId.get(id)).filter(Boolean);

  // Generation = one more than the deepest parent.
  const depth = new Map();
  const depthOf = (n) => {
    if (!depth.has(n.id)) depth.set(n.id, 0); // guards against cycles
    const d = Math.max(-1, ...parentOf(n).map(depthOf)) + 1;
    depth.set(n.id, d);
    return d;
  };
  nodes.forEach(depthOf);

  // Rows: walk down from each root; the first child stays on the parent's row.
  const row = new Map();
  let rows = 0;
  const place = (n, r) => {
    if (row.has(n.id)) return;
    row.set(n.id, r);
    nodes.filter((c) => parentOf(c)[0]?.id === n.id).forEach((child, i) => place(child, i === 0 ? r : rows++));
  };
  nodes.filter((n) => parentOf(n).length === 0).forEach((root) => place(root, rows++));

  const columns = Math.max(...depth.values()) + 1;

  const root = make('div', 'tree');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'tree__lines');
  svg.setAttribute('aria-hidden', 'true');
  const list = make('ul', 'tree__nodes');
  list.setAttribute('aria-label', 'Project family tree');
  root.append(svg, list);

  // One button per node, in reading order (row by row, left to right).
  const ordered = [...nodes].sort((a, b) => row.get(a.id) - row.get(b.id) || depth.get(a.id) - depth.get(b.id));
  const buttons = new Map();
  for (const n of ordered) {
    const li = make('li');
    const button = make('button', `tree__node tree__node--${n.kind}`);
    button.type = 'button';
    button.append(make('span', 'tree__leaf'), make('span', 'tree__name', n.name));
    const parents = parentOf(n);
    button.setAttribute('aria-label', `${n.name}.${parents.length ? ` Grew out of ${parents.map((p) => p.name).join(' and ')}.` : ''} Open write-up.`);
    button.addEventListener('click', () => onOpen(n, button));
    li.append(button);
    list.append(li);
    buttons.set(n.id, button);
  }

  // Segments, keyed by the child they lead to, so tracing can find them.
  const segments = new Map();
  const trace = (id) => {
    const lineage = new Set();
    const walk = (n) => { lineage.add(n.id); parentOf(n).forEach(walk); };
    if (id) walk(byId.get(id));
    root.classList.toggle('is-tracing', Boolean(id));
    for (const [childId, paths] of segments) paths.forEach((p) => p.classList.toggle('is-traced', lineage.has(childId)));
    for (const [nodeId, button] of buttons) button.classList.toggle('is-traced', lineage.has(nodeId));
  };
  for (const [id, button] of buttons) {
    button.addEventListener('pointerenter', () => trace(id));
    button.addEventListener('focus', () => trace(id));
    button.addEventListener('pointerleave', () => trace(null));
    button.addEventListener('blur', () => trace(null));
  }

  const layout = () => {
    const width = root.clientWidth;
    if (!width) return;
    // Phones get an outline: one node per row, indented by generation, with elbow connectors.
    // Wider screens get the branching tree, one column per generation.
    const narrow = width < 560;
    root.classList.toggle('is-outline', narrow);
    const rowH = narrow ? 46 : 92;
    const colW = narrow ? 26 : (width - TRUNK_X - 24) / columns;
    const height = (narrow ? ordered.length : rows) * rowH + 8;
    root.style.height = `${height}px`;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.replaceChildren();
    segments.clear();

    const pos = new Map();
    ordered.forEach((n, i) => {
      const x = TRUNK_X + 24 + depth.get(n.id) * colW + (narrow ? 0 : colW * 0.12);
      const y = (narrow ? i : row.get(n.id)) * rowH + (narrow ? 22 : 26);
      pos.set(n.id, { x, y });
    });

    const pencil = (d, childId, cls = '') => {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      if (cls) p.setAttribute('class', cls);
      svg.append(p);
      if (childId) segments.set(childId, [...(segments.get(childId) ?? []), p]);
      return p;
    };

    // The trunk, with a slight hand wobble, from the first root to the last.
    const rootYs = ordered.filter((n) => !parentOf(n).length).map((n) => pos.get(n.id).y);
    const top = Math.min(...rootYs);
    const bottom = Math.max(...rootYs);
    pencil(`M${TRUNK_X} ${top - 14} C${TRUNK_X + 3} ${top + (bottom - top) * 0.3} ${TRUNK_X - 3} ${top + (bottom - top) * 0.7} ${TRUNK_X} ${bottom + 10}`, null, 'tree__trunk');

    for (const n of nodes) {
      const { x, y } = pos.get(n.id);
      const parents = parentOf(n);
      const bow = tiltFor(`branch-${n.id}`) * 3;
      if (!parents.length) {
        // A branch off the trunk.
        pencil(`M${TRUNK_X} ${y} Q${(TRUNK_X + x) / 2} ${y - 6 + bow} ${x - 7} ${y}`, n.id);
      }
      for (const parent of parents) {
        const from = pos.get(parent.id);
        if (narrow) {
          // Down from the parent's leaf, then a soft elbow across to the child.
          pencil(`M${from.x} ${from.y + 8} L${from.x} ${y - 8} Q${from.x} ${y} ${from.x + 8} ${y} L${x - 8} ${y}`, n.id);
        } else {
          const midX = (from.x + x) / 2;
          pencil(`M${from.x + 7} ${from.y} C${midX} ${from.y + bow} ${midX} ${y - bow} ${x - 7} ${y}`, n.id);
        }
      }
      const button = buttons.get(n.id);
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.style.width = narrow ? `${width - x - 8}px` : `${Math.max(colW * 0.86, 72)}px`;
    }
  };

  new ResizeObserver(layout).observe(root);
  return root;
}
