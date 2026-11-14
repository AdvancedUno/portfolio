# A Field Guide to Uno — project brief

This file is the source of truth for this project. Read it fully at the start of every session and follow it over your own defaults. If something here conflicts with a request in chat, ask before proceeding.

## What we are building

A personal portfolio website for EunHo "Uno" Lee (GitHub: `advanceduno`), built as the final project for a web development course and hosted on GitHub Pages.

The concept: the site is a **naturalist's field guide entry for one species: Uno**. It looks and behaves like a hand-made naturalist sketchbook (graphite pencil, soft watercolor washes, typewritten specimen labels, paper texture). Every section borrows a real field guide convention:

| Field guide part | Site section |
|---|---|
| Cover | Notebook cover that opens |
| Identification | About me, with labeled "field marks" |
| Range and migration | Interactive map of everywhere I have lived |
| Tracks and signs | Projects, with live GitHub data, and a project family tree |
| Field log | Dated timeline of work, service, and research |
| Specimen drawer | Real objects I own, each with a story |
| Song and call | Violin recording and a winter jazz mixtape |
| Behavior | Sports and games, including a playable dartboard |
| Habitat | Plants and animals near places I have hiked |
| Life list | A checklist visitors fill in as they discover things |
| Back cover | "If found, please return to" with my links |

The project is graded holistically by the instructor on four things. Every decision should serve them:

1. **Originality.** It must feel personal and unlike a template. Never invent personal facts.
2. **Visual design.** It must look polished. The hard last 10% (spacing, transitions, mobile, loading states) is the focus.
3. **Interactivity.** Interactions must be custom and meaningful, not decoration.
4. **API usage.** The site must use external APIs in ways that carry real content.

## Hard rules from the assignment

- English only. No Korean or other non-English text anywhere, including decorative text.
- No login, registration, or email collection. No forms that submit anywhere.
- Embedded widgets (Google Maps, Spotify, YouTube, SoundCloud) do not count toward APIs or interactivity. Do not use them for core features.
- Image galleries and contact forms do not count as interactivity. Anything gallery-like must have real interaction (flip, reveal, story).
- Must have a page title, meta description, Open Graph tags, favicon, and HTML that passes the W3C validator.
- Must work when deployed to GitHub Pages, not only locally.

## Content rules

- **Never invent personal facts, stories, quotes, or opinions about Uno.** Where content is needed and not provided, insert a clearly marked placeholder: `TODO(uno): one-line description of what is needed`. Keep a running list of open TODOs in `TODO-CONTENT.md`.
- All personal content lives in JSON files under `data/`, never hard-coded in HTML or JS. APIs enrich this data; they do not replace it.
- Do not publish: phone number, home address, or faces of friends unless `data/photos.json` marks the photo `"cleared": true`.
- Writing voice for UI copy: plain, warm, a little funny, first person. Sentence case. No marketing language, no exclamation-mark enthusiasm.

## Tech stack

- **Plain HTML, CSS, and JavaScript with ES modules. No build step, no framework.** GitHub Pages serves the repo as-is.
- Use only relative paths (`./js/app.js`, `./data/places.json`) so the site works at `https://advanceduno.github.io/<repo>/`. Never use root-absolute paths like `/js/app.js`.
- Allowed libraries, loaded from jsDelivr with exact pinned versions: `d3` (7.x) and `topojson-client` (3.x) for the map, `world-atlas` (2.x, `countries-110m.json`) for map shapes. Ask before adding anything else.
- Fonts from Google Fonts, each with a real fallback stack.
- Local development: `python3 -m http.server 8000` from the repo root (ES modules do not work from `file://`).

### Folder structure

