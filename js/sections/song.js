// song.js: Song and call. A field recording of Uno's violin, and a winter jazz mixtape.
//
// The recording: a pencil waveform from precomputed peaks (decoded once with Web Audio when
// the plate comes near), drawn twice: faint underneath, dark on top, with the dark copy
// clipped to how far the recording has played, so the drawing fills in as it plays. The
// waveform is also the seek bar (click, drag, or arrow keys).
//
// The mixtape: a pencil cassette and a handwritten J-card from music.json. Album year,
// label and track count come from MusicBrainz, covers from the Cover Art Archive, both by
// stored MusicBrainz release ids (never a search). MusicBrainz asks for at most about one
// request a second, so albums are looked up one after another. Hovering or focusing a
// track spins the reels and slides that album's cover out from behind the tape.
//
// Until the recording and the album list exist, both parts show themed placeholders, and
// the "played the violin recording" life list item stays hidden.

import { loadData, fromRoot } from '../lib/data.js';
import { fetchJSON, HOUR } from '../api.js';
import { fillText, known, make } from '../lib/content.js';
import { discover } from '../lib/discover.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BARS = 96;

export async function initSong() {
  const slot = document.querySelector('#song .fig');
  if (!slot) return;
  let music;
  try {
    music = await loadData('music');
  } catch {
    return;
  }
  const root = make('div', 'song');
  root.append(buildRecording(music), buildMixtape(music.mixtape ?? {}));
  slot.replaceWith(root);
}

// ---------- the field recording ----------

const clock = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

