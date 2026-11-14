// config.js: public settings for external APIs.
//
// REST Countries (v5) requires a key on every request, including from a browser.
// This key is restricted in the REST Countries dashboard to the site's own origins
// (advanceduno.github.io and localhost), so browsers on any other site are refused.
// It only reads public country facts. If it is ever abused, revoke it in the dashboard
// and the postcards fall back to the saved responses in data/fallback/.
export const REST_COUNTRIES_KEY = 'rc_live_e445e7bc7e5e40db90b69969c8f0e69f';
