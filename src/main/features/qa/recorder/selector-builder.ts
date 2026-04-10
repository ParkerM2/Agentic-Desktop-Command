/**
 * Selector Builder
 *
 * Builds a CSS selector for a DOM element using a priority chain:
 *   1. data-testid attribute
 *   2. aria-label attribute
 *   3. ARIA role
 *   4. tag + nth-child fallback
 */

/**
 * Returns the best CSS selector for `el`, preferring stable semantic
 * attributes over positional ones.
 */
export function buildSelector(el: Element): string {
  // 1. data-testid
  const testId = el.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${CSS.escape(testId)}"]`;
  }

  // 2. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    return `[aria-label="${CSS.escape(ariaLabel)}"]`;
  }

  // 3. ARIA role attribute
  const role = el.getAttribute('role');
  if (role) {
    return `[role="${CSS.escape(role)}"]`;
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
