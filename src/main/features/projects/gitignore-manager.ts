/**
 * Ensures specified entries exist in a project's .gitignore file.
 * Creates the file if it doesn't exist.
 * Appends missing entries under a "# ADC artifacts" section header.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { serviceLogger } from '@main/lib/logger';

const ADC_HEADER = '# ADC artifacts';

/**
 * Ensures that each entry in `entries` is present in the project's .gitignore.
 * Creates the file if it doesn't exist. Appends missing entries under
 * an "# ADC artifacts" header. Never crashes — errors are logged and swallowed.
 */
export function ensureGitignoreEntries(projectPath: string, entries: string[]): void {
  try {
    const gitignorePath = join(projectPath, '.gitignore');

    // Read existing content (or empty string if file doesn't exist)
    let content = '';
    if (existsSync(gitignorePath)) {
      content = readFileSync(gitignorePath, 'utf-8');
    }

    // Split into lines and trim each for comparison
    const existingLines = content.split('\n').map((line) => line.trim());

    // Find entries that are missing
    const missing = entries.filter((entry) => !existingLines.includes(entry.trim()));

    if (missing.length === 0) {
      return;
    }

    // Build the block to append
    let appendBlock = '';

    // Ensure a trailing newline before our block
    if (content.length > 0 && !content.endsWith('\n')) {
      appendBlock += '\n';
    }

    // Add the ADC artifacts header if it doesn't already exist
    appendBlock += existingLines.includes(ADC_HEADER)
      ? '\n'
      : `\n${ADC_HEADER}\n`;

    // Append each missing entry
    for (const entry of missing) {
      appendBlock += `${entry}\n`;
    }

    writeFileSync(gitignorePath, content + appendBlock, 'utf-8');
    serviceLogger.info(`[GitignoreManager] Added ${String(missing.length)} entries to .gitignore`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serviceLogger.error(`[GitignoreManager] Failed to update .gitignore: ${message}`);
  }
}
