// behavior.js: Behavior, sports and games, with a playable dartboard.
//
// Throwing: press on the dart waiting at the throwing line, pull back, and let go, like a
// slingshot. The dart flies the opposite way to the pull:
//   - sideways pull sets the left-right angle,
//   - pull length is the power: too little lands low, too much lands high,
//   - release speed (from the last pointer moves) adds a little wobble, plus a little chance.
// A Throw button does a steady, slightly random throw for keyboards and switch users.
// Each landing scores like a real board, thunks (Web Audio, no file), goes on the chalk
// scoreboard, and reveals the fact for its segment. A bullseye ticks the life list.

import { loadData } from '../lib/data.js';
import { createSketch } from '../lib/sketch.js';
import { fillText, known, make } from '../lib/content.js';
import { discover } from '../lib/discover.js';
import { STAGE_W, STAGE_H, CX, CY, R, boardMarkup, scoreAt } from '../lib/dartboard.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const REST = { x: CX, y: STAGE_H - 52 };   // where the waiting dart sits
const IDEAL_PULL = 92;                      // a pull this long lands level with the bull
const DARTS_PER_ROUND = 3;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

export async function initBehavior() {
  const slot = document.querySelector('#behavior .fig');
  if (!slot) return;
  let profile;
  let photos;
  try {
    [profile, photos] = await Promise.all([loadData('profile'), loadData('photos')]);
  } catch {
    return;
  }

  const root = make('div', 'behavior');
  root.append(buildNotes(profile.behavior ?? []));
  root.append(buildGame(profile, photos));
  slot.replaceWith(root);
}

// ---------- short notes on each sport and game ----------

function buildNotes(behaviors) {
  const list = make('ul', 'behavior__notes');
  for (const b of behaviors) {
    const li = make('li', 'behavior__note');
    li.append(make('h3', null, b.name));
    if (b.facts?.length) {
      const facts = make('ul', 'behavior__facts');
      for (const fact of b.facts) facts.append(make('li', null, fact));
      li.append(facts);
    }
    li.append(fillText(make('p'), b.note));
    list.append(li);
  }
  return list;
}

// ---------- the dartboard ----------

/** Facts for segments: Uno's own dartboard facts if written, else his recorded sports facts. */
function factPool(profile) {
  const own = new Map((profile.dartboardFacts ?? []).filter((f) => known(f.fact)).map((f) => [String(f.segment), f.fact]));
  const fallback = (profile.behavior ?? []).flatMap((b) => (b.facts ?? []).map((fact) => `${b.name}: ${fact}.`));
  return (key, index) => own.get(String(key)) ?? (fallback.length ? fallback[index % fallback.length] : null);
}