function buildRecording(music) {
  const rec = music.recording ?? {};
  const violin = (music.instruments ?? []).find((i) => i.id === 'violin');
  const hasAudio = known(rec.src);

  const card = make('article', 'recording');
  card.setAttribute('aria-labelledby', 'recording-title');

  const label = make('div', 'recording__label');
  label.append(make('p', 'recording__kind', 'Field recording no. 1. Violin.'));
  const title = fillText(make('h3', 'recording__title'), rec.title);
  title.id = 'recording-title';
  label.append(title);
  if (known(rec.recorded)) label.append(make('p', 'recording__when', rec.recorded));
  if (violin?.facts?.length) {
    const facts = make('ul', 'recording__facts');
    for (const fact of violin.facts) facts.append(make('li', null, fact));
    label.append(facts);
  }

  const deck = make('div', 'recording__deck');
  const play = make('button', 'recording__play');
  play.type = 'button';
  play.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">
      <path class="recording__ring" d="M20 3.5c9.4-.3 16.6 7.4 16.4 16.6-.2 9.2-7.6 16.3-16.6 16.1C10.6 36 3.6 28.6 3.7 19.6 3.8 10.8 10.6 3.8 19.4 3.6"/>
      <path class="recording__icon-play" d="M16 12.5l12 7.5-12 7.6z"/>
      <path class="recording__icon-pause" d="M15 13v14M25 13v14"/>
    </svg>`;
  play.setAttribute('aria-label', 'Play the violin recording');

  const wave = make('div', 'wave');
  wave.setAttribute('role', 'slider');
  wave.setAttribute('aria-label', 'Position in the recording');
  wave.setAttribute('aria-valuemin', '0');
  wave.setAttribute('aria-valuenow', '0');
  wave.setAttribute('data-own-keys', ''); // arrow keys seek here, not page through sections
  const time = make('span', 'recording__time', '0:00');

  deck.append(play, wave, time);
  card.append(label, deck);
  if (known(rec.note)) card.append(make('p', 'recording__note', rec.note));

  if (!hasAudio) {
    // No recording yet: a resting pencil line, a disabled button, and a note.
    card.classList.add('is-empty');
    card.setAttribute('data-lifelist-pending', 'violin');
    play.disabled = true;
    play.setAttribute('aria-label', 'The violin recording is not here yet');
    wave.setAttribute('aria-disabled', 'true');
    wave.setAttribute('aria-valuemax', '0');
    wave.setAttribute('aria-valuetext', 'No recording yet');
    wave.innerHTML = '<svg class="wave__rest" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M2 31c40-2 80 1 120-1s90 2 140 0 90-1 136 1"/></svg>';
    time.textContent = 'Still in its case.';
    return card;
  }

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.src = fromRoot(`./assets/audio/${rec.src}`);
  wave.tabIndex = 0;
  wave.classList.add('is-loading');
  card.append(audio);

  const setProgress = () => {
    const d = audio.duration || 0;
    const p = d ? audio.currentTime / d : 0;
    wave.style.setProperty('--p', `${(p * 100).toFixed(2)}%`);
    wave.setAttribute('aria-valuemax', String(Math.round(d)));
    wave.setAttribute('aria-valuenow', String(Math.round(audio.currentTime)));
    wave.setAttribute('aria-valuetext', `${clock(audio.currentTime)} of ${clock(d)}`);
    time.textContent = `${clock(audio.currentTime)} / ${clock(d)}`;
  };

  // While playing, follow the playhead every frame so the pencil fills in smoothly.
  let frame = 0;
  const follow = () => {
    setProgress();
    frame = requestAnimationFrame(follow);
  };
  audio.addEventListener('loadedmetadata', setProgress);
  audio.addEventListener('play', () => {
    card.classList.add('is-playing');
    play.setAttribute('aria-label', 'Pause the violin recording');
    discover('violin');
    frame = requestAnimationFrame(follow);
  });
  const stop = () => {
    card.classList.remove('is-playing');
    play.setAttribute('aria-label', 'Play the violin recording');
    cancelAnimationFrame(frame);
    setProgress();
  };
  audio.addEventListener('pause', stop);
  audio.addEventListener('ended', stop);
  play.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));

  // Seeking: click or drag on the waveform, or arrow keys, Home and End.
  const seekTo = (fraction) => {
    if (!audio.duration) return;
    audio.currentTime = Math.min(Math.max(fraction, 0), 1) * audio.duration;
    setProgress();
  };
  const fromPointer = (event) => {
    const box = wave.getBoundingClientRect();
    seekTo((event.clientX - box.left) / box.width);
  };
  wave.addEventListener('pointerdown', (event) => {
    wave.setPointerCapture(event.pointerId);
    fromPointer(event);
    const move = (e) => fromPointer(e);
    wave.addEventListener('pointermove', move);
    wave.addEventListener('pointerup', () => wave.removeEventListener('pointermove', move), { once: true });
  });
  wave.addEventListener('keydown', (event) => {
    const d = audio.duration;
    if (!d) return;
    const steps = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 };
    if (event.key in steps) seekTo((audio.currentTime + steps[event.key]) / d);
    else if (event.key === 'Home') seekTo(0);
    else if (event.key === 'End') seekTo(1);
    else if (event.key === ' ' || event.key === 'Enter') play.click();
    else return;
    event.preventDefault();
  });

  // Draw the waveform once the plate is close: decoding a whole file is not free.
  whenNear(card, async () => {
    try {
      const peaks = await computePeaks(audio.src, BARS);
      wave.innerHTML = waveMarkup(peaks);
    } catch {
      wave.innerHTML = waveMarkup(new Array(BARS).fill(0.08));
    }
    wave.classList.remove('is-loading');
  });
  return card;
}

/** Decode the recording and keep the loudest sample in each of `count` slices, scaled 0..1. */
async function computePeaks(url, count) {
  const buffer = await (await fetch(url)).arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(buffer);
    const data = audio.getChannelData(0);
    const size = Math.floor(data.length / count);
    const peaks = [];
    for (let i = 0; i < count; i++) {
      let max = 0;
      for (let j = i * size; j < (i + 1) * size; j += 16) max = Math.max(max, Math.abs(data[j]));
      peaks.push(max);
    }
    const top = Math.max(...peaks) || 1;
    return peaks.map((p) => p / top);
  } finally {
    ctx.close();
  }
}

/** Peaks as pencil strokes: each bar leans a little, as if drawn by hand. Drawn twice. */
function waveMarkup(peaks) {
  const w = 400;
  const h = 60;
  const step = w / peaks.length;
  const d = peaks.map((p, i) => {
    const x = step * (i + 0.5);
    const half = Math.max(1.2, p * (h / 2 - 3));
    const lean = ((i * 37) % 7 - 3) * 0.25;
    return `M${(x - lean).toFixed(1)} ${(h / 2 - half).toFixed(1)}L${(x + lean).toFixed(1)} ${(h / 2 + half).toFixed(1)}`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path class="wave__faint" d="${d}"/>
      <path class="wave__ink" d="${d}"/>
    </svg>`;
}

