/**
 * AssistantService — simplified direct Claude CLI subprocess.
 *
 * Fire-and-forget: sends input to `claude --print` and streams the response
 * back to the renderer via event:assistant.response chunks.
 *
 * No intent classification. No executors. No routing.
 */

import { spawn } from 'node:child_process';

import type { BrowserWindow } from 'electron';

export interface AssistantService {
  sendCommand: (input: string, projectPath: string) => void;
  getHistory: () => CommandHistoryEntry[];
  clearHistory: () => void;
}

interface CommandHistoryEntry {
  id: string;
  input: string;
  responseSummary: string;
  timestamp: string;
}

export function createAssistantService(getWindow: () => BrowserWindow | null): AssistantService {
  const history: CommandHistoryEntry[] = [];

  function sendEvent(channel: string, payload: unknown): void {
    getWindow()?.webContents.send(channel, payload);
  }

  return {
    sendCommand(input, projectPath) {
      const id = `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`;
      sendEvent('event:assistant.thinking', { isThinking: true });

      const child = spawn('claude', ['--print', '-p', input], {
        cwd: projectPath,
        shell: true,
      });

      let responseBuffer = '';

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        responseBuffer += text;
        sendEvent('event:assistant.response', { content: text, type: 'text' });
      });

      child.stderr.on('data', (chunk: Buffer) => {
        sendEvent('event:assistant.response', { content: chunk.toString(), type: 'error' });
      });

      child.on('close', () => {
        sendEvent('event:assistant.thinking', { isThinking: false });
        history.push({
          id,
          input,
          responseSummary: responseBuffer.slice(0, 200),
          timestamp: new Date().toISOString(),
        });
      });
    },

    getHistory() {
      return [...history];
    },

    clearHistory() {
      history.length = 0;
    },
  };
}
