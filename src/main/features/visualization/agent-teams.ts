/**
 * Agent Teams Reader
 *
 * Reads the `progress/` directory from a project and queries
 * AgentManagerService for live session state to build structured
 * agent team data for visualization.
 *
 * Replaces the legacy `tracking/` + JSONL approach.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type {
  AgentStatus,
  AgentTaskInfo,
  AgentTeamsData,
  FeatureAgentData,
} from './types';
import type { AgentManager } from '../../agent-host/agent-host-client';

// ─── Agent Name Helpers ───────────────────────────────────────

export function agentNameToTaskNumber(name: string): number | null {
  const m = /task-(\d+)/.exec(name);
  return m ? parseInt(m[1], 10) : null;
}

// ─── File Scope Extraction ────────────────────────────────────

export function extractFileScope(content: string): string[] {
  const filePaths: string[] = [];
  for (const section of ['## Files to Modify', '## Files to Create']) {
    const idx = content.indexOf(section);
    if (idx === -1) continue;
    const afterSection = content.slice(idx + section.length);
    const nextSection = afterSection.search(/^## /m);
    const sectionContent = nextSection === -1 ? afterSection : afterSection.slice(0, nextSection);
    for (const line of sectionContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('- ')) continue;
      const pathPart = trimmed.slice(2).split(' —')[0].split(' --')[0].trim();
      if (pathPart.length > 0 && pathPart.includes('.')) filePaths.push(pathPart);
    }
  }
  return [...new Set(filePaths)];
}

// ─── Task File Parser ─────────────────────────────────────────

interface ParsedTaskFile {
  taskNumber: number | null;
  taskName: string | null;
  agentRole: string | null;
  wave: number | null;
  blockedBy: number[];
  fileScope: string[];
}

export function parseTaskFile(content: string): ParsedTaskFile {
  const result: ParsedTaskFile = {
    taskNumber: null,
    taskName: null,
    agentRole: null,
    wave: null,
    blockedBy: [],
    fileScope: [],
  };

  // Extract frontmatter block
  const frontmatterMatch = /^---\n([\s\S]*?)\n---/.exec(content);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];

    const taskNumberMatch = /^taskNumber:\s*(\d+)/m.exec(fm);
    if (taskNumberMatch) result.taskNumber = parseInt(taskNumberMatch[1], 10);

    const agentRoleMatch = /^agentRole:\s*"?([^"\n]+)"?/m.exec(fm);
    if (agentRoleMatch) result.agentRole = agentRoleMatch[1].trim();

    const waveMatch = /^wave:\s*(\d+)/m.exec(fm);
    if (waveMatch) result.wave = parseInt(waveMatch[1], 10);

    const blockedByMatch = /^blockedBy:\s*\[([^\]]*)\]/m.exec(fm);
    if (blockedByMatch) {
      const items = blockedByMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      result.blockedBy = items.map(Number).filter((n) => !Number.isNaN(n));
    }
  }

  // Extract task name from heading: "# Task #N: <name>"
  const headingMatch = /^# Task #\d+:\s*(.+)$/m.exec(content);
  if (headingMatch) result.taskName = headingMatch[1].trim();

  // Extract file scope
  result.fileScope = extractFileScope(content);

  return result;
}

// ─── Progress Root File Reader ────────────────────────────────

const ROOT_FILE_CANDIDATES = ['task.md', 'description.md', 'ticket.md'] as const;

interface ProgressRootInfo {
  title: string;
  status: string;
  branch: string | null;
}

function readProgressRoot(taskDir: string, slug: string): ProgressRootInfo {
  for (const candidate of ROOT_FILE_CANDIDATES) {
    const filePath = join(taskDir, candidate);
    if (!existsSync(filePath)) continue;
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
      if (!frontmatterMatch) continue;

      const fm = frontmatterMatch[1];
      const titleMatch = /^title:\s*["']?(.+?)["']?\s*$/m.exec(fm);
      const statusMatch = /^status:\s*(\S+)/m.exec(fm);
      const branchMatch = /^branch:\s*(\S+)/m.exec(fm);

      return {
        title: titleMatch ? titleMatch[1].trim() : slug,
        status: statusMatch ? statusMatch[1].trim() : 'backlog',
        branch: branchMatch ? branchMatch[1].trim() : null,
      };
    } catch {
      // Try next candidate
    }
  }
  return { title: slug, status: 'backlog', branch: null };
}

// ─── Progress Directory Scanner ───────────────────────────────

interface ProgressEntry {
  slug: string;
  title: string;
  status: string;
  branch: string | null;
  taskDir: string;
}

function scanProgressDir(projectPath: string): ProgressEntry[] {
  const progressDir = join(projectPath, 'progress');
  if (!existsSync(progressDir)) return [];

  let entries: string[];
  try {
    entries = readdirSync(progressDir);
  } catch {
    return [];
  }

  const results: ProgressEntry[] = [];

  for (const entry of entries) {
    // Skip archived directory and non-directories
    if (entry === 'archived') continue;

    const taskDir = join(progressDir, entry);
    try {
      const s = statSync(taskDir);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }

    const { title, status, branch } = readProgressRoot(taskDir, entry);
    results.push({ slug: entry, title, status, branch, taskDir });
  }

  return results;
}

// ─── Task File Scanner ────────────────────────────────────────

function scanTaskFiles(taskDir: string): string[] {
  const tasksDir = join(taskDir, 'tasks');
  if (!existsSync(tasksDir)) return [];

  try {
    const files = readdirSync(tasksDir);
    return files.filter((f) => /^task-\d+.*\.md$/.test(f)).sort();
  } catch {
    return [];
  }
}

// ─── Session Status Mapper ────────────────────────────────────

type LiveSessions = ReturnType<AgentManager['listSessions']>;
type LiveSession = LiveSessions[number];

/**
 * Map AgentManagerService session status to visualization AgentStatus.
 *
 * AgentSession.status: 'running' | 'idle' | 'needs-attention' | 'failed' | 'completed'
 * AgentStatus (viz): 'pending' | 'active' | 'idle' | 'completed' | 'error' | 'killed'
 */
