// app.js: entry point. Each section lives in its own module under ./sections/
// and gets wired up here as it is built, phase by phase.

import { applyTilts } from './lib/tilt.js';
import { fillPlateData } from './lib/plates.js';
import { initLamp } from './lib/lamp.js';
import { initNav } from './sections/nav.js';
import { initCover } from './sections/cover.js';
import { initIdentification } from './sections/identification.js';
import { initSighting } from './sections/sighting.js';
import { initBackCover } from './sections/back-cover.js';
import { initRange } from './sections/range.js';
import { initTracks } from './sections/tracks.js';
import { initFieldLog } from './sections/field-log.js';
import { initFirstSpecimen } from './sections/first-specimen.js';
import { initLifeList } from './sections/life-list.js';
import { initBehavior } from './sections/behavior.js';
import { initDrawer } from './sections/drawer.js';
import { initSong } from './sections/song.js';
import { initHabitat } from './sections/habitat.js';

// Lets CSS tell "scripts are running" apart from the plain HTML fallback.
document.documentElement.classList.add('js');

applyTilts();
initLamp(document.querySelector('.lamp'));
initNav();
initFirstSpecimen();
initCover();
fillPlateData();
initSighting();
initBackCover();

// The life list shows only items whose sections are built, so it starts once they are.
Promise.allSettled([initIdentification(), initRange(), initTracks(), initFieldLog(), initDrawer(), initSong(), initBehavior(), initHabitat()]).then(initLifeList);