// ---------- the mixtape ----------

function buildMixtape(mixtape) {
  const albums = (mixtape.albums ?? []).filter((a) => known(a.artist) && known(a.title));
  const box = make('div', 'mixtape');

  const deck = make('div', 'tape-deck');
  // The cover slides out from behind the tape; the readout under the tape names it.
  const cover = make('div', 'tape-deck__cover');
  const coverArt = make('div', 'tape-deck__art');
  cover.append(coverArt);
  const coverCaption = make('p', 'tape-deck__readout');
  coverCaption.setAttribute('aria-live', 'polite');
  const cassette = document.createElementNS(SVG_NS, 'svg');
  cassette.setAttribute('class', 'cassette');
  cassette.setAttribute('viewBox', '0 0 320 204');
  cassette.setAttribute('aria-hidden', 'true');
  cassette.innerHTML = cassetteMarkup();
  cassette.querySelector('.cassette__title').textContent = known(mixtape.title) ? mixtape.title : (mixtape.taste ?? 'Mixtape');
  deck.append(cover, cassette, coverCaption);

  // The J-card: the folded paper insert with the tracklist.
  const card = make('div', 'jcard');
  const spine = make('p', 'jcard__spine', known(mixtape.taste) ? mixtape.taste : 'Mixtape');
  const heading = fillText(make('h3', 'jcard__title'), mixtape.title);
  const side = make('p', 'jcard__side', 'Side A');
  const list = make('ol', 'jcard__tracks');
  card.append(spine, heading, side, list);

  // Hover spins the reels even with no albums yet: it is a tape, after all.
  deck.addEventListener('pointerenter', () => cassette.classList.add('is-spinning'));
  deck.addEventListener('pointerleave', () => { if (!box.querySelector('.is-active')) cassette.classList.remove('is-spinning'); });

  if (!albums.length) {
    card.classList.add('is-empty');
    for (let i = 0; i < 5; i++) list.append(make('li', 'jcard__blank'));
    box.classList.add('is-empty');
    box.append(deck, card);
    return box;
  }

  const details = new Map(); // album id -> { year, label, tracks, cover }
  let active = null;
  let pinned = null;

  const show = (album) => {
    active = album;
    for (const b of list.querySelectorAll('.jcard__track')) b.classList.toggle('is-active', b.dataset.id === album?.id);
    cassette.classList.toggle('is-spinning', Boolean(album));
    deck.classList.toggle('is-out', Boolean(album));
    if (!album) {
      coverCaption.textContent = matchMedia('(hover: hover)').matches ? 'Hover a track to pull out its cover.' : 'Tap a track to pull out its cover.';
      return;
    }
    const info = details.get(album.id);
    coverArt.replaceChildren();
    if (info?.cover) {
      const img = document.createElement('img');
      img.src = info.cover;
      img.alt = `Cover of ${album.title} by ${album.artist}`;
      img.width = 250;
      img.height = 250;
      coverArt.append(img);
    } else {
      coverArt.append(make('span', 'tape-deck__no-art', info ? 'No cover on file.' : 'Finding the cover.'));
    }
    const facts = info ? [info.year, info.label, info.tracks ? `${info.tracks} tracks` : null].filter(Boolean).join(', ') : '';
    coverCaption.textContent = `${album.artist}, ${album.title}${facts ? `. ${facts}.` : '.'}`;
  };

  for (const album of albums) {
    const li = make('li');
    const button = make('button', 'jcard__track');
    button.type = 'button';
    button.dataset.id = album.id;
    button.append(make('span', 'jcard__artist', album.artist), make('span', 'jcard__album', album.title));
    if (known(album.note)) button.append(make('span', 'jcard__album-note', album.note));
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('pointerenter', () => show(album));
    button.addEventListener('focus', () => show(album));
    button.addEventListener('pointerleave', () => show(pinned));
    button.addEventListener('blur', () => show(pinned));
    // Click (or tap) pins an album out, so it works without hover.
    button.addEventListener('click', () => {
      pinned = pinned === album ? null : album;
      for (const b of list.querySelectorAll('.jcard__track')) b.setAttribute('aria-pressed', String(b.dataset.id === pinned?.id));
      show(pinned ?? album);
    });
    li.append(button);
    list.append(li);
  }
  box.append(deck, card);
  show(null);

  whenNear(box, () => lookUpAlbums(albums, details, () => active && show(active)));
  return box;
}

