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

// Lets CSS tell "scripts are running" apart from the plain HTML fallback.
document.documentElement.classList.add('js');

applyTilts();
initLamp(document.querySelector('.lamp'));
initNav();
initCover();
fillPlateData();
initIdentification();
initSighting();
initBackCover();
initRange();
