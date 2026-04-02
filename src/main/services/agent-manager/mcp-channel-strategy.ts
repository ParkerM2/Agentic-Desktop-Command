/**
 * MCP Channel Strategy — --channels flag connection strategy (STUB)
 *
 * Future transport using Claude Code's --channels flag for Team Lead input,
 * replacing tmux send-keys injection with a structured channel-based protocol.
 *
 * The --channels flag enables bidirectional communication via named pipes or
 * IPC channels, providing a more reliable transport than tmux pane injection.
 *
 * STATUS: Research preview only — not production ready.
 */

import type {
  AgentConnectionStatus,
  AgentConnectionStrategy,
  AgentSpawnConfig,
  AgentSpawnResult,
} from './agent-connection-strategy';

const STUB_ERROR = 'MCP_CHANNELS: research preview, not production ready';

export class McpChannelStrategy implements AgentConnectionStrategy {
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
