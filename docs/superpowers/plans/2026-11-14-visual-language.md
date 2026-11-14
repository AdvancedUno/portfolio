# Plate visual language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 0 placeholder into numbered field guide plates with specimen-label headers, a margin column, figure placeholders, and a contents page on the cover.

**Architecture:** The markup lives in `index.html`. Plate styles go in `css/components/plate.css` and cover styles in `css/components/cover.css`. Two small modules: `js/lib/tilt.js` (seeded tilt) and `js/lib/plates.js` (data lines computed from `data/*.json`). `js/app.js` calls both.

**Tech Stack:** Plain HTML, CSS, and ES modules. No build step, no test framework. Verification is in the browser: screenshots, console, and DOM checks.

**Spec:** `docs/superpowers/specs/2026-11-14-visual-language-design.md`

## Global Constraints

- Tokens only. No new colors or fonts. Rust is for small accents only.
- No ALL CAPS eyebrows, middle-dot meta strings, emoji, rounded gray-shadow cards, or scroll-in fade-ups.
- Margin notes say what a plate holds. They never claim facts about Uno that are not in `data/`.
- Relative paths only. One `h1`. Valid HTML.
- Works at 390, 768, and 1280px, in light and dark. No sideways scroll.

## Review Focus

- A data file fails to load: its label line stays empty and hidden, with no console error.
- Dark mode: labels stay on `--sheet` with `--sheet-ink` text, and contrast still holds.
- 390px: the label, tape, and figure frame do not overflow.
- Keyboard: the contents links show the dashed focus outline.
- Placeholder data (`TODO(uno)` strings, `null` years) never shows up in a data line.

---

### Task 1: Plate markup and styles

**Files:** Modify `index.html`. Create `css/components/plate.css` and `css/components/cover.css`. Modify `css/base.css` to remove the placeholder nav and section heading rules that move into components.

Plates are numbered 01 to 08: Identification, Range and migration, Tracks and signs, Field log, Specimen drawer, Song and call, Behavior, Habitat. The cover becomes the `<header id="cover">` landmark, holding the `h1`, the species label, and the contents `nav`. Each plate is `section.plate` with:
- `.plate__margin`: numeral, note, scale bar
- `.plate__body`: a `.specimen-card` holding the `h2` and an optional `[data-plate-data]` line, then `figure.fig`

- [ ] Write the markup and both CSS files.
- [ ] Check at 1280 and 390px in light and dark. No overflow (`scrollWidth === innerWidth`).
- [ ] Commit: "Lay out sections as numbered field guide plates with a contents page"

### Task 2: Seeded tilt and data lines

**Files:** Create `js/lib/tilt.js` and `js/lib/plates.js`. Modify `js/app.js`.

**Interfaces:**
- `applyTilts(root = document): void` sets `--tilt` on every `[data-tilt]` element from an FNV-1a hash of the attribute value, mapped to the range -2.5deg to 2.5deg.
- `fillPlateData(): Promise<void>` loads the data files and writes text into `[data-plate-data="<id>"]`. Lines:
  - identification: "EunHo Lee, known as Uno" (from `profile.json`)
  - range: "N stops in M countries" (places where `lived` is true and the coordinates are known or `country` is set)
  - tracks: "N specimens" (`kind === "project"`)
  - field-log: "N entries, Y1 to Y2" (numeric years only)
  - song: instrument names joined with "and"
  - behavior: "N sports and games"
  - Never output a string that contains `TODO(uno)`.

- [ ] Write both modules and wire them into `app.js`.
- [ ] Browser check: the lines read as above, tilts stay the same after reload, and a blocked `places.json` leaves an empty, hidden line with no console error.
- [ ] Commit: "Fill specimen labels from data and seed label tilts"

### Task 3: Critique pass

- [ ] Screenshot 1280, 768, and 390px in light and dark. Critique against the spec and fix.
- [ ] Commit the fixes and push.
