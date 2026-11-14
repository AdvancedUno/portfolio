// app.js: entry point. Each section lives in its own module under ./sections/
// and gets wired up here as it is built, phase by phase.

import { applyTilts } from './lib/tilt.js';
import { fillPlateData } from './lib/plates.js';

// Lets CSS tell "scripts are running" apart from the plain HTML fallback.
document.documentElement.classList.add('js');

applyTilts();
fillPlateData();
