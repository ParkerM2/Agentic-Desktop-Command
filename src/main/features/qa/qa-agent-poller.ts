/**
 * QA Agent Poller
 *
 * Polls the bus session manager for session completion and parses the resulting report.
 */

import { readFileSync } from 'node:fs';

import type { BusSessionManager } from '@main/bus/session-manager';

import { createFallbackReport, parseQaReport } from './qa-report-parser';

import type { QaReport } from './qa-types';

const POLL_INTERVAL_MS = 2000;
const POLL_INITIAL_DELAY_MS = 3000;

export function waitForAgentCompletion(
  busSessionManager: BusSessionManager,
  agentSessionId: string,
  logFile: string,
): Promise<QaReport> {
  const startTime = Date.now();

  return new Promise<QaReport>((resolve) => {
    const checkCompletion = (): void => {
      const currentAgentSession = busSessionManager.get(agentSessionId);
      const isFinished =
        !currentAgentSession ||
        currentAgentSession.status === 'completed' ||
        currentAgentSession.status === 'error' ||
        currentAgentSession.status === 'killed';

      if (!isFinished) {
        setTimeout(checkCompletion, POLL_INTERVAL_MS);
        return;
      }

      let agentOutput = '';
      try {
        agentOutput = readFileSync(logFile, 'utf-8');
      } catch {
        // Log file may not exist
      }

      const elapsed = Date.now() - startTime;
      const parsed = parseQaReport(agentOutput, elapsed);
      resolve(parsed ?? createFallbackReport(elapsed, 'Could not parse QA agent output'));
    };

    setTimeout(checkCompletion, POLL_INITIAL_DELAY_MS);
  });
}
