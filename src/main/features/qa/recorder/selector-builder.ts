/**
 * Selector Builder
 *
 * Builds a CSS selector for a DOM element using a priority chain:
 *   1. data-testid attribute
 *   2. aria-label attribute
 *   3. ARIA role
 *   4. tag + nth-child fallback
 */

/** Escapes a string for safe use inside a CSS attribute selector value. */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined') {
    return CSS.escape(value);
  }
  // Polyfill for non-browser environments (e.g. Vitest Node.js).
  // Escapes characters that are special inside CSS attribute selector strings.
  // Spaces are valid inside quoted strings, so only escape true CSS specials.
  return value.replaceAll(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

/**
 * Returns the best CSS selector for `el`, preferring stable semantic
 * attributes over positional ones.
 */
export function buildSelector(el: Element): string {
  // 1. data-testid
  const testId = el.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${cssEscape(testId)}"]`;
  }

  // 2. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    return `[aria-label="${cssEscape(ariaLabel)}"]`;
  }

  // 3. ARIA role attribute
  const role = el.getAttribute('role');
  if (role) {
    return `[role="${cssEscape(role)}"]`;
  }

  // 4. tag + nth-child fallback
  return nthChildSelector(el);
}

function nthChildSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;

  if (!parent) {
    return tag;
  }

  const siblings = Array.from(parent.children).filter(
    (c) => c.tagName === el.tagName,
  );

  if (siblings.length === 1) {
    return `${nthChildSelector(parent)} > ${tag}`;
  }

  const index = siblings.indexOf(el) + 1;
  return `${nthChildSelector(parent)} > ${tag}:nth-child(${index})`;
}
