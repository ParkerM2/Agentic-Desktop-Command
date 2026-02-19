/**
 * Agents IPC Schemas
 *
 * Zod schemas for orchestrator sessions, QA system, workflow,
 * terminals, and workspaces/devices.
 */

import { z } from 'zod';

// ── Agent Orchestrator Schemas ──────────────────────────────────

export const AgentPhaseSchema = z.enum(['planning', 'executing', 'qa']);

export const AgentSessionStatusSchema = z.enum([
  'spawning',
  'active',
  'completed',
  'error',
  'killed',
]);

export const OrchestratorSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  pid: z.number(),
  status: AgentSessionStatusSchema,
  phase: AgentPhaseSchema,
  spawnedAt: z.string(),
  lastHeartbeat: z.string(),
  progressFile: z.string(),
  logFile: z.string(),
  hooksConfigPath: z.string(),
  exitCode: z.number().nullable(),
  projectPath: z.string(),
  command: z.string(),
});

// ── QA System Schemas ───────────────────────────────────────────

export const QaModeSchema = z.enum(['quiet', 'full']);

export const QaSessionStatusSchema = z.enum([
  'building',
  'launching',
  'testing',
  'completed',
  'error',
]);

export const QaVerificationResultSchema = z.enum(['pass', 'fail']);

export const QaVerificationSuiteSchema = z.object({
  lint: QaVerificationResultSchema,
  typecheck: QaVerificationResultSchema,
  test: QaVerificationResultSchema,
  build: QaVerificationResultSchema,
  docs: QaVerificationResultSchema,
});

export const QaIssueSeveritySchema = z.enum(['critical', 'major', 'minor', 'cosmetic']);

export const QaIssueSchema = z.object({
  severity: QaIssueSeveritySchema,
  category: z.string(),
  description: z.string(),
  screenshot: z.string().optional(),
  location: z.string().optional(),
});

export const QaScreenshotSchema = z.object({
  label: z.string(),
  path: z.string(),
  timestamp: z.string(),
  annotated: z.boolean(),
});

export const QaResultSchema = z.enum(['pass', 'fail', 'warnings']);

export const QaReportSchema = z.object({
  result: QaResultSchema,
  checksRun: z.number(),
  checksPassed: z.number(),
  issues: z.array(QaIssueSchema),
  verificationSuite: QaVerificationSuiteSchema,
  screenshots: z.array(QaScreenshotSchema),
  duration: z.number(),
});

export const QaSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  mode: QaModeSchema,
  status: QaSessionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  report: QaReportSchema.optional(),
  screenshots: z.array(z.string()),
  agentSessionId: z.string().optional(),
});

// ── Terminal Schemas ────────────────────────────────────────────

export const TerminalSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cwd: z.string(),
  projectPath: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

// ── Workspace / Device Schemas ──────────────────────────────────

export const WorkspaceSettingsSchema = z.object({
  autoStart: z.boolean(),
  maxConcurrent: z.number(),
  defaultBranch: z.string(),
});

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  hostDeviceId: z.string().optional(),
  settings: WorkspaceSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DeviceCapabilitiesSchema = z.object({
  canExecute: z.boolean(),
  repos: z.array(z.string()),
});

export const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'web']);

export const DeviceSchema = z.object({
  id: z.string(),
  machineId: z.string().optional(),
  userId: z.string(),
  deviceType: DeviceTypeSchema,
  deviceName: z.string(),
  nickname: z.string().optional(),
  capabilities: DeviceCapabilitiesSchema,
  isOnline: z.boolean(),
  lastSeen: z.string().optional(),
  appVersion: z.string().optional(),
  createdAt: z.string(),
});
