/**
 * Agents IPC Contract
 *
 * Invoke and event channel definitions for agent sessions, orchestrator,
 * QA system, workflow, terminals, workspaces, devices, Hub connection,
 * and app-level operations.
 */

import { z } from 'zod';

import { TokenUsageSchema } from '../common/schemas';

import {
  AgentSessionSchema,
  AggregatedTokenUsageSchema,
  DeviceCapabilitiesSchema,
  DeviceSchema,
  DeviceTypeSchema,
  OrchestratorSessionSchema,
  QaModeSchema,
  QaReportSchema,
  QaResultSchema,
  QaSessionSchema,
  TerminalSessionSchema,
  WorkspaceSchema,
  WorkspaceSettingsSchema,
} from './schemas';

/** Invoke channels for agent session operations */
export const agentsInvoke = {
  'agents.list': {
    input: z.object({ projectId: z.string() }),
    output: z.array(AgentSessionSchema),
  },
  'agents.stop': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.pause': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.resume': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.listAll': {
    input: z.object({}),
    output: z.array(AgentSessionSchema),
  },
  'agents.getQueueStatus': {
    input: z.object({}),
    output: z.object({
      pending: z.array(
        z.object({
          id: z.string(),
          taskId: z.string(),
          projectId: z.string(),
          priority: z.number(),
          queuedAt: z.string(),
        }),
      ),
      running: z.array(z.string()),
      maxConcurrent: z.number(),
    }),
  },
  'agents.getTokenUsage': {
    input: z.object({}),
    output: AggregatedTokenUsageSchema,
  },
} as const;

