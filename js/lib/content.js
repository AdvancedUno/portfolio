// content.js: small helpers for putting data-file text on the page.
// Anything Uno has not written yet is a "TODO(uno): ..." string in the data. Visitors never
// see that raw text: they see a faint handwritten placeholder instead.

export const PLACEHOLDER = 'Still to be written.';

export const isTodo = (value) => typeof value === 'string' && value.startsWith('TODO(uno)');

/** True for a real value: not null, not empty, not a TODO. */
export const known = (value) => value !== null && value !== undefined && value !== '' && !isTodo(value);

/** Put text in an element, or the placeholder (styled by .is-placeholder) if it is missing. */
export function fillText(element, value) {
  const real = known(value);
  element.textContent = real ? value : PLACEHOLDER;
  element.classList.toggle('is-placeholder', !real);
  return element;
}

/** Create an element with an optional class and text. */
export function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-08" -> "Aug 2025", "2025" -> "2025", anything else -> null. */
export function formatMonth(date) {
  if (!known(date)) return null;
  const [, year, month] = /^(\d{4})(?:-(\d{2}))?/.exec(date) || [];
  if (!year) return null;
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}
