/**
 * Task File Parser
 *
 * Parses `.claude/progress/<slug>/tasks/task-*.md` files into TaskProgress objects.
 * Extracts YAML frontmatter (taskNumber, taskName, status) and body markdown
 * (acceptance criteria checklist) into typed structures.
 *
 * Handles missing/malformed input gracefully — returns defaults, never throws.
 */

import type { PhaseStatus, TaskCriterion, TaskPhase, TaskProgress } from '@shared/types/agent-dashboard';

// ─── Frontmatter Parsing ───────────────────────────────────

interface TaskFrontmatter {
  taskNumber: number;
  taskName: string;
  status: string;
}

function parseFrontmatter(content: string): TaskFrontmatter {
  const defaults: TaskFrontmatter = {
    taskNumber: 0,
    taskName: 'Unknown Task',
    status: 'pending',
  };

  const match = /^---\r?\n([\S\s]*?)\r?\n---/.exec(content);
  if (!match) {
    return defaults;
  }

  const fields: Partial<Record<string, string>> = {};
  const yaml = match[1];
  for (const line of yaml.split(/\r?\n/)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) {
      fields[key] = value;
    }
  }

  const taskNumber = Number.parseInt(fields.taskNumber ?? '0', 10);

  return {
    taskNumber: Number.isNaN(taskNumber) ? 0 : taskNumber,
    taskName: fields.taskName ?? defaults.taskName,
    status: fields.status ?? defaults.status,
  };
}

// ─── Acceptance Criteria Parsing ───────────────────────────

function parseAcceptanceCriteria(content: string): TaskCriterion[] {
  const criteria: TaskCriterion[] = [];

  // Find the ## Acceptance Criteria section
  const sectionMatch = /## Acceptance Criteria\s*\n([\s\S]*?)(?=\n##\s|\n---|\s*$)/.exec(content);
  if (!sectionMatch) {
    return criteria;
  }

  const section = sectionMatch[1];
  const checklistRegex = /^-\s+\[([ xX])\]\s+(.+)$/gm;
  let match: RegExpExecArray | null = checklistRegex.exec(section);

  while (match !== null) {
    criteria.push({
      text: match[2].trim(),
      met: match[1] !== ' ',
    });
    match = checklistRegex.exec(section);
  }

  return criteria;
}

// ─── Phase Derivation ──────────────────────────────────────

const DEFAULT_PHASES: readonly string[] = [
  'Load rules + read task file',
  'Write execution plan',
  'Execute plan',
  'Self-review + build',
  'Report to team leader',
];

function derivePhases(status: string): TaskPhase[] {
  let phaseStatus: PhaseStatus;

  switch (status) {
    case 'completed':
      phaseStatus = 'completed';
      break;
    case 'failed':
      phaseStatus = 'completed';
      break;
    case 'in-progress':
      phaseStatus = 'in-progress';
      break;
    default:
      phaseStatus = 'pending';
  }

  if (phaseStatus === 'completed') {
    return DEFAULT_PHASES.map((name) => ({ name, status: 'completed' as PhaseStatus }));
  }

  if (phaseStatus === 'pending') {
    return DEFAULT_PHASES.map((name) => ({ name, status: 'pending' as PhaseStatus }));
  }

  // in-progress: first phase completed, second in-progress, rest pending
  return DEFAULT_PHASES.map((name, index) => {
    if (index === 0) {
      return { name, status: 'completed' as PhaseStatus };
    }
    if (index === 1) {
      return { name, status: 'in-progress' as PhaseStatus };
    }
    return { name, status: 'pending' as PhaseStatus };
  });
}

// ─── Public API ────────────────────────────────────────────

/**
 * Parse a task file's content into a TaskProgress object.
 * Returns a valid TaskProgress with defaults for any missing/malformed data.
 */
export function parseTaskFile(content: string): TaskProgress {
  const frontmatter = parseFrontmatter(content);
  const acceptanceCriteria = parseAcceptanceCriteria(content);
  const phases = derivePhases(frontmatter.status);

  return {
    taskNumber: frontmatter.taskNumber,
    taskName: frontmatter.taskName,
    phases,
    acceptanceCriteria,
  };
}

/**
 * Extract the task number from a task filename (e.g., "task-11.md" → 11).
 * Returns null if the filename doesn't match the expected pattern.
 */
export function extractTaskNumber(filename: string): number | null {
  const match = /^task-(\d+)\.md$/.exec(filename);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}
