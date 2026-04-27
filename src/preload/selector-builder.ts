/**
 * Selector Builder
 *
 * Pure, browser-safe helpers for picking the best CSS selector to represent
 * an element during recording. Priority order:
 *   1. data-testid
 *   2. id
 *   3. name attribute
 *   4. aria-label
 *   5. role (scoped)
 *   6. structural CSS path
 *
 * Returns both the selector string and the `strategy` used so callers can
 * log / rank fallbacks. The main process normalizes events to the contract
 * shape and drops the strategy field before emitting.
 */

export type SelectorStrategy =
  | 'testid'
  | 'id'
  | 'name'
  | 'aria-label'
  | 'role'
  | 'css-path';

export interface BuiltSelector {
  selector: string;
  strategy: SelectorStrategy;
}

function cssEscape(value: string): string {
  const cssObj = globalThis as unknown as { CSS?: { escape?: (s: string) => string } };
  const escapeFn = cssObj.CSS?.escape;
  if (typeof escapeFn === 'function') {
    return escapeFn(value);
  }
  // Minimal fallback — escape characters that break attribute selectors.
  return value.replaceAll(/(["\\])/g, '\\$1');
}

function structuralPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el as Element | null;
  while (node?.nodeType === 1 && node !== document.documentElement) {
    const tag = node.tagName.toLowerCase();
    const parent: Element | null = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const currentTag = node.tagName;
    const siblings = Array.from(parent.children).filter(
      (c) => c.tagName === currentTag,
    );
    if (siblings.length === 1) {
      parts.unshift(tag);
    } else {
      const index = siblings.indexOf(node) + 1;
      parts.unshift(`${tag}:nth-of-type(${index})`);
    }
    node = parent;
  }
  return parts.join(' > ');
}

export function buildSelector(el: Element): BuiltSelector {
  const testid = el.getAttribute('data-testid');
  if (testid) {
    return { selector: `[data-testid="${cssEscape(testid)}"]`, strategy: 'testid' };
  }

  const id = el.getAttribute('id');
  if (id) {
    return { selector: `#${cssEscape(id)}`, strategy: 'id' };
  }

  const name = el.getAttribute('name');
  if (name) {
    return {
      selector: `${el.tagName.toLowerCase()}[name="${cssEscape(name)}"]`,
      strategy: 'name',
    };
  }

  const aria = el.getAttribute('aria-label');
  if (aria) {
    return {
      selector: `${el.tagName.toLowerCase()}[aria-label="${cssEscape(aria)}"]`,
      strategy: 'aria-label',
    };
  }

  const role = el.getAttribute('role');
  if (role) {
    return {
      selector: `${el.tagName.toLowerCase()}[role="${cssEscape(role)}"]`,
      strategy: 'role',
    };
  }

  return { selector: structuralPath(el), strategy: 'css-path' };
}