function sessionStatusToAgentStatus(sessionStatus: string): AgentStatus {
  switch (sessionStatus) {
    case 'running':
    case 'needs-attention': {
      return 'active';
    }
    case 'idle': {
      return 'idle';
    }
    case 'completed': {
      return 'completed';
    }
    case 'failed': {
      return 'error';
    }
    default: {
      return 'pending';
    }
  }
}

// ─── Single-Agent Task Node ───────────────────────────────────

function makeSingleAgentTask(opts: {
  agentName: string;
  taskName: string;
  agentRole: string;
  session: LiveSession | null | undefined;
  forceStatus?: AgentStatus;
}): AgentTaskInfo {
  const { agentName, taskName, agentRole, session, forceStatus } = opts;
  const status = forceStatus ?? (session ? sessionStatusToAgentStatus(session.status) : 'active');
  return {
    agentName,
    taskNumber: null,
    taskName,
    agentRole,
    wave: null,
    blockedBy: [],
    status,
    lastEventTs: session ? session.lastActivityAt : null,
    lastSid: session ? session.id : null,
    taskSlug: null,
    fileScope: [],
    eventCount: 0,
    isGuardian: false,
  };
}

// ─── Task File → AgentTaskInfo ────────────────────────────────

function parseTaskFileContent(taskFilePath: string): ParsedTaskFile | null {
  try {
    const content = readFileSync(taskFilePath, 'utf-8');
    return parseTaskFile(content);
  } catch {
    return null;
  }
}

function buildTaskInfoFromFile(
  taskDir: string,
  taskFile: string,
  slug: string,
  sessions: LiveSessions,
  teamSession: LiveSession | null | undefined,
  forceStatus?: AgentStatus,
): AgentTaskInfo {
  const taskFilePath = join(taskDir, 'tasks', taskFile);
  const parsed = parseTaskFileContent(taskFilePath);

  const taskNumber = parsed?.taskNumber ?? agentNameToTaskNumber(taskFile);
  const agentRole = parsed?.agentRole ?? null;
  const agentName = `task-${taskNumber ?? taskFile}`;
  const isGuardian = agentName.startsWith('guardian') || agentRole === 'codebase-guardian';

  let derivedStatus: AgentStatus;
  let lastEventTs: string | null = null;
  let lastSid: string | null = null;

  if (forceStatus === undefined) {
    const taskSessionName = `progress-task-${taskNumber ?? taskFile}-${slug}`;
    const matchedSession = sessions.find((s) => s.name === taskSessionName) ?? teamSession ?? null;
    derivedStatus = matchedSession ? sessionStatusToAgentStatus(matchedSession.status) : 'pending';
    lastEventTs = matchedSession ? matchedSession.lastActivityAt : null;
    lastSid = matchedSession ? matchedSession.id : null;
  } else {
    derivedStatus = forceStatus;
  }

  return {
    agentName,
    taskNumber: parsed?.taskNumber ?? taskNumber,
    taskName: parsed?.taskName ?? null,
    agentRole,
    wave: parsed?.wave ?? null,
    blockedBy: parsed?.blockedBy ?? [],
    status: derivedStatus,
    lastEventTs,
    lastSid,
    taskSlug: null,
    fileScope: parsed?.fileScope ?? [],
    eventCount: 0,
    isGuardian,
  };
}

