/**
 * E2E console error collector.
 *
 * Attaches to a Playwright page's console events and collects errors/warnings.
 * Provides assertion helpers that filter out known acceptable messages.
 */

import type { Page } from 'playwright';

/** Collected console messages categorized by severity. */
export interface ConsoleCollector {
  errors: string[];
  warnings: string[];
}

/**
 * Known acceptable error patterns that should be ignored during assertion.
 *
 * These are expected in the Electron E2E environment and do not indicate bugs:
 * - DevTools messages from Electron/Chromium internals
 * - Favicon 404s (Electron apps typically don't serve favicons)
 * - ERR_CONNECTION_REFUSED when Hub server is not running (expected in offline tests)
 * - React DevTools download suggestion
 */
const DEFAULT_IGNORE_PATTERNS: RegExp[] = [
  /DevTools/i,
  /favicon/i,
  /ERR_CONNECTION_REFUSED/i,
  /Download the React DevTools/i,
];

/**
 * Create a console collector that listens to page console events.
 *
 * Attaches a `page.on('console')` listener that categorizes messages
 * into errors and warnings arrays.
 *
 * @returns A ConsoleCollector with live-updating arrays.
 */
export function createConsoleCollector(page: Page): ConsoleCollector {
  const collector: ConsoleCollector = {
    errors: [],
    warnings: [],
  };

  page.on('console', (message) => {
    const type = message.type();
    const text = message.text();

    if (type === 'error') {
      collector.errors.push(text);
    } else if (type === 'warning') {
      collector.warnings.push(text);
    }
  });

  return collector;
}

interface AssertNoConsoleErrorsOptions {
  /** Additional patterns to ignore beyond the defaults. */
  ignorePatterns?: RegExp[];
}

/**
 * Assert that no unexpected console errors were collected.
 *
 * Filters out known acceptable errors (DevTools, favicon, connection refused,
 * React DevTools prompt) and any additional patterns provided via options.
 *
 * @throws If any unfiltered console errors remain.
 */
export function assertNoConsoleErrors(
  collector: ConsoleCollector,
  options?: AssertNoConsoleErrorsOptions,
): void {
  const allIgnorePatterns = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...(options?.ignorePatterns ?? []),
  ];

  const unexpectedErrors = collector.errors.filter(
    (error) => !allIgnorePatterns.some((pattern) => pattern.test(error)),
  );

  if (unexpectedErrors.length > 0) {
    throw new Error(
      `Unexpected console errors (${String(unexpectedErrors.length)}):\n` +
        unexpectedErrors.map((e) => `  - ${e}`).join('\n'),
    );
  }
}
