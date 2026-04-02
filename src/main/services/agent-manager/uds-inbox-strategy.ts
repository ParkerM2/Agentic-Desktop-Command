/**
 * UDS Inbox Strategy — Unix Domain Socket connection strategy (STUB)
 *
 * Future transport for communicating with Claude processes via Unix domain sockets.
 * Expected socket path: /tmp/claude-{sessionId}.sock
 * Protocol: JSON-framed messages over Unix domain socket (UDS).
 *
 * This strategy will be implemented when KAIROS reaches GA.
 * Reference: docs/research/2026-04-01-claude-code-source-leak-analysis.md §3
 *
 * STATUS: STUB — all methods throw. Do not use in production.
 */

import type {
  AgentConnectionStatus,
  AgentConnectionStrategy,
  AgentSpawnConfig,
  AgentSpawnResult,
} from './agent-connection-strategy';

const STUB_ERROR = 'UDS_INBOX: waiting for KAIROS GA';

export class UdsInboxStrategy implements AgentConnectionStrategy {
  spawn(_config: AgentSpawnConfig): AgentSpawnResult {
    throw new Error(STUB_ERROR);
  }

  sendMessage(_pid: number, _message: string): boolean {
    throw new Error(STUB_ERROR);
  }

  terminate(_pid: number): void {
    throw new Error(STUB_ERROR);
  }

  getStatus(_pid: number): AgentConnectionStatus {
    throw new Error(STUB_ERROR);
  }
}
