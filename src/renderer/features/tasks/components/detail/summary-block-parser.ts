/**
 * Summary Block Parser
 *
 * Extracts content between <!-- summary --> and <!-- /summary --> markers
 * in markdown strings. Used to show a curated preview of research/plan
 * content in the task detail row.
 */

const SUMMARY_OPEN = '<!-- summary -->';
const SUMMARY_CLOSE = '<!-- /summary -->';

export function extractSummaryBlock(markdown: string): string | null {
  const openIdx = markdown.indexOf(SUMMARY_OPEN);
  if (openIdx === -1) return null;

  const closeIdx = markdown.indexOf(SUMMARY_CLOSE, openIdx);
  if (closeIdx === -1) return null;

  const content = markdown.slice(openIdx + SUMMARY_OPEN.length, closeIdx).trim();
  return content.length > 0 ? content : null;
}
