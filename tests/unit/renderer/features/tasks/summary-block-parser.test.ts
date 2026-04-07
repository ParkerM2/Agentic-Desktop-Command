/**
 * Unit Tests for Summary Block Parser
 *
 * Tests extraction of content between <!-- summary --> and <!-- /summary --> markers
 * from markdown strings.
 */

import { describe, expect, it } from 'vitest';

import { extractSummaryBlock } from '../../../../../src/renderer/features/tasks/components/detail/summary-block-parser';

describe('extractSummaryBlock', () => {
  it('extracts content between summary markers', () => {
    const markdown = [
      '# Research Report',
      '',
      '<!-- summary -->',
      'This task requires refactoring the auth module.',
      '<!-- /summary -->',
      '',
      '## Details',
      'Long detailed content here...',
    ].join('\n');

    const result = extractSummaryBlock(markdown);
    expect(result).toBe('This task requires refactoring the auth module.');
  });

  it('returns null when no summary markers exist', () => {
    const markdown = '# Just a heading\n\nSome content without markers.';
    const result = extractSummaryBlock(markdown);
    expect(result).toBeNull();
  });

  it('handles malformed markers (missing closing tag) gracefully', () => {
    const markdown = [
      '<!-- summary -->',
      'Content without a closing tag',
      '## More stuff',
    ].join('\n');

    const result = extractSummaryBlock(markdown);
    expect(result).toBeNull();
  });

  it('extracts multi-line summary content', () => {
    const markdown = [
      '<!-- summary -->',
      '- Point one',
      '- Point two',
      '- Point three',
      '<!-- /summary -->',
      '',
      'Rest of the document.',
    ].join('\n');

    const result = extractSummaryBlock(markdown);
    expect(result).toBe('- Point one\n- Point two\n- Point three');
  });

  it('returns null when summary block is empty', () => {
    const markdown = '<!-- summary -->\n   \n<!-- /summary -->';
    const result = extractSummaryBlock(markdown);
    expect(result).toBeNull();
  });

  it('handles summary markers with surrounding whitespace in content', () => {
    const markdown = '<!-- summary -->\n\n  Trimmed content  \n\n<!-- /summary -->';
    const result = extractSummaryBlock(markdown);
    expect(result).toBe('Trimmed content');
  });

  it('uses only the first summary block if multiple exist', () => {
    const markdown = [
      '<!-- summary -->',
      'First block',
      '<!-- /summary -->',
      '<!-- summary -->',
      'Second block',
      '<!-- /summary -->',
    ].join('\n');

    const result = extractSummaryBlock(markdown);
    expect(result).toBe('First block');
  });

  it('handles missing opening tag but present closing tag', () => {
    const markdown = 'Some content\n<!-- /summary -->\nMore content';
    const result = extractSummaryBlock(markdown);
    expect(result).toBeNull();
  });
});