```
index.html
css/
  tokens.css        design tokens (colors, type scale, spacing)
  base.css          paper, typography, layout
  components/       one file per component (postcard.css, loupe.css, ...)
js/
  app.js            entry point, wires sections together
  api.js            fetch helper with cache, timeout, fallback
  sections/         one module per section
  lib/              small shared helpers
data/
  profile.json  places.json  projects.json  log.json
  objects.json  music.json  books.json  photos.json  lifelist.json
  fallback/         saved API responses used when an API fails
assets/
  photos/  objects/  audio/  scans/  icons/
reference/
  filters.svg       the pencil and watercolor filters to port
README.md
TODO-CONTENT.md
```

## Design system

### Look and feel

A naturalist's sketchbook on good watercolor paper: off-white paper with tooth and faint ruled lines, graphite pencil lines, soft watercolor washes with uneven edges, typewritten specimen labels, small handwritten notes and arrows, pushpins and paper tape. Things sit slightly off-axis. It should feel hand-made and calm, not busy.

### Color tokens

```css
--paper:   #f3f1e9;   /* page */
--sheet:   #f3f1e9;   /* surfaces images sit on */
--ink:     #33362f;   /* text, pencil */
--ink-soft:#5d6157;   /* secondary text */
--sage:    #8fa58a;   /* watercolor wash, tape */
--ochre:   #c39a3f;   /* watercolor wash, highlights */
--slate:   #6a8399;   /* watercolor wash, links, focus */
--rust:    #8f4632;   /* stamps, postmarks, small accents only */
--rule:    rgba(90,110,130,.16); /* ruled lines */
```

Dark mode is "lamp off": dark desk (`--paper: #22231f`), light text (`--ink: #e4e0d3`), and sketches stay on a light sheet (`--sheet: #e6e2d6`) so the filters still read. Toggle with a desk lamp switch; default to `prefers-color-scheme`; remember the choice in localStorage.

### Typography

- Handwriting for headings and notes: `Nanum Pen Script` for now. It will be replaced by Uno's own handwriting font (made with Calligraphr) later, so reference it only through a `--font-hand` variable.
- Body: `Spectral`, 1.0625rem, line-height 1.65, line length under 70 characters.
- Specimen labels and dates: `Courier Prime`, used sparingly.
- Handwriting never for paragraphs longer than two lines.

### Signature visual treatments

- **Sketch filters.** Port the `pencil` and `watercolor` SVG filters and the ragged-edge masks from `reference/filters.svg`. Photos appear as sketches by default. Apply filters only to images in or near the viewport (IntersectionObserver), and test performance on a phone.
- **Paper grain.** A fixed full-page `feTurbulence` overlay at low opacity, pointer-events none.
- **Placed objects.** Each photo, postcard, or label gets a small random tilt via a `--tilt` custom property (between -2.5deg and 2.5deg), seeded so it is stable between reloads.
- **Tape and pins.** Tape is semi-transparent sage with torn edges via `clip-path`. Stamps use `mix-blend-mode: multiply`.

### Things to avoid (these read as AI-generated or templated)

- Identical rounded cards with soft gray shadows, gradient blobs, glassmorphism.
- Inter, Roboto, or system-ui as a visible typeface.
- ALL CAPS eyebrow labels above headings, middle-dot meta strings, arrows appended to button text.
- Emoji as icons. Draw icons as simple SVG pencil strokes instead.
- Fade-and-slide-up animations on every section. Motion should answer user actions, plus one orchestrated moment (the cover opening).
- Lorem ipsum or invented filler.

## Sections and interactions

Build in the phase order in the "Build phases" section. Each section below lists its content source, API, and interaction.

### Cover
Closed notebook (kraft or cloth texture) with stickers and the title "A Field Guide to Uno". Clicking or pressing Enter opens it with a 3D `rotateY` swing (fades for reduced motion). Stickers are shortcuts to sections. Remember that the cover was opened this session (sessionStorage) so returning visitors skip it.

### Global navigation
Colored index tabs along the page edge, one per section, with `aria-current`. On screens under 720px the tabs become a bottom bar. Arrow keys move between sections; `?` opens an index overlay listing every section and keyboard shortcut. Use plain `#section-name` hashes so sections are linkable.