/** MusicBrainz then Cover Art Archive for each album, one album at a time. */
async function lookUpAlbums(albums, details, onUpdate) {
  for (const album of albums) {
    if (!known(album.mbReleaseId)) continue;
    const id = album.mbReleaseId;
    const mbUrl = `https://musicbrainz.org/ws/2/release/${id}?fmt=json&inc=labels+release-groups+media`;
    const mbOptions = { ttl: 24 * HOUR, fallback: `./data/fallback/musicbrainz-${id}.json` };
    let [mb, caa] = await Promise.all([
      fetchJSON(mbUrl, mbOptions),
      fetchJSON(`https://coverartarchive.org/release/${id}`, {
        ttl: 24 * HOUR, timeoutMs: 8000, fallback: `./data/fallback/caa-${id}.json`,
      }),
    ]);
    // MusicBrainz answers 503 when asked too fast; wait a moment and try once more.
    if (mb.source === 'none') {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      mb = await fetchJSON(mbUrl, mbOptions);
    }
    details.set(album.id, readAlbum(mb.data, caa.data));
    onUpdate();
    // Be a polite MusicBrainz client: about one request a second, unless it came from cache.
    if (mb.source === 'live') await new Promise((resolve) => setTimeout(resolve, 1100));
  }
}

function readAlbum(mb, caa) {
  const year = (mb?.['release-group']?.['first-release-date'] || mb?.date || '').slice(0, 4) || null;
  const label = mb?.['label-info']?.find((l) => l.label?.name)?.label.name ?? null;
  const tracks = (mb?.media ?? []).reduce((n, m) => n + (m['track-count'] ?? 0), 0) || null;
  const front = caa?.images?.find((image) => image.front) ?? caa?.images?.[0];
  const thumb = front?.thumbnails?.['250'] ?? front?.thumbnails?.small ?? null;
  return { year, label, tracks, cover: thumb ? thumb.replace(/^http:/, 'https:') : null };
}

/** A cassette in pencil: shell, label, window, two reels, and the head opening. */
function cassetteMarkup() {
  const reel = (cx) => `
    <g class="reel" style="transform-origin:${cx}px 92px">
      <circle cx="${cx}" cy="92" r="25" class="reel__tape"/>
      <circle cx="${cx}" cy="92" r="11" class="reel__hub"/>
      ${[0, 60, 120, 180, 240, 300].map((a) => {
        const t = (a * Math.PI) / 180;
        return `<path d="M${(cx + 5 * Math.cos(t)).toFixed(1)} ${(92 + 5 * Math.sin(t)).toFixed(1)}L${(cx + 10.5 * Math.cos(t)).toFixed(1)} ${(92 + 10.5 * Math.sin(t)).toFixed(1)}"/>`;
      }).join('')}
    </g>`;
  return `
    <path class="cassette__shell" d="M12 6h296c4 0 7 3 7 7v178c0 4-3 7-7 7H12c-4 0-7-3-7-7V13c0-4 3-7 7-7z"/>
    <path class="cassette__label" d="M24 18h272v118H24z"/>
    <path class="cassette__stripe" d="M24 50h272"/>
    <text class="cassette__title" x="36" y="41"></text>
    <path class="cassette__window" d="M76 62h168c7 0 12 5 12 12v36c0 7-5 12-12 12H76c-7 0-12-5-12-12V74c0-7 5-12 12-12z"/>
    <path class="cassette__tape-line" d="M104 117h112"/>
    ${reel(104)}${reel(216)}
    <path class="cassette__mouth" d="M70 198l12-42h156l12 42"/>
    <circle cx="104" cy="178" r="5"/><circle cx="216" cy="178" r="5"/>
    <path d="M140 172h8v12h-8zM172 172h8v12h-8z"/>
    <circle cx="18" cy="18" r="3"/><circle cx="302" cy="18" r="3"/><circle cx="18" cy="186" r="3"/><circle cx="302" cy="186" r="3"/>`;
}

/** Run fn once, the first time el comes within 400px of the viewport. */
function whenNear(el, fn) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      fn();
    }
  }, { rootMargin: '400px 0px' });
  observer.observe(el);
}