// ─── Per-Status Task Builders ─────────────────────────────────

function buildResearchingTasks(sessions: LiveSessions, slug: string): AgentTaskInfo[] {
  const session = sessions.find((s) => s.name === `progress-research-${slug}`);
  return [makeSingleAgentTask({ agentName: 'research-agent', taskName: 'Research Agent', agentRole: 'researcher', session })];
}

function buildPlanningTasks(sessions: LiveSessions, slug: string): AgentTaskInfo[] {
  const session = sessions.find((s) => s.name === `progress-plan-${slug}`);
  return [makeSingleAgentTask({ agentName: 'planning-agent', taskName: 'Planning Agent', agentRole: 'planner', session })];
}

function buildCompletedSingleTasks(status: string): AgentTaskInfo[] {
  const isResearch = status === 'research_done';
  return [makeSingleAgentTask({
    agentName: isResearch ? 'research-agent' : 'planning-agent',
    taskName: isResearch ? 'Research Agent' : 'Planning Agent',
    agentRole: isResearch ? 'researcher' : 'planner',
    session: null,
    forceStatus: 'completed',
  })];
}

function buildExecutingTasks(
  taskDir: string,
  slug: string,
  sessions: LiveSessions,
): AgentTaskInfo[] {
  const taskFiles = scanTaskFiles(taskDir);
  const teamSession = sessions.find((s) => s.name === `progress-team-${slug}`);

  if (taskFiles.length === 0) {
    return [makeSingleAgentTask({
      agentName: 'team-lead',
      taskName: 'Team Lead',
      agentRole: 'team-lead',
      session: teamSession,
    })];
  }

  return taskFiles.map((taskFile) =>
    buildTaskInfoFromFile(taskDir, taskFile, slug, sessions, teamSession),
  );
}

function buildDoneTasks(taskDir: string): AgentTaskInfo[] {
  const taskFiles = scanTaskFiles(taskDir);
  return taskFiles.map((taskFile) =>
    buildTaskInfoFromFile(taskDir, taskFile, '', [], null, 'completed'),
  );
}

// ─── Feature Builder ──────────────────────────────────────────

function buildTasksForStatus(
  status: string,
  slug: string,
  taskDir: string,
  sessions: LiveSessions,
): AgentTaskInfo[] {
  switch (status) {
    case 'researching': {
      return buildResearchingTasks(sessions, slug);
    }
    case 'planning': {
      return buildPlanningTasks(sessions, slug);
    }
    case 'research_done':
    case 'plan_ready': {
      return buildCompletedSingleTasks(status);
    }
    case 'executing':
    case 'review': {
      return buildExecutingTasks(taskDir, slug, sessions);
    }
    case 'done': {
      return buildDoneTasks(taskDir);
    }
    default: {
      return [];
    }
  }
}

function buildFeatureData(
  entry: ProgressEntry,
  sessions: LiveSessions,
): FeatureAgentData {
  const { slug, status, branch, taskDir } = entry;

  const tasks = buildTasksForStatus(status, slug, taskDir, sessions);

  return {
    feature: slug,
    status,
    branch,
    agentCount: tasks.length,
    tasks,
    events: [],
  };
}

// ─── Public API ───────────────────────────────────────────────

export function buildAgentTeamsData(
  projectPath: string,
  agentManagerService: AgentManager,
): AgentTeamsData {
  const progressDir = join(projectPath, 'progress');

  if (!existsSync(progressDir)) {
    return { projectPath, features: [], hasTrackingDir: false };
  }

  const progressEntries = scanProgressDir(projectPath);
  if (progressEntries.length === 0) {
    return { projectPath, features: [], hasTrackingDir: true };
  }

  // Snapshot all live sessions once — avoids repeated listSessions() calls
  const sessions = agentManagerService.listSessions();

  const features: FeatureAgentData[] = [];
  for (const entry of progressEntries) {
    // Only show features that are in an active pipeline stage (skip backlog/archived/error)
    if (entry.status === 'backlog' || entry.status === 'archived') continue;

    try {
      features.push(buildFeatureData(entry, sessions));
    } catch {
      // Skip features that fail to load — graceful degradation
    }
  }

  return { projectPath, features, hasTrackingDir: true };
}