function buildGame(profile, photos) {
  const factFor = factPool(profile);
  const game = make('div', 'darts');

  // The board and the throwing line share one stage, so the dart flies in board units.
  const stage = make('div', 'darts__stage');
  const board = document.createElementNS(SVG_NS, 'svg');
  board.setAttribute('viewBox', `0 0 ${STAGE_W} ${STAGE_H}`);
  board.setAttribute('class', 'darts__board');
  board.setAttribute('role', 'img');
  board.setAttribute('aria-label', 'A dartboard drawn in pencil. Pull the dart back and let go to throw, or use the Throw button.');
  board.innerHTML = `${boardMarkup()}
    <line class="darts__oche" x1="40" y1="${REST.y + 30}" x2="${STAGE_W - 40}" y2="${REST.y + 30}"/>
    <g class="darts__stuck"></g>
    <line class="darts__band" x1="${REST.x}" y1="${REST.y}" x2="${REST.x}" y2="${REST.y}"/>
    <g class="darts__ready" transform="translate(${REST.x} ${REST.y})">${dartShape()}</g>`;
  const pad = make('div', 'darts__pad');
  pad.setAttribute('aria-hidden', 'true');
  stage.append(board, pad);

  const side = make('div', 'darts__side');
  const chalk = make('div', 'chalkboard');
  chalk.append(make('h3', 'chalkboard__title', 'Scores'));
  const rounds = make('ol', 'chalkboard__rounds');
  const total = make('p', 'chalkboard__total', 'Total 0');
  chalk.append(rounds, total);

  const fact = make('p', 'darts__fact');
  fact.setAttribute('aria-live', 'polite');
  fact.textContent = 'Pull the dart back and let go. A medium pull flies level with the bull.';

  const throwBtn = make('button', 'darts__throw', 'Throw a dart');
  throwBtn.type = 'button';
  const reference = photos.find((p) => p.id === 'dartboard');
  side.append(chalk, fact, throwBtn);
  if (reference) {
    const sketch = createSketch(reference, { caption: 'Drawn from my dartboard.' });
    sketch.classList.add('darts__reference');
    side.append(sketch);
  }
  game.append(stage, side);

  const stuck = board.querySelector('.darts__stuck');
  const ready = board.querySelector('.darts__ready');
  const band = board.querySelector('.darts__band');

  let thrown = [];
  let sum = 0;
  let row = null;
  let flying = false;

  // Screen pixels to stage units.
  const toStage = (clientX, clientY) => {
    const box = board.getBoundingClientRect();
    return { x: ((clientX - box.left) / box.width) * STAGE_W, y: ((clientY - box.top) / box.height) * STAGE_H };
  };

  const land = (x, y) => {
    if (thrown.length === DARTS_PER_ROUND) {
      thrown = [];
      stuck.replaceChildren();
      row = null;
    }
    const result = scoreAt(x, y);
    thrown.push(result);
    sum += result.score;

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'darts__stuck-dart');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(Math.random() * 24 - 12).toFixed(1)}) scale(.62)`);
    g.innerHTML = dartShape();
    stuck.append(g);
    if (result.score > 0) thunk();

    if (!row) {
      row = make('li');
      rounds.prepend(row);
      while (rounds.children.length > 4) rounds.lastElementChild.remove();
    }
    const roundSum = thrown.reduce((s, t) => s + t.score, 0);
    row.textContent = `${thrown.map((t) => t.short).join(', ')} = ${roundSum}`;
    total.textContent = `Total ${sum}`;

    const index = (thrown.length - 1) + rounds.children.length;
    const key = result.bull ? 'bull' : result.segment;
    const line = result.score === 0
      ? 'Off the board. It happens.'
      : `${result.label}: ${result.score} points. ${key !== null ? (factFor(key, index) ?? '') : ''}`.trim();
    fact.textContent = line;
    if (result.bull) discover('bullseye');
    if (thrown.length === DARTS_PER_ROUND) throwBtn.textContent = 'Collect the darts and throw';
    else throwBtn.textContent = 'Throw a dart';
  };

  /** Fly a dart from the line to (x, y), then land it. */
  const fly = (x, y) => {
    flying = true;
    ready.style.visibility = 'hidden';
    const done = () => {
      ready.style.visibility = '';
      flying = false;
      land(x, y);
    };
    if (reduceMotion.matches) {
      done();
      return;
    }
    const flier = document.createElementNS(SVG_NS, 'g');
    flier.innerHTML = dartShape();
    board.append(flier);
    const start = performance.now();
    const duration = 340;
    const arc = -40; // a slight lob
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - (1 - t) ** 2;
      const px = REST.x + (x - REST.x) * e;
      const py = REST.y + (y - REST.y) * e + arc * Math.sin(Math.PI * t);
      flier.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${(1 - 0.38 * e).toFixed(3)})`);
      if (t < 1) requestAnimationFrame(step);
      else {
        flier.remove();
        done();
      }
    };
    requestAnimationFrame(step);
  };

  // ---------- drag back and release ----------
  let pulling = null;
  pad.addEventListener('pointerdown', (event) => {
    if (flying) return;
    pad.setPointerCapture(event.pointerId);
    pulling = { start: toStage(event.clientX, event.clientY), samples: [] };
    game.classList.add('is-pulling');
  });
  pad.addEventListener('pointermove', (event) => {
    if (!pulling) return;
    const p = toStage(event.clientX, event.clientY);
    pulling.samples.push({ ...p, t: performance.now() });
    if (pulling.samples.length > 6) pulling.samples.shift();
    // The waiting dart follows the pull, with a rubber band back to the line.
    const dx = Math.max(-80, Math.min(80, p.x - pulling.start.x));
    const dy = Math.max(0, Math.min(120, p.y - pulling.start.y));
    ready.setAttribute('transform', `translate(${REST.x + dx} ${REST.y + dy})`);
    band.setAttribute('x2', String(REST.x + dx));
    band.setAttribute('y2', String(REST.y + dy));
  });
  const release = (event) => {
    if (!pulling) return;
    const end = toStage(event.clientX, event.clientY);
    const pull = { x: pulling.start.x - end.x, y: pulling.start.y - end.y };
    const samples = pulling.samples;
    pulling = null;
    game.classList.remove('is-pulling');
    ready.setAttribute('transform', `translate(${REST.x} ${REST.y})`);
    band.setAttribute('x2', String(REST.x));
    band.setAttribute('y2', String(REST.y));

    const power = -pull.y; // pulling down is positive power
    if (power < 18) {
      fact.textContent = 'Pull back a little further, then let go.';
      return;
    }
    // Release speed from the last few moves: a snappier release wobbles a bit more.
    let speed = 0;
    if (samples.length > 1) {
      const a = samples[0];
      const b = samples.at(-1);
      speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(b.t - a.t, 1);
    }
    const wobble = 7 + Math.min(speed, 2) * 6;
    const x = CX + pull.x * 1.6 + gaussian() * wobble;
    const y = CY - (power - IDEAL_PULL) * 2.1 + gaussian() * wobble;
    fly(x, y);
  };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', () => {
    pulling = null;
    game.classList.remove('is-pulling');
    ready.setAttribute('transform', `translate(${REST.x} ${REST.y})`);
  });

  // ---------- the Throw button ----------
  throwBtn.addEventListener('click', () => {
    if (flying) return;
    fly(CX + gaussian() * R * 0.28, CY + gaussian() * R * 0.28);
  });

  return game;
}

