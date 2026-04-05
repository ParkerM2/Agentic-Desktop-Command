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
import type { ProjectService } from '../project/project-service';


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
  projectService: Pick<ProjectService, 'listProjectsSync'> | null;
}

function buildSystemPrompt(
  projectService: AssistantServiceDeps['projectService'],
  context?: { activeView?: string; activeProjectId?: string },
): string {
  const projects = projectService?.listProjectsSync() ?? [];
  const projectList =
    projects.length > 0
      ? projects.map((p) => `  - ${p.name} (id: ${p.id}, path: ${p.path})`).join('\n')
      : '  (no projects added yet)';

  const base = `You are the AI co-pilot for ADC — a personal developer OS that reduces noise across development and personal tasks.

ADC features:
- Roadmap: project milestones with sub-tasks and progress tracking
- Ideation: feature ideas with voting and categories (feature/improvement/bug/performance)
- Notes: tagged notes per project
- Daily Planner: time blocks and goals with completion tracking
- Agent Dashboard: Claude AI coding agents with real-time session monitoring
- Workflow Pipeline: multi-step AI coding task orchestration
- Dashboard: daily overview with quick capture and today's schedule
- Communications: Slack and Discord integrations
- Briefing: AI-generated daily briefings
- Fitness tracker, Changelog, Screen capture

Current date/time: ${new Date().toISOString()}

User's projects:
${projectList}

Tools available:
- create_note, create_milestone, create_idea, add_daily_goal — create records directly in ADC
- list_projects — list all user projects with paths
- query_recent_items — query notes/milestones/ideas by recency (default: last 7 days)
- list_progress_features — list workflow features tracked in progress/
- read_progress_file — read workflow-state.json or proof-ledger.jsonl for a feature

When users ask what was done, completed, or accomplished recently:
1. Call list_progress_features to discover tracked features
2. Call read_progress_file for relevant features to read their workflow state and proof ledger
3. Call query_recent_items to check notes, milestones, and ideas added recently
4. Synthesize the findings into a clear answer

When asked to create something, use the appropriate tool immediately — do NOT just describe it.
Always confirm what you created with key details. Be concise and action-oriented.`;

  const viewContext = context?.activeView
    ? `\nUser is currently on the ${context.activeView} screen.`
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
    projectService: deps.projectService,
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
      const systemPrompt = buildSystemPrompt(deps.projectService, context);
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
