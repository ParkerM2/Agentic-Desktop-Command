import type { TestSuiteStep } from '@shared/types/test-suite';

export function cleanSelector(selector: string): string {
  // data-testid
  const testidMatch = /\[data-testid="([^"]+)"\]/.exec(selector);
  if (testidMatch) return testidMatch[1];
  // id
  if (selector.startsWith('#')) return selector.slice(1).replaceAll(/\\./g, '.');
  // last segment of CSS path
  const parts = selector.split(' > ');
  let last = parts.at(-1) ?? selector;
  last = last.replace(/:nth-of-type\(\d+\)/, '');
  return last.trim();
}

export function describeStep(step: TestSuiteStep): string {
  switch (step.type) {
    case 'navigate':
      return `Navigate to ${step.url}`;
    case 'click': {
      const name = step.context?.label ?? step.context?.text ?? cleanSelector(step.selector);
      const tag = step.context?.tagName ?? 'element';
      return `Click "${name}" ${tag}`;
    }
    case 'fill': {
      const name = step.context?.label ?? step.context?.placeholder ?? cleanSelector(step.selector);
      return `Fill "${name}" with "${step.value.slice(0, 40)}"`;
    }
    case 'select': {
      const name = step.context?.label ?? cleanSelector(step.selector);
      return `Select "${step.value}" in "${name}"`;
    }
    case 'press':
      return `Press ${step.key}`;
    case 'wait':
      return `Wait ${step.ms}ms`;
    case 'assert': {
      const sel = cleanSelector(step.selector);
      switch (step.assertMethod ?? 'toHaveText') {
        case 'toBeVisible':
          return `Assert ${sel} is visible`;
        case 'toBeHidden':
          return `Assert ${sel} is hidden`;
        case 'toContainText':
          return `Assert ${sel} contains "${step.expected}"`;
        case 'toHaveCount':
          return `Assert ${sel} count = ${step.expected}`;
        case 'toHaveAttribute':
          return `Assert ${sel} [${step.attribute ?? ''}] = "${step.expected}"`;
        case 'toHaveURL':
          return `Assert URL = "${step.expected}"`;
        case 'toHaveTitle':
          return `Assert title = "${step.expected}"`;
        case 'toHaveText':
        default:
          return `Assert ${sel} = "${step.expected}"`;
      }
    }
  }
}
