/**
 * AssistantService — Anthropic SDK tool_use assistant.
 *
 * Replaces the previous `claude --print` CLI subprocess with a direct
 * Anthropic SDK call that supports tool_use. When Claude calls a tool,
 * the tool executor fires the corresponding service method and emits
 * an invalidation event so the renderer's React Query cache stays fresh.
 *
 * Falls back gracefully when no API key is configured.
 */

import type { BrowserWindow } from 'electron';

import Anthropic from '@anthropic-ai/sdk';


import { createHistoryStore } from './history-store';
import { APP_TOOLS } from './tool-definitions';
import { createToolExecutor } from './tool-executor';

import type { IdeasService } from '../ideas/ideas-service';
import type { MilestonesService } from '../milestones/milestones-service';
import type { NotesService } from '../notes/notes-service';
import type { PlannerService } from '../planner/planner-service';


const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const MAX_TOOL_ITERATIONS = 10;

export interface AssistantService {
  sendCommand: (
    input: string,
    projectPath: string,
    context?: { activeView?: string; activeProjectId?: string },
  ) => void;
  getHistory: () => ReturnType<ReturnType<typeof createHistoryStore>['getEntries']>;
  clearHistory: () => void;
}

export interface AssistantServiceDeps {
  getWindow: () => BrowserWindow | null;
  getApiKey: () => string | undefined;
  notesService: NotesService | null;
  milestonesService: MilestonesService | null;
  ideasService: IdeasService | null;
  plannerService: PlannerService | null;
}

function buildSystemPrompt(context?: { activeView?: string; activeProjectId?: string }): string {
  const base = `You are a personal developer assistant embedded in ADC, a desktop developer OS app.
You have access to tools that can create notes, milestones, ideas, and planner goals directly in the app.
When the user asks you to create something, use the appropriate tool — do NOT just describe what you would do.
Always confirm what you created and show the key details (title, date, etc.) in your response.
Be concise and action-oriented.`;

  const viewContext = context?.activeView
    ? `\nThe user is currently viewing: ${context.activeView}.`
    : '';

  const projectContext = context?.activeProjectId
    ? `\nActive project ID: ${context.activeProjectId}. Pass this as projectId in tool calls when relevant.`
    : '';

  return base + viewContext + projectContext;
}

function collectToolResults(
  content: Anthropic.ContentBlock[],
  toolExecutor: ReturnType<typeof createToolExecutor>,
): Anthropic.ToolResultBlockParam[] {
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of content) {
    if (block.type === 'tool_use') {
      const result = toolExecutor.execute(block.name, block.input as Record<string, unknown>);
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result.success
          ? JSON.stringify(result.data)
          : `Error: ${result.error ?? 'Tool execution failed'}`,
        is_error: !result.success,
      });
    }
  }
  return results;
}

async function runConversationLoop(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  systemPrompt: string,
  toolExecutor: ReturnType<typeof createToolExecutor>,
  sendEvent: (channel: string, payload: unknown) => void,
): Promise<string> {
  let fullResponse = '';
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

     
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: APP_TOOLS,
      messages,
    });

    for (const block of response.content) {
      if (block.type === 'text') {
        fullResponse += block.text;
        sendEvent('event:assistant.response', { content: block.text, type: 'text' });
      }
    }

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      messages.push(
        { role: 'assistant', content: response.content },
        { role: 'user', content: collectToolResults(response.content, toolExecutor) },
      );
      continue;
    }

    break;
  }

  return fullResponse;
}

export function createAssistantService(deps: AssistantServiceDeps): AssistantService {
  const { getWindow, getApiKey } = deps;
  const historyStore = createHistoryStore();

  function sendEvent(channel: string, payload: unknown): void {
    getWindow()?.webContents.send(channel, payload);
  }

  const toolExecutor = createToolExecutor({
    notesService: deps.notesService,
    milestonesService: deps.milestonesService,
    ideasService: deps.ideasService,
    plannerService: deps.plannerService,
    sendEvent,
  });

  return {
    sendCommand(input, _projectPath, context) {
      const apiKey = getApiKey();
      if (!apiKey) {
        sendEvent('event:assistant.response', {
          content:
            'Claude API key is not configured. Add your Anthropic API key in Settings to use the assistant.',
          type: 'error',
        });
        return;
      }

      const id = `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`;
      sendEvent('event:assistant.thinking', { isThinking: true });

      const client = new Anthropic({ apiKey });
      const systemPrompt = buildSystemPrompt(context);
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: input }];

      void (async () => {
        try {
          const fullResponse = await runConversationLoop(
            client,
            messages,
            systemPrompt,
            toolExecutor,
            sendEvent,
          );
          historyStore.addEntry({
            id,
            input,
            responseSummary: fullResponse.slice(0, 200),
            timestamp: new Date().toISOString(),
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          sendEvent('event:assistant.response', { content: `Error: ${message}`, type: 'error' });
        } finally {
          sendEvent('event:assistant.thinking', { isThinking: false });
        }
      })();
    },

    getHistory() {
      return historyStore.getEntries();
    },

    clearHistory() {
      historyStore.clear();
    },
  };
}
