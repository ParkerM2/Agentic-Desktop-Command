/**
 * Agent Host — Electron Utility Process Entry Point
 *
 * Runs inside `utilityProcess.fork()`. Bootstraps AgentManagerService
 * and handles control requests from the main process via MessagePort.
 *
 * This process has:
 * - Full Node.js API (child_process, fs, crypto, etc.)
 * - NO Electron renderer or main-process API (no BrowserWindow, no ipcMain)
 * - Communication via `process.parentPort` (MessagePort-based)
 */

import { createAgentManagerService } from '../services/agent-manager/agent-manager-service';

import type {
  ControlError,
  ControlRequest,
  ControlResponse,
} from './host-protocol';
import type {
  AgentManagerEvent,
  AgentManagerService,
} from '../services/agent-manager/agent-manager-service';


// ── State ───────────────────────────────────────────────────

let controlPort: Electron.MessagePortMain | null = null;
let eventPort: Electron.MessagePortMain | null = null;
let agentManager: AgentManagerService | null = null;

// ── Bootstrap ───────────────────────────────────────────────

function bootstrap(): void {
  if (!controlPort || !eventPort) {
    throw new Error('Cannot bootstrap: ports not received');
  }

  agentManager = createAgentManagerService({});

  // Capture eventPort in a local const so the closure doesn't need
  // a non-null assertion on every call.
  const ep = eventPort;

  // Forward all AgentManagerEvents to the event port
  agentManager.onEvent((event: AgentManagerEvent) => {
    ep.postMessage(event);
  });

  // Listen for control requests on the control port
  controlPort.on('message', (e: Electron.MessageEvent) => {
    handleRequest(e.data as ControlRequest);
  });

  controlPort.start();
  eventPort.start();
}

// ── Request Handler ─────────────────────────────────────────

function handleRequest(req: ControlRequest): void {
  if (!agentManager || !controlPort) {
    return;
  }

  try {
    let result: unknown;

    switch (req.type) {
      case 'spawn-project-owner':
        result = agentManager.spawnProjectOwner(req.config);
        break;
      case 'spawn-team-lead':
        result = agentManager.spawnTeamLead(req.config);
        break;
      case 'stop-session':
        result = agentManager.stopSession(req.sessionId);
        break;
      case 'send-message':
        result = agentManager.sendMessage(req.sessionId, req.message);
        break;
      case 'list-sessions':
        result = agentManager.listSessions(req.filter);
        break;
      case 'get-session':
        result = agentManager.getSession(req.sessionId);
        break;
      case 'get-messages':
        result = agentManager.getMessages(req.sessionId);
        break;
      case 'get-session-project-path':
        result = agentManager.getSessionProjectPath(req.sessionId);
        break;
      case 'dispose':
        agentManager.dispose();
        result = { success: true };
        break;
    }

    const response: ControlResponse = { type: 'response', id: req.id, result };
    controlPort.postMessage(response);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const errorResponse: ControlError = { type: 'error', id: req.id, error };
    controlPort.postMessage(errorResponse);
  }
}

// ── Port Initialization ─────────────────────────────────────

/**
 * Electron utility processes receive transferred MessagePorts via
 * `process.parentPort`. The main process sends an 'init' message
 * with two ports: [controlPort, eventPort].
 */
process.parentPort.on('message', (e: Electron.MessageEvent) => {
  const data = e.data as Record<string, unknown> | undefined;
  if (data?.type === 'init' && e.ports.length >= 2) {
    [controlPort, eventPort] = [e.ports[0], e.ports[1]];
    bootstrap();
  }
});

// ── Cleanup ─────────────────────────────────────────────────

process.on('beforeExit', () => {
  agentManager?.dispose();
});

process.on('SIGTERM', () => {
  agentManager?.dispose();
  process.exit(0);
});

process.on('disconnect', () => {
  agentManager?.dispose();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('[agent-host] Uncaught exception:', error);
  agentManager?.dispose();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[agent-host] Unhandled rejection:', reason);
  // Don't exit — just log. Let the event loop continue.
});
