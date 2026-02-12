/**
 * Terminal Service — Real PTY Implementation
 *
 * Spawns actual pseudo-terminal processes via @lydell/node-pty.
 * Pipes I/O between PTY and IPC events.
 */

import { existsSync } from 'node:fs';
import { platform } from 'node:os';

import * as pty from '@lydell/node-pty';

import type { TerminalSession } from '@shared/types';

import type { IpcRouter } from '../../ipc/router';

interface PtyProcess {
  session: TerminalSession;
  pty: pty.IPty;
}

export interface TerminalService {
  listTerminals: (projectPath?: string) => TerminalSession[];
  createTerminal: (cwd: string, projectPath?: string) => TerminalSession;
  closeTerminal: (sessionId: string) => { success: boolean };
  sendInput: (sessionId: string, data: string) => { success: boolean };
  resizeTerminal: (sessionId: string, cols: number, rows: number) => { success: boolean };
  invokeClaudeCli: (sessionId: string, cwd: string) => { success: boolean };
  dispose: () => void;
}

function getShell(): string {
  if (platform() === 'win32') {
    // Prefer PowerShell 7+ if available, then Windows PowerShell, then cmd
    const pwsh7 = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
    if (existsSync(pwsh7)) return pwsh7;
    return process.env.COMSPEC ?? 'cmd.exe';
  }
  return process.env.SHELL ?? '/bin/bash';
}

function getShellArgs(): string[] {
  const shell = getShell();
  if (platform() === 'win32') {
    if (shell.includes('pwsh') || shell.includes('powershell')) return [];
    return []; // cmd.exe needs no args
  }
  return ['--login'];
}

export function createTerminalService(router: IpcRouter): TerminalService {
  const processes = new Map<string, PtyProcess>();

  return {
    listTerminals(projectPath) {
      const sessions = Array.from(processes.values()).map((p) => p.session);
      return projectPath ? sessions.filter((s) => s.projectPath === projectPath) : sessions;
    },

    createTerminal(cwd, projectPath) {
      const shell = getShell();
      const args = getShellArgs();
      const id = crypto.randomUUID();

      // Resolve cwd — use home dir if ~ or invalid
      let resolvedCwd = cwd;
      if (cwd === '~' || !existsSync(cwd)) {
        resolvedCwd = process.env.HOME ?? process.env.USERPROFILE ?? '.';
      }

      const ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: resolvedCwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        } as Record<string, string>,
      });

      const session: TerminalSession = {
        id,
        name: resolvedCwd.split(/[/\\]/).pop() ?? 'Terminal',
        cwd: resolvedCwd,
        projectPath,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Pipe PTY output → renderer via IPC event
      ptyProcess.onData((data: string) => {
        router.emit('event:terminal.output', {
          sessionId: id,
          data,
        });
      });

      // Handle PTY title changes (if available in this node-pty version)
      if ('onTitleChange' in ptyProcess) {
        (ptyProcess as unknown as { onTitleChange: (cb: (title: string) => void) => void }).onTitleChange(
          (title: string) => {
            router.emit('event:terminal.titleChanged', {
              sessionId: id,
              title,
            });
          },
        );
      }

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode: _exitCode }) => {
        processes.delete(id);
        router.emit('event:terminal.closed', { sessionId: id });
      });

      processes.set(id, { session, pty: ptyProcess });
      return session;
    },

    closeTerminal(sessionId) {
      const proc = processes.get(sessionId);
      if (!proc) return { success: false };
      try {
        proc.pty.kill();
      } catch {
        // Already dead
      }
      processes.delete(sessionId);
      router.emit('event:terminal.closed', { sessionId });
      return { success: true };
    },

    sendInput(sessionId, data) {
      const proc = processes.get(sessionId);
      if (!proc) return { success: false };
      proc.pty.write(data);
      return { success: true };
    },

    resizeTerminal(sessionId, cols, rows) {
      const proc = processes.get(sessionId);
      if (!proc) return { success: false };
      try {
        proc.pty.resize(cols, rows);
      } catch {
        // Ignore resize errors on dead processes
      }
      return { success: true };
    },

    invokeClaudeCli(sessionId, _cwd) {
      const proc = processes.get(sessionId);
      if (!proc) return { success: false };
      // Send the claude command to the terminal
      proc.pty.write('claude\r');
      return { success: true };
    },

    dispose() {
      for (const [_id, proc] of processes) {
        try {
          proc.pty.kill();
        } catch {
          // Ignore
        }
      }
      processes.clear();
    },
  };
}
