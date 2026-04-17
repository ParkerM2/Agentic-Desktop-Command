import type { TestSuiteStep } from '@shared/types/test-suite';

export function cleanSelector(selector: string): string {
  // data-testid
  const testidMatch = selector.match(/\[data-testid="([^"]+)"\]/);
  if (testidMatch) return testidMatch[1];
  // id
  if (selector.startsWith('#')) return selector.slice(1).replace(/\\./g, '.');
  // last segment of CSS path
  const parts = selector.split(' > ');
  let last = parts[parts.length - 1] || selector;
  last = last.replace(/:nth-of-type\(\d+\)/, '');
  return last.trim();
}

export function describeStep(step: TestSuiteStep): string {
  switch (step.type) {
    case 'navigate':
      return `Navigate to ${step.url}`;
    case 'click': {
      const name = step.context?.label || step.context?.text || cleanSelector(step.selector);
      const tag = step.context?.tagName || 'element';
      return `Click "${name}" ${tag}`;
    }
    case 'fill': {
      const name = step.context?.label || step.context?.placeholder || cleanSelector(step.selector);
      return `Fill "${name}" with "${step.value.slice(0, 40)}"`;
    }
    case 'select': {
      const name = step.context?.label || cleanSelector(step.selector);
      return `Select "${step.value}" in "${name}"`;
    }
    case 'press':
      return `Press ${step.key}`;
    case 'wait':
      return `Wait ${step.ms}ms`;
    case 'assert':
      return `Assert "${step.selector}" equals "${step.expected}"`;
  }
}
