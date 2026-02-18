/**
 * Agent Spawner — PTY process creation and shell detection
 *
 * @deprecated Part of the legacy agent system. The new workflow/task-launcher.ts
 * uses detached child_process for simpler lifecycle management.
 * Kept for backward compatibility.
 */

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { join } from 'node:path';

import * as pty from '@lydell/node-pty';

import { ADC_DIR, SPECS_DIR } from '@shared/constants';
import type { AgentSession, AgentStatus, TokenUsage } from '@shared/types';

import { parseClaudeOutput } from './agent-output-parser';
import {
  createEmptyUsage,
  mightContainTokenInfo,
  parseTokenLine,
  updateTokenUsage,
} from './token-parser';

export interface AgentProcess {
  session: AgentSession;
  pty: pty.IPty;
  outputBuffer: string[];
  isPaused: boolean;
}

export interface SpawnerDeps {
  agents: Map<string, AgentProcess>;
  resolveProject: (projectId: string) => string | undefined;
  emitStatus: (agentId: string, status: AgentStatus, taskId: string) => void;
  emitLog: (agentId: string, message: string) => void;
  emitTokenUsage: (agentId: string, usage: TokenUsage) => void;
  onExit: (agentId: string) => void;
}

/**
 * Detect the best available shell for the current platform.
 */
export function getShell(): string {
  if (platform() === 'win32') {
    const pwsh7 = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
    if (existsSync(pwsh7)) return pwsh7;
    return process.env.COMSPEC ?? 'cmd.exe';
  }
  return process.env.SHELL ?? '/bin/bash';
}

/**
 * Spawn a new PTY-based agent process for the given task.
 */
export function spawnAgent(
  taskId: string,
  projectId: string,
  cwd: string,
  deps: SpawnerDeps,
): AgentSession {
  const id = `agent-${taskId}-${String(Date.now())}`;
  const shell = getShell();

  // Resolve working directory
  let workDir = cwd;
  const projectPath = deps.resolveProject(projectId);
  if (!workDir && projectPath) {
    workDir = projectPath;
  }
  if (!workDir || !existsSync(workDir)) {
    workDir = process.env.HOME ?? process.env.USERPROFILE ?? '.';
  }

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: workDir,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    } as Record<string, string>,
  });

  const session: AgentSession = {
    id,
    taskId,
    projectId,
    status: 'idle',
    worktreePath: workDir,
    startedAt: new Date().toISOString(),
    tokenUsage: createEmptyUsage(),
  };

  const agentProc: AgentProcess = {
    session,
    pty: ptyProcess,
    outputBuffer: [],
    isPaused: false,
  };

  // Parse PTY output for status events and token usage
  ptyProcess.onData((data: string) => {
    if (agentProc.isPaused) return;

    const lines = data.split('\n');
    for (const line of lines) {
      // Parse for token usage if line might contain it
      if (mightContainTokenInfo(line) && session.tokenUsage) {
        const tokenData = parseTokenLine(line);
        if (
          tokenData.inputTokens !== undefined ||
          tokenData.outputTokens !== undefined ||
          tokenData.cost !== undefined
        ) {
          session.tokenUsage = updateTokenUsage(session.tokenUsage, tokenData);
          deps.emitTokenUsage(id, session.tokenUsage);
        }
      }

      const parsed = parseClaudeOutput(line);
      if (parsed) {
        if (parsed.type === 'status') {
          const newStatus = parsed.data.status as AgentStatus;
          session.status = newStatus;
          deps.emitStatus(id, newStatus, taskId);
          if (newStatus === 'completed') {
            session.completedAt = new Date().toISOString();
          }
        } else if (parsed.type === 'log') {
          agentProc.outputBuffer.push(parsed.data.message as string);
          deps.emitLog(id, parsed.data.message as string);
        }
      }
    }
  });

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode }) => {
    if (session.status !== 'completed' && session.status !== 'error') {
      session.status = exitCode === 0 ? 'completed' : 'error';
      session.completedAt = new Date().toISOString();
      deps.emitStatus(id, session.status, taskId);
    }
    deps.agents.delete(id);
    deps.onExit(id);
  });

  deps.agents.set(id, agentProc);

  // Start the agent by invoking Claude CLI
  // Send the claude command after a brief delay for shell init
  setTimeout(() => {
    // Construct the claude command with the task context
    const specDir = join(workDir, ADC_DIR, SPECS_DIR, taskId);
    const claudeCmd = existsSync(specDir) ? `claude --task "${taskId}"\r` : `claude\r`;
    ptyProcess.write(claudeCmd);
    session.status = 'running';
    deps.emitStatus(id, 'running', taskId);
  }, 500);

  return session;
}
