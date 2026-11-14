# Data files

All personal content lives here. APIs add to it, but they never replace it.

## Conventions

- **Unknown text** is a string that starts with `TODO(uno):` and says what is needed. Code treats any such string as missing: it shows a placeholder and never shows the raw TODO text to visitors.
- **Unknown lists** are left empty (`[]`), and the items they need are listed in `TODO-CONTENT.md`.
- **Unknown yes/no or number values** are `null`.
- **Dates** are `"YYYY"` or `"YYYY-MM"` so they sort as plain strings. `when` is the label people see.
- **Ids** are lowercase-with-hyphens, and files refer to each other by id (for example `log.json` `place` → `places.json` `id`).

## profile.json

| Field | Type | Notes |
|---|---|---|
| `name`, `nickname` | string | |
| `nameOrigin`, `intro` | string | Identification section |
| `portrait` | photo id | from `photos.json` |
| `fieldMarks` | `{ id, label, note, x, y }[]` | `x`, `y` are percentages across the portrait, where the pointer line ends |
| `currently` | `{ reading, listening, building }` | ids in `books.json`, `music.json` albums, and `projects.json` |
| `education` | `{ school, degree, place, start, end }[]` | |
| `behavior` | `{ id, name, facts[], note }[]` | sports and games |
| `dartboardFacts` | `{ segment, fact }[]` | `segment` is 1–20, `"bull"`, or `"outer-bull"` |
| `firstSpecimen` | `{ year, place, summary, story }` | hidden page |
| `links` | `{ github, linkedin, kaggle, email }` | back cover |

## places.json

`{ id, name, region, country, lat, lon, from, to, when, role, lived, hikes, photo, note, nearby? }[]`, in route order.

- `country` is the ISO 3166-1 alpha-2 code used to ask REST Countries.
- `lived: false` marks a want-to-go place (drawn as a pencil circle).
- `hikes: true` makes a place show up in Habitat.
- `nearby` is an optional `{ name, lat, lon }` side note (Seattle next to Redmond).

## projects.json

Two kinds of node share the file, because the family tree needs both:

- `kind: "project"`: `{ id, name, repo, collected, habitat, stack[], summary, parents[], links[], writeup }`
  - `repo` is the repo name under `advanceduno`, used for the GitHub API.
  - `habitat` is the main language.
  - `links` is `{ label, url }[]`.
  - `writeup` is `{ problem, built, hard, next }`.
- `kind: "ancestor"`: earlier work that led to a project but is not shown as a specimen. `{ id, name, summary, stack[], parents[], links? }`.

`parents` holds ids of other nodes in this file.

## log.json

`{ id, kind, title, org, place, start, end, when, summary, details, links }[]`. `kind` is `work`, `teaching`, `research`, `service`, or `award`. `links` is `{ label, url }[]`. Shown newest first; entries with no start date go last.

## music.json

- `instruments`: `{ id, name, facts[] }[]`
- `recording`: `{ src, title, recorded, note }`
- `mixtape`: `{ taste, title, albums[] }`. Each album is `{ id, artist, title, mbReleaseId, note }`. `mbReleaseId` is a MusicBrainz release id, stored here so the site never searches at runtime.

## books.json

`{ id, title, author, note }[]`

## objects.json

`{ id, name, photo, alt, label, story }[]`. `photo` is a file in `assets/objects/`.

## photos.json

`{ id, src, webp, alt, width, height, cleared, filter, pencilWeight? }[]`

- `src` is the JPEG and `webp` is the WebP in `assets/photos/`, at most 1200px on the long edge.
- `filter` is `"pencil"` or `"watercolor"`.
- `pencilWeight` (optional, default 1) darkens a pencil sketch. Use around 1.5 for bright, sunlit photos.
- `cleared: true` is required before any photo showing a friend's face is published.

## lifelist.json

`{ id, label, section }[]`. `section` is the id of the section where the discovery happens, or `null` for site-wide ones (like the lamp). An item only appears once its section is built, so the list can always be finished.

## fallback/

One saved real response per API, used when the live request fails. These are added as each API is built.