/** A dart pointing up, tip at (0, 0). */
function dartShape() {
  return `
    <path class="dart__tip" d="M0 0 L-1.6 9 L1.6 9 Z"/>
    <rect class="dart__barrel" x="-3" y="9" width="6" height="16" rx="2"/>
    <rect class="dart__shaft" x="-1.2" y="25" width="2.4" height="14"/>
    <path class="dart__flight" d="M0 30 L-10 46 L-1 42 Z M0 30 L10 46 L1 42 Z"/>`;
}

/** A standard normal sample (Box-Muller), for natural-looking scatter. */
function gaussian() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- the thunk, made with Web Audio so there is no file to load ----------
let audio;
function thunk() {
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    // A short burst of low-passed noise for the hit, and a quick falling sine for the body.
    const noise = audio.createBuffer(1, audio.sampleRate * 0.06, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    const src = audio.createBufferSource();
    src.buffer = noise;
    const lowpass = audio.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 900;
    const hitGain = audio.createGain();
    hitGain.gain.value = 0.5;
    src.connect(lowpass).connect(hitGain).connect(audio.destination);

    const body = audio.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(150, now);
    body.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    const bodyGain = audio.createGain();
    bodyGain.gain.setValueAtTime(0.45, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    body.connect(bodyGain).connect(audio.destination);

    src.start(now);
    body.start(now);
    body.stop(now + 0.18);
  } catch {
    // No audio available: the throw still counts.
  }
}
