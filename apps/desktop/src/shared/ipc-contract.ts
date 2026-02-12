/**
 * IPC Contract — Single Source of Truth
 *
 * Every IPC operation between main ↔ renderer is defined here.
 * Types flow automatically to the IPC router, preload bridge, and React Query hooks.
 *
 * To add a new operation:
 *   1. Add an entry here with input/output schemas (invoke) or event schema (event)
 *   2. Register the handler in main/ipc/handlers/
 *   3. Create a React Query hook in the relevant feature's api/ folder
 *   That's it — types flow everywhere automatically.
 */
import { z } from 'zod';
import {
  TaskSchema,
  TaskDraftSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  ProjectSchema,
  TerminalSessionSchema,
  AgentSchema,
  AgentStatusSchema,
  AppSettingsSchema,
} from './types';

// ─── Invoke Channels (request/response) ─────────────────────────
// Renderer calls → main process handles → returns result

export const invokeContract = {
  // ── Projects ──────────────────────────────────────────────────
  'projects.list': {
    input: z.object({}),
    output: z.array(ProjectSchema),
  },
  'projects.add': {
    input: z.object({ name: z.string(), path: z.string() }),
    output: ProjectSchema,
  },
  'projects.remove': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'projects.updateSettings': {
    input: z.object({ projectId: z.string(), settings: z.record(z.unknown()) }),
    output: ProjectSchema,
  },
  'projects.initialize': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Tasks ────────────────────────────────────────────────────
  'tasks.list': {
    input: z.object({ projectId: z.string() }),
    output: z.array(TaskSchema),
  },
  'tasks.create': {
    input: TaskDraftSchema,
    output: TaskSchema,
  },
  'tasks.update': {
    input: z.object({ taskId: z.string(), updates: z.record(z.unknown()) }),
    output: TaskSchema,
  },
  'tasks.updateStatus': {
    input: z.object({ taskId: z.string(), status: TaskStatusSchema }),
    output: TaskSchema,
  },
  'tasks.delete': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'tasks.start': {
    input: z.object({ taskId: z.string() }),
    output: TaskSchema,
  },
  'tasks.stop': {
    input: z.object({ taskId: z.string() }),
    output: TaskSchema,
  },
  'tasks.archive': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Terminals ─────────────────────────────────────────────────
  'terminals.create': {
    input: z.object({ cwd: z.string(), projectId: z.string().optional() }),
    output: TerminalSessionSchema,
  },
  'terminals.destroy': {
    input: z.object({ terminalId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.getSessions': {
    input: z.object({ projectId: z.string().optional() }),
    output: z.array(TerminalSessionSchema),
  },
  'terminals.restoreSession': {
    input: z.object({ sessionId: z.string() }),
    output: TerminalSessionSchema,
  },
  'terminals.input': {
    input: z.object({ terminalId: z.string(), data: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.resize': {
    input: z.object({ terminalId: z.string(), cols: z.number(), rows: z.number() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.setTitle': {
    input: z.object({ terminalId: z.string(), title: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.generateName': {
    input: z.object({ terminalId: z.string() }),
    output: z.object({ name: z.string() }),
  },
  'terminals.updateDisplayOrders': {
    input: z.object({ orders: z.array(z.object({ id: z.string(), order: z.number() })) }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Settings ─────────────────────────────────────────────────
  'settings.get': {
    input: z.object({}),
    output: AppSettingsSchema,
  },
  'settings.save': {
    input: AppSettingsSchema.partial(),
    output: AppSettingsSchema,
  },

  // ── Dialogs ──────────────────────────────────────────────────
  'dialog.selectDirectory': {
    input: z.object({ title: z.string().optional() }),
    output: z.object({ path: z.string().nullable() }),
  },

  // ── App ──────────────────────────────────────────────────────
  'app.version': {
    input: z.object({}),
    output: z.object({ version: z.string() }),
  },
  'shell.openExternal': {
    input: z.object({ url: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Tab State ────────────────────────────────────────────────
  'tabState.get': {
    input: z.object({}),
    output: z.record(z.unknown()),
  },
  'tabState.save': {
    input: z.record(z.unknown()),
    output: z.object({ success: z.boolean() }),
  },
} as const;

// ─── Event Channels (main → renderer push) ──────────────────────
// Main process pushes updates; renderer subscribes via useIpcEvent

export const eventContract = {
  // ── Task Events ──────────────────────────────────────────────
  'tasks.onStatusChanged': {
    data: z.object({ taskId: z.string(), status: TaskStatusSchema, projectId: z.string() }),
  },
  'tasks.onLogAppended': {
    data: z.object({ taskId: z.string(), log: z.string() }),
  },
  'tasks.onProgress': {
    data: z.object({ taskId: z.string(), progress: z.number(), message: z.string().optional() }),
  },
  'tasks.onError': {
    data: z.object({ taskId: z.string(), error: z.string() }),
  },

  // ── Terminal Events ──────────────────────────────────────────
  'terminals.onOutput': {
    data: z.object({ terminalId: z.string(), data: z.string() }),
  },
  'terminals.onExit': {
    data: z.object({ terminalId: z.string(), code: z.number().optional() }),
  },
  'terminals.onTitleChange': {
    data: z.object({ terminalId: z.string(), title: z.string() }),
  },
  'terminals.onClaudeBusy': {
    data: z.object({ terminalId: z.string(), busy: z.boolean() }),
  },

  // ── Agent Events ─────────────────────────────────────────────
  'agents.onStatusChanged': {
    data: z.object({ agentId: z.string(), status: AgentStatusSchema, taskId: z.string() }),
  },

  // ── Settings Events ──────────────────────────────────────────
  'settings.onChanged': {
    data: AppSettingsSchema.partial(),
  },
} as const;

// ─── Type Utilities ─────────────────────────────────────────────
// These derive TypeScript types from the Zod contract above.
// Used by the IPC router, preload bridge, and React Query hooks.

export type InvokeContract = typeof invokeContract;
export type InvokeChannel = keyof InvokeContract;

export type EventContract = typeof eventContract;
export type EventChannel = keyof EventContract;

/** Extract the input type for an invoke channel */
export type InvokeInput<T extends InvokeChannel> =
  z.infer<InvokeContract[T]['input']>;

/** Extract the output type for an invoke channel */
export type InvokeOutput<T extends InvokeChannel> =
  z.infer<InvokeContract[T]['output']>;

/** Extract the event data type for an event channel */
export type EventData<T extends EventChannel> =
  z.infer<EventContract[T]['data']>;
