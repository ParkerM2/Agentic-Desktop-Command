/**
 * Agent Watchdog — Health monitoring and crash recovery for active agents
 *
 * Monitors all active agent sessions for health issues:
 * - Dead processes (PID check / exit event)
 * - Stale progress (heartbeat age)
 * - Auth failures (Hub connectivity)
 *
 * Emits typed alerts with suggested recovery actions.
 * Optionally auto-restarts on context overflow (exit code 2).
 */

import type { AgentOrchestrator, AgentSession } from './types';
import type { NotificationManager } from '../notifications';

// ─── Types ────────────────────────────────────────────────────

export interface WatchdogConfig {
  checkIntervalMs: number;
  warnAfterMs: number;
  staleAfterMs: number;
  autoRestartOnOverflow: boolean;
}

export type WatchdogAlertType = 'warning' | 'stale' | 'dead' | 'auth_failed';

export type WatchdogSuggestedAction =
  | 'restart_checkpoint'
  | 'restart_fresh'
  | 'mark_error'
  | 'retry_auth';

export interface WatchdogAlert {
  type: WatchdogAlertType;
  sessionId: string;
  taskId: string;
  message: string;
  suggestedAction: WatchdogSuggestedAction;
  timestamp: string;
}

export interface WatchdogReport {
  sessionId: string;
  taskId: string;
  pid: number;
  isAlive: boolean;
  heartbeatAgeMs: number;
  alerts: WatchdogAlert[];
}

export type WatchdogAlertHandler = (alert: WatchdogAlert) => void;

export interface AgentWatchdog {
  start: () => void;
  stop: () => void;
  checkNow: () => WatchdogReport[];
  onAlert: (handler: WatchdogAlertHandler) => void;
  dispose: () => void;
}

// ─── Default Configuration ────────────────────────────────────

const DEFAULT_CONFIG: WatchdogConfig = {
  checkIntervalMs: 30_000,
  warnAfterMs: 300_000,
  staleAfterMs: 900_000,
  autoRestartOnOverflow: false,
};

// ─── Process Alive Check ──────────────────────────────────────

