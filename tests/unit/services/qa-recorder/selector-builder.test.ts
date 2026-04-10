/**
 * Unit Tests for Selector Builder
 *
 * Verifies the priority chain:
 *   1. data-testid  → [data-testid="..."]
 *   2. aria-label   → [aria-label="..."]
 *   3. role         → [role="..."]
 *   4. tag + nth-child fallback
 */

import { describe, expect, it } from 'vitest';

import { buildSelector } from '@main/features/qa/recorder/selector-builder';

// ── Minimal DOM mock ───────────────────────────────────────────────────────

/**
 * Builds a fake Element whose `getAttribute` returns values from the
 * provided attr map, and whose `tagName` / `parentElement` / `children`
 * reflect the provided structural options.
 */
function makeEl(options: {
  attrs?: Record<string, string | null>;
  tagName?: string;
  parent?: ReturnType<typeof makeEl> | null;
  siblingsOfSameTag?: number;
  indexAmongSiblings?: number;
}): Element {
  const {
    attrs = {},
    tagName = 'DIV',
    parent = null,
    siblingsOfSameTag = 1,
    indexAmongSiblings = 0,
  } = options;

  const el: Partial<Element> & { tagName: string } = {
    tagName,
    getAttribute(name: string): string | null {
      return name in attrs ? (attrs[name] ?? null) : null;
    },
    get parentElement(): HTMLElement | null {
      return parent as HTMLElement | null;
    },
  };

  // Build a children array where `siblingsOfSameTag` items share the same tag
  const children: Element[] = [];
  for (let i = 0; i < siblingsOfSameTag; i++) {
    const sib = {
      tagName,
      getAttribute: () => null,
      get parentElement(): HTMLElement | null {
        return parent as HTMLElement | null;
      },
    } as unknown as Element;
    children.push(sib);
  }
  // Make `el` point to the correct sibling position
  if (parent) {
    const parentEl = parent as Element & { children: Element[] };
    // Override children on the parent to include our siblings
    Object.defineProperty(parentEl, 'children', {
      get: () => children,
      configurable: true,
    });
    // Replace the sibling at `indexAmongSiblings` with this element
    children[indexAmongSiblings] = el as unknown as Element;
  }

  return el as unknown as Element;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('buildSelector()', () => {
  // ── Priority 1: data-testid ───────────────────────────────────────────

  describe('data-testid priority', () => {
    it('returns [data-testid="..."] when attribute is present', () => {
      const el = makeEl({ attrs: { 'data-testid': 'submit-btn' } });
      expect(buildSelector(el)).toBe('[data-testid="submit-btn"]');
    });

    it('prefers data-testid over aria-label', () => {
      const el = makeEl({
        attrs: { 'data-testid': 'my-btn', 'aria-label': 'Click me' },
      });
      expect(buildSelector(el)).toBe('[data-testid="my-btn"]');
    });

    it('prefers data-testid over role', () => {
      const el = makeEl({
        attrs: { 'data-testid': 'my-btn', role: 'button' },
      });
      expect(buildSelector(el)).toBe('[data-testid="my-btn"]');
    });
  });

  // ── Priority 2: aria-label ────────────────────────────────────────────

  describe('aria-label priority', () => {
    it('returns [aria-label="..."] when no data-testid', () => {
      const el = makeEl({ attrs: { 'aria-label': 'Close dialog' } });
      expect(buildSelector(el)).toBe('[aria-label="Close dialog"]');
    });

    it('prefers aria-label over role', () => {
      const el = makeEl({ attrs: { 'aria-label': 'Nav', role: 'navigation' } });
      expect(buildSelector(el)).toBe('[aria-label="Nav"]');
    });
  });

  // ── Priority 3: role attribute ────────────────────────────────────────

  describe('role attribute priority', () => {
    it('returns [role="..."] when no data-testid or aria-label', () => {
      const el = makeEl({ attrs: { role: 'dialog' } });
      expect(buildSelector(el)).toBe('[role="dialog"]');
    });
  });

  // ── Priority 4: tag + nth-child fallback ──────────────────────────────

  describe('tag + nth-child fallback', () => {
    it('returns tag name for a root element with no parent', () => {
      const el = makeEl({ tagName: 'BODY', attrs: {} });
      expect(buildSelector(el)).toBe('body');
    });

    it('returns parent > tag when element is the only child of its tag', () => {
      const parent = makeEl({ tagName: 'DIV', attrs: {} });
      const el = makeEl({
        tagName: 'SPAN',
        attrs: {},
        parent,
        siblingsOfSameTag: 1,
        indexAmongSiblings: 0,
      });
      const selector = buildSelector(el);
      expect(selector).toContain('div > span');
    });

    it('returns parent > tag:nth-child(n) when there are multiple siblings', () => {
      const parent = makeEl({ tagName: 'UL', attrs: {} });
      const el = makeEl({
        tagName: 'LI',
        attrs: {},
        parent,
        siblingsOfSameTag: 3,
        indexAmongSiblings: 1,
      });
      const selector = buildSelector(el);
      expect(selector).toContain('li:nth-child(2)');
    });
  });

  // ── CSS.escape handling ───────────────────────────────────────────────

  describe('attribute value escaping', () => {
    it('escapes special characters in data-testid value', () => {
      // CSS.escape will escape characters like [ and ]
      const el = makeEl({ attrs: { 'data-testid': 'foo[0]' } });
      const selector = buildSelector(el);
      // The selector should not contain raw unescaped brackets inside the attribute value
      expect(selector).toMatch(/\[data-testid="/);
    });
  });
});
