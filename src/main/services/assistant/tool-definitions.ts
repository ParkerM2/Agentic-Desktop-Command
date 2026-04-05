/**
 * Tool definitions for the assistant's tool_use capability.
 * Each tool maps to an app service method that creates or reads data.
 */

import type Anthropic from '@anthropic-ai/sdk';

export type AppTool = Anthropic.Tool & {
  /** React Query key root to invalidate when this tool executes */
  queryKeyRoots: string[];
};

export const APP_TOOLS: AppTool[] = [
  // ── Notes ────────────────────────────────────────────────────────────────
  {
    name: 'create_note',
    description:
      'Create a new note in the app. Use when the user asks to write a note, capture an idea in text, or save information for later.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short descriptive title for the note' },
        content: { type: 'string', description: 'Full markdown content of the note' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags to categorise the note',
        },
        projectId: { type: 'string', description: 'Optional project ID to associate with' },
      },
      required: ['title', 'content'],
    },
    queryKeyRoots: ['notes'],
  },

  // ── Milestones ───────────────────────────────────────────────────────────
  {
    name: 'create_milestone',
    description:
      'Create a new roadmap milestone. Use when the user asks to add a milestone, plan a feature release, or create a project phase.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Milestone title, e.g. "v1.0 Release"' },
        description: {
          type: 'string',
          description: 'What this milestone represents and its success criteria',
        },
        targetDate: {
          type: 'string',
          description: 'ISO date string for when this should be achieved, e.g. "2026-06-01"',
        },
        projectId: { type: 'string', description: 'Optional project ID to associate with' },
      },
      required: ['title', 'description', 'targetDate'],
    },
    queryKeyRoots: ['milestones'],
  },

  // ── Ideas ────────────────────────────────────────────────────────────────
  {
    name: 'create_idea',
    description:
      'Create a new idea in the ideation board. Use when the user wants to capture a feature idea, improvement suggestion, or hypothesis.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short idea title' },
        description: {
          type: 'string',
          description: 'Detailed description of the idea and why it is valuable',
        },
        category: {
          type: 'string',
          enum: ['feature', 'improvement', 'bug', 'performance'],
          description: 'Category of the idea',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags',
        },
        projectId: { type: 'string', description: 'Optional project ID' },
      },
      required: ['title', 'description', 'category'],
    },
    queryKeyRoots: ['ideas'],
  },

  // ── Planner ──────────────────────────────────────────────────────────────
  {
    name: 'add_daily_goal',
    description:
      'Add a goal to today\'s daily plan. Use when the user asks to set a goal, add something to their day, or plan a task for today.',
    input_schema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'The goal text to add to today\'s plan' },
        date: {
          type: 'string',
          description: 'ISO date string for the target day (defaults to today if omitted)',
        },
      },
      required: ['goal'],
    },
    queryKeyRoots: ['planner'],
  },

  // ── Context & Memory ─────────────────────────────────────────────────────
  {
    name: 'list_projects',
    description:
      'List all projects the user has added to ADC with their IDs and filesystem paths. Use when the user asks about their projects.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    queryKeyRoots: [],
  },

  {
    name: 'query_recent_items',
    description:
      'Query notes, milestones, or ideas created since a given date. Use when the user asks what was created, added, or done recently.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['notes', 'milestones', 'ideas'],
          description: 'Which data type to query',
        },
        since: {
          type: 'string',
          description:
            'ISO 8601 date string. If omitted, defaults to 7 days ago. Example: "2026-03-27T00:00:00Z"',
        },
      },
      required: ['type'],
    },
    queryKeyRoots: [],
  },

  {
    name: 'list_progress_features',
    description:
      'List the workflow feature names being tracked in progress/. Call this before read_progress_file to discover available features.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    queryKeyRoots: [],
  },

  {
    name: 'read_progress_file',
    description:
      'Read a workflow progress file for a tracked feature. Returns workflow-state.json (current phase and status) or proof-ledger.jsonl (task completion records). Use this to answer questions about what tasks were completed.',
    input_schema: {
      type: 'object',
      properties: {
        feature: {
          type: 'string',
          description:
            'Feature directory name under progress/ (e.g. "workspace-and-assistant-redesign")',
        },
        file: {
          type: 'string',
          enum: ['workflow-state.json', 'proof-ledger.jsonl'],
          description: 'Which file to read',
        },
      },
      required: ['feature', 'file'],
    },
    queryKeyRoots: [],
  },
];

export function getToolNames(): string[] {
  return APP_TOOLS.map((t) => t.name);
}

export function getQueryKeysForTool(toolName: string): string[][] {
  const tool = APP_TOOLS.find((t) => t.name === toolName);
  return tool ? [tool.queryKeyRoots] : [];
}