### Identification (about)
A pencil-sketched portrait with hand-drawn pointer lines to "field marks" (from `profile.json`, for example glasses, grin, food in hand). Hover or tap a mark to open a short note. Includes the name origin and a short intro. Includes a "currently" list (reading, listening, building) that pulls from the other data files.

### The loupe (signature, site-wide)
A field magnifier that reveals the real photo under any sketch. Each sketched image is two stacked layers: photo below, filtered sketch above. Moving the pointer over it cuts a circle out of the sketch layer (`clip-path: circle()` following the pointer, about 140px, with a slight 1.15x zoom on the photo and a drawn brass rim). On touch: press and hold. Keyboard: focus the image and press `L` to toggle a centered loupe, arrow keys to move it. First use ticks the life list.

### Range and migration
Pacific-centered world map (d3 `geoNaturalEarth1` rotated so Korea sits on the left and North America on the right), drawn as a pale watercolor wash with pencil coastlines. A dotted pencil route connects the stops in `places.json` in order and draws itself as the visitor scrolls (`stroke-dashoffset`), with a small sketched bird moving along it. A year slider scrubs the route.

Each stop is a pin. Clicking opens a postcard: front is a photo with a postmark (place and years); clicking flips it (CSS 3D) to the back with Uno's handwritten note, country facts from REST Countries (flag, capital, languages, currency), and live weather plus local time from Open-Meteo, for example "Right now in Gwacheon: 4°, 1:12am." A toggle shows "lived" pins versus "want to go" pins (pencil circles).

### Tracks and signs (projects)
Projects from `projects.json` shown as pinned specimens with typewritten labels: name, collected date, habitat (main language), one-line description. Live data from the GitHub API for each repo: last updated (relative, "3 days ago"), language breakdown drawn as colored-pencil strokes, stars if any. Clicking a specimen unfolds a full write-up page: the problem, how it was built, what was hard, what I would do next, links. Filtering by language fades non-matching specimens to faint graphite.

A second view, toggled by a tab on the page: **project family tree**. A hand-drawn branching tree built from the `parents` field in `projects.json`. Hovering a node traces its ancestors in pencil; clicking opens the same write-up.

### Field log
Work, service, research, and awards from `log.json` as dated field notes down the page, newest first. Each entry expands on click to show details. Keep entries short.

### Specimen drawer
A wooden drawer that slides open on click. Inside, photos of real objects from `objects.json` (challenge coins, aikido belt, violin, shuttlecock, pressed leaf) laid out with handwritten labels. Hover lifts an object slightly; click turns it over (flip) to show its story.

### Song and call
Uno's violin recording (`assets/audio/`) as a field recording with a pencil-drawn waveform that fills in as it plays (Web Audio `AnalyserNode` or precomputed peaks). Below it, a cassette with a handwritten J-card tracklist from `music.json`; cover art from the Cover Art Archive using stored MusicBrainz release IDs; hovering a track spins the reels and slides the cover out.

### Behavior (sports and games)
Short notes on badminton, soccer, aikido, darts, and blackjack from `profile.json`. Centerpiece: a **playable dartboard** drawn from Uno's dartboard photo in pencil. Drag back and release; throw angle and speed from pointer events set where the dart lands, with slight randomness. A thunk sound on impact, a chalk scoreboard, and each segment reveals a fact. Bullseye ticks the life list. Keyboard and accessibility fallback: a "Throw" button.

### Habitat
Specimen cards for plants and animals observed near places in `places.json` that have `"hikes": true`, from the iNaturalist API (research-grade observations with photos). Common and Latin names typewritten, photo shown with the watercolor filter, card flips for details. Show 6 per place, with a "next page" control.

### Life list (site-wide glue)
A small field checklist pinned to the page corner, collapsible. Items in `lifelist.json` (opened a postcard, used the loupe, hit a bullseye, played the violin recording, opened the drawer, found the family tree, and so on). Each discovery adds a hand-drawn tick with a small stamp animation. Progress persists in localStorage. Completing the list unlocks the hidden **First specimen** page.

