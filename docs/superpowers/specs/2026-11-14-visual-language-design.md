# Visual language for the plates (Phase 0 polish)

## Intent

The Phase 0 placeholder is tidy but generic: a flat list of links, then nine identical "heading + Still being sketched." blocks on ruled paper. Uno wants it to look better and more like itself before Phase 1. This pass sets the page system that every later section sits in, so Phase 1+ builds on a strong base. It stays inside Phase 0: no cover animation, no index tabs, no filters, no loupe.

## Goals

- Every section reads as a numbered field guide plate, not a generic web section.
- The page has a clear, asymmetric grid with a margin column, and a consistent vertical rhythm tied to the ruled lines.
- Empty sections look intentionally unfinished (like a figure still to be drawn), not broken.
- Works at 390, 768, and 1280px, in both themes. AA contrast, visible focus, no sideways scroll.

## Non-goals

- Phase 1 work: the notebook cover object and its swing, edge index tabs and bottom bar, arrow keys, the `?` overlay, sketch filters, the loupe, the lamp toggle.
- New colors or fonts. Everything comes from the existing tokens.

## Anti-goals

- Anything on CLAUDE.md's avoid list: identical rounded cards with gray shadows, ALL CAPS eyebrows, middle-dot meta strings, scroll-in fade-ups, emoji.
- Invented personal facts. Margin notes describe what a section is for, in UI voice, and never claim anything about Uno that is not in the data.

## Approaches

1. **Set the visual language within Phase 0** (chosen). Plates, labels, margin column, rhythm. The phase order stays intact.
2. Option 1 plus the still parts of Phase 1 (notebook cover, index tabs). Rejected by Uno: it blurs phase boundaries.
3. Rework the art direction beyond the brief. Ruled out: CLAUDE.md fixes the palette, fonts, and avoid list.

## Design

**Grid.** From 1024px up, each plate has three columns: a margin column (about 15rem), the content column (up to the 66ch measure), and an empty right gutter kept free for the Phase 1 index tabs. A thin rust margin rule runs down the page between margin and content, like a notebook. Below 1024px the margin column stacks on top of the content.

**Plate header.** Each section (Identification through Habitat) gets:
- A large, faint handwritten plate numeral in the margin column ("03").
- A museum specimen label: a small typewritten card on the sheet color, held by tape, with a seeded tilt. Its fields are `No. 03`, the section name, and one data line computed from `data/*.json` where data exists. Examples: Range "9 stops in 3 countries", Tracks "8 specimens", Field log "12 entries, 2019 to 2026". Sections with no data yet show no data line.
- The handwritten `h2` beside it, with the existing pencil underline.
- A short handwritten margin note on what the plate holds, for example "Everywhere I've lived, in order."
- A small pencil scale-bar ornament with "not to scale" in typewriter type.

**Figure placeholder.** "Still being sketched." becomes an empty figure frame: a faint pencil-hatched box with a typewritten caption, "Fig. 3. Still being sketched." It reserves roughly the height the real content will need, so Phase 1+ causes no big layout jumps.

**Contents on the cover.** The flat link list at the top becomes a field guide contents page under the title: section names with dotted leaders running to plate numbers. It stays the `nav` landmark until the Phase 1 tabs arrive. Cover composition: left-aligned title, the species label tilted beside it, contents below.

**Rhythm.** Section padding, label heights, and gaps are multiples of `--rule-gap`, so headings and notes sit on the ruled lines. Plates are separated by a double pencil rule.

**Tilt.** A tiny `js/lib/tilt.js` hashes each element's id into `--tilt` between -2.5deg and 2.5deg, so tilts are stable between reloads. Without JS, tilt is 0.

**Data line.** `js/lib/plates.js` loads the local data files and fills in each label's data line. If a file fails to load, the line stays empty. These are local files, not APIs, so they do not go through `api.js`.

## Left to the builder

Exact sizes, hatch density, tape and label proportions, and the margin note wording (plain, warm, first person, no claims beyond the data). Check every margin note against CLAUDE.md's content rules.
