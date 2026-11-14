// back-cover.js: "If found, please return to:" with Uno's links, from profile.json.
// Plain links only (GitHub, LinkedIn, Kaggle, and a mailto:). No form. Links not yet
// provided show the handwritten placeholder on their fill-in line.

import { loadData } from '../lib/data.js';
import { fillText, known, make } from '../lib/content.js';

/** "https://github.com/advanceduno/" -> "github.com/advanceduno" */
const shortUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export async function initBackCover() {
  const label = document.querySelector('.return-label');
  if (!label) return;

  let profile;
  try {
    profile = await loadData('profile');
  } catch {
    return;
  }

  const name = label.querySelector('.return-label__name');
  fillText(name, known(profile.name) && known(profile.nickname) ? `${profile.name} (${profile.nickname})` : profile.name);

  const links = profile.links ?? {};
  const rows = [
    ['GitHub', links.github, (v) => v, shortUrl],
    ['LinkedIn', links.linkedin, (v) => v, shortUrl],
    ['Kaggle', links.kaggle, (v) => v, shortUrl],
    ['Email', links.email, (v) => `mailto:${v}`, (v) => v],
  ];

  const list = label.querySelector('.return-label__lines');
  list.replaceChildren(...rows.map(([field, value, href, text]) => {
    const li = make('li');
    li.append(make('span', 'return-label__field', field));
    if (known(value)) {
      const a = make('a', 'return-label__value', text(value));
      a.href = href(value);
      if (field !== 'Email') a.rel = 'me';
      li.append(a);
    } else {
      li.append(fillText(make('span', 'return-label__value'), null));
    }
    return li;
  }));
}