/** Invoke channels for orchestrator operations */
export const orchestratorInvoke = {
  'agent.startPlanning': {
    input: z.object({
      taskId: z.string(),
      projectPath: z.string(),
      taskDescription: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.startExecution': {
    input: z.object({
      taskId: z.string(),
      projectPath: z.string(),
      taskDescription: z.string(),
      planRef: z.string().optional(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.killSession': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agent.restartFromCheckpoint': {
    input: z.object({ taskId: z.string(), projectPath: z.string() }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.getOrchestratorSession': {
    input: z.object({ taskId: z.string() }),
    output: OrchestratorSessionSchema.nullable(),
  },
  'agent.listOrchestratorSessions': {
    input: z.object({}),
    output: z.array(OrchestratorSessionSchema),
  },
} as const;

/** Invoke channels for QA operations */
export const qaInvoke = {
  'qa.startQuiet': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'qa.startFull': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'qa.getReport': {
    input: z.object({ taskId: z.string() }),
    output: QaReportSchema.nullable(),
  },
  'qa.getSession': {
    input: z.object({ taskId: z.string() }),
    output: QaSessionSchema.nullable(),
  },
  'qa.cancel': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for workflow operations */
export const workflowInvoke = {
  'workflow.watchProgress': {
    input: z.object({ projectPath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'workflow.stopWatching': {
    input: z.object({ projectPath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'workflow.launch': {
    input: z.object({
      taskDescription: z.string(),
      projectPath: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), pid: z.number() }),
  },
  'workflow.isRunning': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ running: z.boolean() }),
  },
  'workflow.stop': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ stopped: z.boolean() }),
  },
} as const;

/** Invoke channels for terminal operations */
export const terminalsInvoke = {
  'terminals.list': {
    input: z.object({ projectPath: z.string().optional() }),
    output: z.array(TerminalSessionSchema),
  },
  'terminals.create': {
    input: z.object({ cwd: z.string(), projectPath: z.string().optional() }),
    output: TerminalSessionSchema,
  },
  'terminals.close': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.sendInput': {
    input: z.object({ sessionId: z.string(), data: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.resize': {
    input: z.object({ sessionId: z.string(), cols: z.number(), rows: z.number() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.invokeClaudeCli': {
    input: z.object({ sessionId: z.string(), cwd: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for workspace operations */
export const workspacesInvoke = {
  'workspaces.list': {
    input: z.object({}),
    output: z.array(WorkspaceSchema),
  },
  'workspaces.create': {
    input: z.object({ name: z.string(), description: z.string().optional() }),
    output: WorkspaceSchema,
  },
  'workspaces.update': {
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      hostDeviceId: z.string().optional(),
      settings: WorkspaceSettingsSchema.partial().optional(),
    }),
    output: WorkspaceSchema,
  },
  'workspaces.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for device operations */
export const devicesInvoke = {
  'devices.list': {
    input: z.object({}),
    output: z.array(DeviceSchema),
  },
  'devices.register': {
    input: z.object({
      machineId: z.string(),
      deviceName: z.string(),
      deviceType: DeviceTypeSchema,
      capabilities: DeviceCapabilitiesSchema,
      appVersion: z.string(),
    }),
    output: DeviceSchema,
  },
  'devices.heartbeat': {
    input: z.object({ deviceId: z.string() }),
    output: z.object({ success: z.boolean(), lastSeen: z.string() }),
  },
  'devices.update': {
    input: z.object({
      deviceId: z.string(),
      deviceName: z.string().optional(),
      nickname: z.string().optional(),
      capabilities: DeviceCapabilitiesSchema.optional(),
      isOnline: z.boolean().optional(),
      appVersion: z.string().optional(),
    }),
    output: DeviceSchema,
  },
} as const;

/** Invoke channels for Hub connection operations */
export const hubInvoke = {
  'hub.connect': {
    input: z.object({ url: z.string(), apiKey: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'hub.disconnect': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'hub.getStatus': {
    input: z.object({}),
    output: z.object({
      status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
      hubUrl: z.string().optional(),
      enabled: z.boolean(),
      lastConnected: z.string().optional(),
      pendingMutations: z.number(),
    }),
  },
  'hub.sync': {
    input: z.object({}),
    output: z.object({ syncedCount: z.number(), pendingCount: z.number() }),
  },
  'hub.getConfig': {
    input: z.object({}),
    output: z.object({
      hubUrl: z.string().optional(),
      enabled: z.boolean(),
      lastConnected: z.string().optional(),
    }),
  },
  'hub.removeConfig': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'hub.ws.status': {
    input: z.object({}),
    output: z.object({
      status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
      lastConnectedAt: z.string().nullable(),
      reconnectAttempts: z.number(),
      error: z.string().nullable(),
    }),
  },
} as const;

/** Invoke channels for app-level operations */
export const appInvoke = {
  'app.getVersion': {
    input: z.object({}),
    output: z.object({ version: z.string() }),
  },
  'app.checkClaudeAuth': {
    input: z.object({}),
    output: z.object({
      installed: z.boolean(),
      authenticated: z.boolean(),
      version: z.string().optional(),
    }),
  },
  'app.getOAuthStatus': {
    input: z.object({ provider: z.string() }),
    output: z.object({
      configured: z.boolean(),
      authenticated: z.boolean(),
    }),
  },
  'app.setOpenAtLogin': {
    input: z.object({ enabled: z.boolean() }),
    output: z.object({ success: z.boolean() }),
  },
  'app.getOpenAtLogin': {
    input: z.object({}),
    output: z.object({ enabled: z.boolean() }),
  },
  'app.checkForUpdates': {
    input: z.object({}),
    output: z.object({
      updateAvailable: z.boolean(),
      version: z.string().optional(),
    }),
  },
  'app.downloadUpdate': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'app.quitAndInstall': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'app.getUpdateStatus': {
    input: z.object({}),
    output: z.object({
      checking: z.boolean(),
      updateAvailable: z.boolean(),
      downloading: z.boolean(),
      downloaded: z.boolean(),
      version: z.string().optional(),
      error: z.string().optional(),
    }),
  },
} as const;

/** Event channels for agent-related events */
export const agentsEvents = {
  'event:agent.statusChanged': {
    payload: z.object({ agentId: z.string(), status: z.string(), taskId: z.string() }),
  },
  'event:agent.log': {
    payload: z.object({ agentId: z.string(), message: z.string() }),
  },
  'event:agent.queueChanged': {
    payload: z.object({
      pending: z.number(),
      running: z.number(),
      maxConcurrent: z.number(),
    }),
  },
  'event:agent.tokenUsage': {
    payload: z.object({
      agentId: z.string(),
      usage: TokenUsageSchema,
    }),
  },
} as const;

/** Event channels for terminal-related events */
export const terminalEvents = {
  'event:terminal.output': {
    payload: z.object({ sessionId: z.string(), data: z.string() }),
  },
  'event:terminal.closed': {
    payload: z.object({ sessionId: z.string() }),
  },
  'event:terminal.titleChanged': {
    payload: z.object({ sessionId: z.string(), title: z.string() }),
  },
} as const;

/** Event channels for app-related events */
export const appEvents = {
  'event:app.updateAvailable': {
    payload: z.object({ version: z.string() }),
  },
  'event:app.updateDownloaded': {
    payload: z.object({ version: z.string() }),
  },
} as const;

/** Event channels for orchestrator-related events */
export const orchestratorEvents = {
  'event:agent.orchestrator.progress': {
    payload: z.object({
      taskId: z.string(),
      type: z.string(),
      data: z.record(z.string(), z.unknown()),
      timestamp: z.string(),
    }),
  },
  'event:agent.orchestrator.planReady': {
    payload: z.object({
      taskId: z.string(),
      planSummary: z.string(),
      planFilePath: z.string(),
    }),
  },
  'event:agent.orchestrator.stopped': {
    payload: z.object({
      taskId: z.string(),
      reason: z.string(),
      exitCode: z.number(),
    }),
  },
  'event:agent.orchestrator.error': {
    payload: z.object({
      taskId: z.string(),
      error: z.string(),
    }),
  },
  'event:agent.orchestrator.heartbeat': {
    payload: z.object({
      taskId: z.string(),
      timestamp: z.string(),
    }),
  },
  'event:agent.orchestrator.watchdogAlert': {
    payload: z.object({
      type: z.enum(['warning', 'stale', 'dead', 'auth_failed']),
      sessionId: z.string(),
      taskId: z.string(),
      message: z.string(),
      suggestedAction: z.enum(['restart_checkpoint', 'restart_fresh', 'mark_error', 'retry_auth']),
      timestamp: z.string(),
    }),
  },
} as const;

/** Event channels for QA-related events */
export const qaEvents = {
  'event:qa.started': {
    payload: z.object({
      taskId: z.string(),
      mode: QaModeSchema,
    }),
  },
  'event:qa.progress': {
    payload: z.object({
      taskId: z.string(),
      step: z.string(),
      total: z.number(),
      current: z.number(),
    }),
  },
  'event:qa.completed': {
    payload: z.object({
      taskId: z.string(),
      result: QaResultSchema,
      issueCount: z.number(),
    }),
  },
} as const;

/** Event channels for Hub connection events */
export const hubEvents = {
  'event:hub.connectionChanged': {
    payload: z.object({
      status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
    }),
  },
  'event:hub.syncCompleted': {
    payload: z.object({ entities: z.array(z.string()), syncedCount: z.number() }),
  },
  'event:hub.devices.online': {
    payload: z.object({ deviceId: z.string(), name: z.string() }),
  },
  'event:hub.devices.offline': {
    payload: z.object({ deviceId: z.string() }),
  },
  'event:hub.workspaces.updated': {
    payload: z.object({ workspaceId: z.string() }),
  },
  'event:hub.projects.updated': {
    payload: z.object({ projectId: z.string() }),
  },
} as const;
