# A Field Guide to Uno

A personal portfolio for EunHo "Uno" Lee, made as the final project for a web development course.

**Live site:** https://advanceduno.github.io/portfolio/

## The concept

The site is a naturalist's field guide entry for one species: me. It looks and behaves like a hand-made sketchbook, with graphite pencil, watercolor washes, typewritten specimen labels, and paper texture. Each section borrows a real field guide convention:

| Field guide part | What it holds |
|---|---|
| Cover | A notebook cover that swings open |
| Identification | About me, with labeled field marks |
| Range and migration | An interactive map of everywhere I have lived |
| Tracks and signs | Projects with live GitHub data, and a project family tree |
| Field log | Work, service, and research, as dated field notes |
| Specimen drawer | Real objects I own, each with a story |
| Song and call | A violin recording and a winter jazz mixtape |
| Behavior | Sports and games, including a playable dartboard |
| Habitat | Plants and animals seen near places I have hiked |
| Life list | A checklist visitors fill in as they find things |
| Back cover | "If found, please return to" |

## Running it locally

This is plain HTML, CSS, and JavaScript with ES modules, with no build step. Modules do not load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

On Windows, use `python` instead of `python3`:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## APIs

Every request goes through `js/api.js`, which caches responses for the session, gives up after a timeout, and falls back to a saved response in `data/fallback/`, so a failing API never breaks a section.

| API | Used for |
|---|---|
| [GitHub REST](https://docs.github.com/en/rest) | Repo activity, languages, and stars for each project |
| [Open-Meteo](https://open-meteo.com/en/docs) | Live weather and local time on map postcards, and the site's seasonal look |
| [REST Countries](https://restcountries.com/) | Country facts on postcards |
| [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) | Album year, label, and track count for the mixtape |
| [Cover Art Archive](https://coverartarchive.org/) | Album covers for the mixtape |
| [iNaturalist](https://api.inaturalist.org/v1/docs/) | Plants and animals for Habitat |

## Where things live

- `data/`: all personal content as JSON. See [`data/SCHEMA.md`](data/SCHEMA.md).
- `css/tokens.css`: colors, type, spacing, and the dark "lamp off" theme.
- `js/sections/`: one module per section.
- `reference/filters.svg`: the original pencil and watercolor filter study.
- `TODO-CONTENT.md`: content I still need to write.

## Process

TODO(uno): how the site came together, written over the course of the project.
