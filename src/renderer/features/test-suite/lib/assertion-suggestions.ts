import type { AssertMethod } from '@shared/types/test-suite';

import type { RecordedStep } from '../test-suite-store';

export interface AssertionSuggestion {
  selector: string;
  expected: string;
  assertMethod: AssertMethod;
  attribute?: string;
  description: string;
  accepted: boolean;
}

export function generateAssertionSuggestions(steps: RecordedStep[]): AssertionSuggestion[] {
  const suggestions: AssertionSuggestion[] = [];

  for (const { step } of steps) {
    if (step.type === 'navigate') {
      suggestions.push({
        selector: '',
        expected: step.url,
        assertMethod: 'toHaveURL',
        description: `Verify page navigated to ${step.url}`,
        accepted: false,
      });
    }

    if (step.type === 'fill' && 'selector' in step) {
      suggestions.push({
        selector: step.selector,
        expected: step.value,
        assertMethod: 'toHaveText',
        description: `Verify "${step.selector}" has value "${step.value}"`,
        accepted: false,
      });
    }

    if (step.type === 'click' && 'context' in step && step.context?.text) {
      suggestions.push({
        selector: step.selector,
        expected: step.context.text,
        assertMethod: 'toBeVisible',
        description: `Verify "${step.context.text}" is visible after click`,
        accepted: false,
      });
    }
  }

  // After form submission (click following fills), suggest checking for new content
  const hasClicks = steps.some((s) => s.step.type === 'click');
  const hasFills = steps.some((s) => s.step.type === 'fill');
  if (hasClicks && hasFills) {
    suggestions.push({
      selector: 'table tbody tr',
      expected: '1',
      assertMethod: 'toHaveCount',
      description: 'Verify table row count after form submission',
      accepted: false,
    });
  }

  return suggestions;
}