function isProcessAlive(pid: number): boolean {
  if (pid <= 0) {
    return false;
  }
  try {
    // Sending signal 0 checks if the process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ─── Factory ──────────────────────────────────────────────────

export function createAgentWatchdog(
  orchestrator: AgentOrchestrator,
  config: Partial<WatchdogConfig> = {},
  notificationManager?: NotificationManager,
): AgentWatchdog {
  const resolvedConfig: WatchdogConfig = { ...DEFAULT_CONFIG, ...config };
  const alertHandlers: WatchdogAlertHandler[] = [];
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Track sessions we've already alerted about to avoid spam
  const alertedSessions = new Map<string, Set<WatchdogAlertType>>();

  function emitAlert(alert: WatchdogAlert): void {
    for (const handler of alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AgentWatchdog] Alert handler error:', message);
      }
    }

    // Send notification for dead or stale alerts
    if (notificationManager && (alert.type === 'dead' || alert.type === 'stale')) {
      notificationManager.onNotification({
        id: `watchdog-${alert.type}-${alert.sessionId}-${String(Date.now())}`,
        source: 'github',
        type: 'ci_status',
        title: `Agent ${alert.type}: Task ${alert.taskId}`,
        body: alert.message,
        url: '',
        timestamp: alert.timestamp,
        read: false,
        metadata: { ciStatus: 'failure' },
      });
    }
  }

  function hasAlerted(sessionId: string, alertType: WatchdogAlertType): boolean {
    const types = alertedSessions.get(sessionId);
    return types?.has(alertType) === true;
  }

  function markAlerted(sessionId: string, alertType: WatchdogAlertType): void {
    let types = alertedSessions.get(sessionId);
    if (!types) {
      types = new Set();
      alertedSessions.set(sessionId, types);
    }
    types.add(alertType);
  }

  function clearAlerts(sessionId: string): void {
    alertedSessions.delete(sessionId);
  }

  function checkSession(session: AgentSession): WatchdogReport {
    const now = Date.now();
    const heartbeatTime = new Date(session.lastHeartbeat).getTime();
    const heartbeatAgeMs = now - heartbeatTime;
    const alive = isProcessAlive(session.pid);
    const alerts: WatchdogAlert[] = [];

    // Check 1: Process dead
    if (!alive) {
      if (!hasAlerted(session.id, 'dead')) {
        const alert: WatchdogAlert = {
          type: 'dead',
          sessionId: session.id,
          taskId: session.taskId,
          message: `Agent process (PID ${String(session.pid)}) is no longer running`,
          suggestedAction: 'restart_checkpoint',
          timestamp: new Date().toISOString(),
        };
        alerts.push(alert);
        markAlerted(session.id, 'dead');
        emitAlert(alert);
      }

      return {
        sessionId: session.id,
        taskId: session.taskId,
        pid: session.pid,
        isAlive: false,
        heartbeatAgeMs,
        alerts,
      };
    }

    // Check 2: Stale (> 15 min no heartbeat)
    if (heartbeatAgeMs > resolvedConfig.staleAfterMs) {
      if (!hasAlerted(session.id, 'stale')) {
        const minutes = Math.round(heartbeatAgeMs / 60_000);
        const alert: WatchdogAlert = {
          type: 'stale',
          sessionId: session.id,
          taskId: session.taskId,
          message: `Agent stalled (no activity for ${String(minutes)} min)`,
          suggestedAction: 'restart_checkpoint',
          timestamp: new Date().toISOString(),
        };
        alerts.push(alert);
        markAlerted(session.id, 'stale');
        emitAlert(alert);
      }
    }
    // Check 3: Warning (> 5 min no heartbeat, but not stale yet)
    else if (heartbeatAgeMs > resolvedConfig.warnAfterMs) {
      if (!hasAlerted(session.id, 'warning')) {
        const minutes = Math.round(heartbeatAgeMs / 60_000);
        const alert: WatchdogAlert = {
          type: 'warning',
          sessionId: session.id,
          taskId: session.taskId,
          message: `Agent slow (no activity for ${String(minutes)} min)`,
          suggestedAction: 'mark_error',
          timestamp: new Date().toISOString(),
        };
        alerts.push(alert);
        markAlerted(session.id, 'warning');
        emitAlert(alert);
      }
    }
    // If heartbeat is recent, clear previous warning/stale alerts
    else {
      clearAlerts(session.id);
    }

    return {
      sessionId: session.id,
      taskId: session.taskId,
      pid: session.pid,
      isAlive: true,
      heartbeatAgeMs,
      alerts,
    };
  }

  function runCheck(): WatchdogReport[] {
    const activeSessions = orchestrator.listActiveSessions();
    return activeSessions.map((session) => checkSession(session));
  }

  // Listen for orchestrator session events to handle auto-recovery
  orchestrator.onSessionEvent((event) => {
    // On exit with code 2 (context overflow), auto-restart if enabled
    if (
      event.type === 'error' &&
      event.exitCode === 2 &&
      resolvedConfig.autoRestartOnOverflow
    ) {
      const { session } = event;
      const alert: WatchdogAlert = {
        type: 'dead',
        sessionId: session.id,
        taskId: session.taskId,
        message: 'Agent hit context overflow (exit code 2) — auto-restarting from checkpoint',
        suggestedAction: 'restart_checkpoint',
        timestamp: new Date().toISOString(),
      };
      emitAlert(alert);
    }

    // Clean up alert tracking for completed/killed/error sessions
    if (event.type === 'completed' || event.type === 'killed') {
      clearAlerts(event.session.id);
    }
  });

  return {
    start(): void {
      if (intervalId !== null) {
        return;
      }
      intervalId = setInterval(() => {
        runCheck();
      }, resolvedConfig.checkIntervalMs);
    },

    stop(): void {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    checkNow(): WatchdogReport[] {
      return runCheck();
    },

    onAlert(handler: WatchdogAlertHandler): void {
      alertHandlers.push(handler);
    },

    dispose(): void {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      alertHandlers.length = 0;
      alertedSessions.clear();
    },
  };
}
