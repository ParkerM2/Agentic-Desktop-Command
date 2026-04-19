import type { RecordedStep } from '../test-suite-store';

export interface AssertionSuggestion {
  selector: string;
  expected: string;
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
        description: `Verify page navigated to ${step.url}`,
        accepted: false,
      });
    }

    if (step.type === 'fill' && 'selector' in step) {
      suggestions.push({
        selector: step.selector,
        expected: step.value,
        description: `Verify "${step.selector}" contains "${step.value}"`,
        accepted: false,
      });
    }

    if (step.type === 'click' && 'context' in step && step.context?.text) {
      suggestions.push({
        selector: step.selector,
        expected: step.context.text,
        description: `Verify "${step.context.text}" is visible after click`,
        accepted: false,
      });
    }
  }

  return suggestions;
}
