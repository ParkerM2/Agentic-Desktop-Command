/**
 * TmuxBridge Service — Manage tmux sessions for agent teams
 *
 * Creates/kills tmux sessions, sends keys for input, captures pane output.
 * Gracefully handles tmux not being installed (isAvailable check).
 *
 * Used by:
 *   - Team Lead session: interactive Claude with agent teams in tmux
 *   - Teammate management: send-keys for tmux-based teammates
 */

import type { TmuxSession } from '@shared/types/agent-dashboard';

import { appLogger } from '../../lib/logger';

import {
  isTmuxInstalled,
  tmuxCapturePane,
  tmuxHasSession,
  tmuxKillSession,
  tmuxListSessions,
  tmuxNewSession,
  tmuxSendKeys,
} from './tmux-commands';

export interface TmuxBridgeService {
  /** Create a new detached tmux session with optional environment variables */
  createSession: (name: string, env?: Record<string, string>) => TmuxSession;
  /** Send keys (text input) to a tmux session or pane */
  sendKeys: (sessionName: string, keys: string) => void;
  /** Capture the visible contents of a tmux pane */
  capturePane: (paneId: string) => string;
  /** List all active tmux sessions */
  listSessions: () => TmuxSession[];
  /** Kill a tmux session by name */
  killSession: (sessionName: string) => void;
  /** Check if tmux is installed and available */
  isAvailable: () => boolean;
  /** Check if a specific session exists */
  hasSession: (name: string) => boolean;
}

/** Parse a raw tmux list-sessions line into a TmuxSession */
function parseSessionLine(line: string): TmuxSession | null {
  const parts = line.split('|');
  if (parts.length < 5) {
    return null;
  }

  const name = parts[0];
  const id = parts[1];
  const created = parts[2];
  const attached = parts[3];
  const windows = parts[4];
  const parsedWindows = parseInt(windows, 10);

  return {
    name,
    id,
    created,
    attached: attached === '1',
    windows: Number.isNaN(parsedWindows) ? 0 : parsedWindows,
  };
}

export function createTmuxBridgeService(): TmuxBridgeService {
  let tmuxAvailable: boolean | null = null;

  function checkAvailable(): boolean {
    if (tmuxAvailable === null) {
      tmuxAvailable = isTmuxInstalled();
      if (!tmuxAvailable) {
        appLogger.warn(
          '[TmuxBridge] tmux is not installed. Team Lead and tmux-based features will be unavailable.',
        );
      }
    }
    return tmuxAvailable;
  }

  function requireAvailable(): void {
    if (!checkAvailable()) {
      throw new Error(
        'tmux is not installed. Install via: brew install tmux (macOS) or apt install tmux (Linux)',
      );
    }
  }

  return {
    createSession(name: string, env?: Record<string, string>): TmuxSession {
      requireAvailable();
      tmuxNewSession(name, env);

      return {
        name,
        id: name,
        created: new Date().toISOString(),
        attached: false,
        windows: 1,
      };
    },

    sendKeys(sessionName: string, keys: string): void {
      requireAvailable();
      tmuxSendKeys(sessionName, keys);
    },

    capturePane(paneId: string): string {
      requireAvailable();
      return tmuxCapturePane(paneId);
    },

    listSessions(): TmuxSession[] {
      if (!checkAvailable()) {
        return [];
      }

      const lines = tmuxListSessions();
      const sessions: TmuxSession[] = [];

      for (const line of lines) {
        const session = parseSessionLine(line);
        if (session !== null) {
          sessions.push(session);
        }
      }

      return sessions;
    },

    killSession(sessionName: string): void {
      if (!checkAvailable()) {
        return;
      }
      tmuxKillSession(sessionName);
    },

    isAvailable(): boolean {
      return checkAvailable();
    },

    hasSession(name: string): boolean {
      if (!checkAvailable()) {
        return false;
      }
      return tmuxHasSession(name);
    },
  };
}
