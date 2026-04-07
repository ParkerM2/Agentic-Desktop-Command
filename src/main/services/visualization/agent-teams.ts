/**
 * Agent Teams Reader
 *
 * Reads the progress/ directory from a project to build structured
 * agent team data for visualization. Replaces the old tracking/-based
 * implementation with the progress-driven task pipeline.
 *
 * Data sources:
 * - progress/<slug>/  — task directories (frontmatter status)
 * - progress/<slug>/tasks/task-*.md  — agent task files (executing state)
 *
 * Status mapping to visualization nodes:
 * - researching      → single "Research Agent" node (active)
 * - planning         → single "Planning Agent" node (active)
 * - research_done    → single "Research Agent" node (completed)
 * - plan_ready       → single "Planning Agent" node (completed)
 * - executing/review → FeatureGroup with AgentTask children from task files
 * - done             → FeatureGroup with all agents completed
 * - backlog/error    → FeatureGroup with no agent children
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type {
  AgentStatus,
  AgentTaskInfo,
  AgentTeamsData,
  FeatureAgentData,
} from './types';

// ─── Constants ───────────────────────────────────────────────

/** Directories inside progress/ to skip when scanning for features. */
const SKIP_DIRS = new Set(['archived']);

/** Root file candidates in order of preference (same as task-file-io). */
const ROOT_FILE_CANDIDATES = ['task.md', 'description.md', 'ticket.md'] as const;

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
  status: string | null;
}

export function parseTaskFile(content: string): ParsedTaskFile {
  const result: ParsedTaskFile = {
    taskNumber: null,
    taskName: null,
    agentRole: null,
    wave: null,
    blockedBy: [],
    fileScope: [],
    status: null,
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

    const statusMatch = /^status:\s*"?([^"\n]+)"?/m.exec(fm);
    if (statusMatch) result.status = statusMatch[1].trim();
  }

  // Extract task name from heading: "# Task #N: <name>" or frontmatter title
  const headingMatch = /^# Task #\d+:\s*(.+)$/m.exec(content);
  if (headingMatch) {
    result.taskName = headingMatch[1].trim();
  } else if (frontmatterMatch) {
    const titleMatch = /^title:\s*"?([^"\n]+)"?/m.exec(frontmatterMatch[1]);
    if (titleMatch) result.taskName = titleMatch[1].trim();
  }

  // Extract file scope
  result.fileScope = extractFileScope(content);

  return result;
}

// ─── Frontmatter Reader (sync) ───────────────────────────────

interface FrontmatterData {
  title: string;
  status: string;
  description: string;
}

/**
 * Reads a markdown file's YAML frontmatter synchronously.
 * Returns extracted title, status, and description fields.
 */
function readRootFrontmatter(filePath: string): FrontmatterData {
  const defaults: FrontmatterData = { title: '', status: 'backlog', description: '' };

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
    if (!match) return defaults;

    const yaml = match[1];
    const result = { ...defaults };

    const titleMatch = /^title:\s*"?([^"\n]+)"?/m.exec(yaml);
    if (titleMatch) result.title = titleMatch[1].trim();

    const statusMatch = /^status:\s*"?([^"\n]+)"?/m.exec(yaml);
    if (statusMatch) result.status = statusMatch[1].trim();

    const descMatch = /^description:\s*"?([^"\n]+)"?/m.exec(yaml);
    if (descMatch) result.description = descMatch[1].trim();

    return result;
  } catch {
    return defaults;
  }
}

// ─── Progress Directory Scanner ──────────────────────────────

interface ProgressEntry {
  slug: string;
  title: string;
  status: string;
  description: string;
  hasTaskFiles: boolean;
  taskFileCount: number;
}

/**
 * Detects the root file for a progress task directory (sync).
 * Returns the filename if found, null otherwise.
 */
function detectRootFileSync(dirPath: string): string | null {
  for (const candidate of ROOT_FILE_CANDIDATES) {
    if (existsSync(join(dirPath, candidate))) return candidate;
  }
  return null;
}

/**
 * Scans progress/ for non-archived task directories and reads
 * their root file frontmatter to get slug, title, and status.
 */
function scanProgressDir(progressDir: string): ProgressEntry[] {
  if (!existsSync(progressDir)) return [];

  let entries: string[];
  try {
    entries = readdirSync(progressDir);
  } catch {
    return [];
  }

  const results: ProgressEntry[] = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;

    const entryPath = join(progressDir, entry);
    try {
      const s = statSync(entryPath);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }

    const rootFile = detectRootFileSync(entryPath);
    let frontmatter: FrontmatterData = { title: entry, status: 'backlog', description: '' };

    if (rootFile) {
      frontmatter = readRootFrontmatter(join(entryPath, rootFile));
    }

    // Check for tasks/ subdirectory
    const tasksDir = join(entryPath, 'tasks');
    let taskFileCount = 0;

    if (existsSync(tasksDir)) {
      try {
        const taskFiles = readdirSync(tasksDir);
        taskFileCount = taskFiles.filter((f) => /^task-\d+/.test(f) && f.endsWith('.md')).length;
      } catch {
        // Ignore — default to 0
      }
    }

    // Status reconciliation: bump status if directory contents show more progress
    let status = frontmatter.status;
    const hasResearch = existsSync(join(entryPath, 'research', 'research.md'));
    const hasPlan = existsSync(join(entryPath, 'plans', 'plan.md'));

    if (hasResearch && statusRank(status) < statusRank('research_done')) {
      status = 'research_done';
    }
    if (hasPlan && statusRank(status) < statusRank('plan_ready')) {
      status = 'plan_ready';
    }
    if (taskFileCount > 0 && statusRank(status) < statusRank('executing')) {
      status = 'executing';
    }

    results.push({
      slug: entry,
      title: frontmatter.title || entry,
      status,
      description: frontmatter.description,
      hasTaskFiles: taskFileCount > 0,
      taskFileCount,
    });
  }

  return results;
}