### First specimen (hidden)
A rebuilt version of the click game Uno made in 2021 for older students at the Migrant Workers Welfare Society, with the story in Uno's words (`TODO(uno)` until provided). Targets appear; click them; a score and gentle encouragement. Reachable from the life list and from a hidden sticker on the cover.

### Seasonal plumage and visitor sightings
On load, fetch current St. Louis weather from Open-Meteo. Adjust washes by season and condition: faint snow in winter, rain streaks when raining, warmer ochre in summer (subtle, CSS variables only). Add a handwritten field note at the top: "Visitor sighted Saturday, 3:14pm. Overcast in St. Louis, 6°."

### Back cover
"If found, please return to:" with links to GitHub, LinkedIn, Kaggle, and a plain `mailto:` link. No form.

## APIs

All requests go through `js/api.js`, which must provide:

- `fetchJSON(url, { ttl, timeoutMs = 6000, fallback })`
- Cache responses in sessionStorage keyed by URL with a TTL.
- Abort after the timeout. On any failure, return the fallback from `data/fallback/` if available.
- Never show raw errors to visitors. Each section has a themed fallback state (for example "The weather station is quiet right now. Last reading below.").
- Loading states are themed too (a pencil line drawing itself), never a generic spinner.

| API | Used for | Notes |
|---|---|---|
| GitHub REST (`api.github.com`) | Repo metadata and languages for projects | 60 unauthenticated requests per hour per IP. Cache for at least 1 hour. Never put a token in the code. |
| Open-Meteo (`api.open-meteo.com`) | Weather and local time for map stops, site plumage | No key. Use the `current` parameter and `timezone=auto`. Map weather codes to hand-drawn icons. |
| REST Countries (`restcountries.com`) | Country facts on postcards | No key. Request only needed `fields`. |
| Cover Art Archive (`coverartarchive.org`) | Album covers | No key. Use stored MusicBrainz release IDs; never search at runtime. |
| MusicBrainz (`musicbrainz.org/ws/2`) | Album year, label, track count | About 1 request per second. Fetch sequentially and cache. |
| iNaturalist (`api.inaturalist.org/v1`) | Habitat specimen cards | No key for reads. Keep requests small. |

Before writing code for any API, check its current documentation, because endpoints and parameters may have changed. Save one real response per API into `data/fallback/`.

## Quality bar

### Accessibility
- Every interaction works with keyboard alone and has a visible focus style (dashed slate outline).
- Modals and postcards trap focus, close with Escape, and return focus to the trigger.
- Every image has meaningful alt text from the data files.
- Respect `prefers-reduced-motion`: replace page turns, flips, and route drawing with fades or instant states.
- Text contrast meets WCAG AA on both paper colors.

### Responsive
- Test at 390px, 768px, and 1280px widths. No sideways page scroll at any width.
- Hover-only interactions must have a tap equivalent.

### Performance
- Photos at most 1200px on the long edge, WebP with JPEG fallback, lazy-loaded below the fold.
- Sketch filters only on visible images. The page must stay smooth while scrolling on a mid-range phone.

### Basics
- `<title>`, meta description, Open Graph title, description and image (a photo of the cover), favicon (a small pencil-drawn leaf).
- Valid HTML (W3C validator), semantic landmarks, one `h1`.

## Working agreement

- At the start of each phase, write a short plan and wait for approval before coding.
- Build one section at a time. After each, run the local server, check the browser console for errors, and if possible take screenshots at 390px and 1280px and critique them against this brief before reporting back.
- Commit after every working step with a clear message (for example `Add postcard flip with REST Countries facts`). Never squash or rewrite history; the instructor reviews the commit history.
- When finished with a step, report: what changed, what to test by hand, and any new `TODO(uno)` items.
- Prefer small, readable modules with comments explaining non-obvious parts (filters, map projection, dart physics).
- Do not add features outside this brief without asking.