// ─── Status Helpers ──────────────────────────────────────────

const STATUS_RANK: Record<string, number> = {
  backlog: 0,
  researching: 1,
  research_done: 2,
  planning: 3,
  plan_ready: 4,
  executing: 5,
  review: 6,
  done: 7,
  archived: 8,
  error: 9,
};

function statusRank(status: string): number {
  return STATUS_RANK[status] ?? 0;
}

// ─── Single-Phase Node Builder ───────────────────────────────

/**
 * Creates a single AgentTaskInfo node for phases that have one agent
 * (research, planning). The node label and role reflect the phase.
 */
function buildSinglePhaseNode(
  phase: 'research' | 'planning',
  isCompleted: boolean,
): AgentTaskInfo {
  const labels: Record<string, string> = {
    research: 'Research Agent',
    planning: 'Planning Agent',
  };

  const agentStatus: AgentStatus = isCompleted ? 'completed' : 'active';

  return {
    agentName: `${phase}-agent`,
    taskNumber: null,
    taskName: labels[phase],
    agentRole: phase,
    wave: null,
    blockedBy: [],
    status: agentStatus,
    lastEventTs: null,
    lastSid: null,
    fileScope: [],
    eventCount: 0,
    isGuardian: false,
  };
}

// ─── Task File Reader ────────────────────────────────────────

/**
 * Reads all task-*.md files from progress/<slug>/tasks/ and converts
 * them to AgentTaskInfo nodes for visualization.
 */
function readTaskFiles(
  progressDir: string,
  slug: string,
  featureStatus: string,
): AgentTaskInfo[] {
  const tasksDir = join(progressDir, slug, 'tasks');
  if (!existsSync(tasksDir)) return [];

  let files: string[];
  try {
    files = readdirSync(tasksDir);
  } catch {
    return [];
  }

  const taskFiles = files
    .filter((f) => /^task-\d+/.test(f) && f.endsWith('.md'))
    .sort();

  const tasks: AgentTaskInfo[] = [];

  for (const fileName of taskFiles) {
    const filePath = join(tasksDir, fileName);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const parsed = parseTaskFile(content);

    // Derive task number from filename if not in frontmatter
    const taskNumber = parsed.taskNumber ?? agentNameToTaskNumber(fileName);

    // Derive agent name from filename
    const agentName = fileName.replace(/\.md$/, '');

    // Map task status to AgentStatus
    let status: AgentStatus;
    if (featureStatus === 'done') {
      status = 'completed';
    } else if (parsed.status === 'done' || parsed.status === 'completed') {
      status = 'completed';
    } else if (parsed.status === 'error') {
      status = 'error';
    } else if (parsed.status === 'in_progress' || parsed.status === 'active') {
      status = 'active';
    } else {
      status = 'pending';
    }

    const agentRole = parsed.agentRole ?? null;
    const isGuardian =
      agentName.startsWith('guardian') || agentRole === 'codebase-guardian';

    tasks.push({
      agentName,
      taskNumber,
      taskName: parsed.taskName ?? null,
      agentRole,
      wave: parsed.wave ?? null,
      blockedBy: parsed.blockedBy,
      status,
      lastEventTs: null,
      lastSid: null,
      fileScope: parsed.fileScope,
      eventCount: 0,
      isGuardian,
    });
  }

  return tasks;
}

// ─── Feature Builder ──────────────────────────────────────────

function buildFeatureData(
  progressDir: string,
  entry: ProgressEntry,
): FeatureAgentData {
  const { slug, status } = entry;

  let tasks: AgentTaskInfo[];

  switch (status) {
    case 'researching': {
      tasks = [buildSinglePhaseNode('research', false)];
      break;
    }
    case 'research_done': {
      tasks = [buildSinglePhaseNode('research', true)];
      break;
    }
    case 'planning': {
      tasks = [buildSinglePhaseNode('planning', false)];
      break;
    }
    case 'plan_ready': {
      tasks = [buildSinglePhaseNode('planning', true)];
      break;
    }
    case 'executing':
    case 'review':
    case 'done': {
      tasks = readTaskFiles(progressDir, slug, status);
      break;
    }
    default: {
      // backlog, error, archived — no agent nodes
      tasks = [];
      break;
    }
  }

  return {
    feature: slug,
    status,
    branch: null,
    agentCount: tasks.length,
    tasks,
    events: [],
  };
}

// ─── Public API ───────────────────────────────────────────────

export function buildAgentTeamsData(projectPath: string): AgentTeamsData {
  const progressDir = join(projectPath, 'progress');

  if (!existsSync(progressDir)) {
    return { projectPath, features: [], hasTrackingDir: false };
  }

  const entries = scanProgressDir(progressDir);
  if (entries.length === 0) {
    return { projectPath, features: [], hasTrackingDir: true };
  }

  const features: FeatureAgentData[] = [];
  for (const entry of entries) {
    try {
      features.push(buildFeatureData(progressDir, entry));
    } catch {
      // Skip features that fail to load — graceful degradation
    }
  }

  return { projectPath, features, hasTrackingDir: true };
}
