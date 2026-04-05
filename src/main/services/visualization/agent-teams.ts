/**
 * Agent Teams Reader
 *
 * Reads .claude/tracking/ and .claude/progress/ directories from a project
 * to build structured agent team data for visualization.
 */

import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type {
  AgentStatus,
  AgentTaskInfo,
  AgentTeamsData,
  FeatureAgentData,
  TrackingEvent,
} from './types';

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

// ─── Tracking Index ───────────────────────────────────────────

interface TrackingIndexEntry {
  feature: string;
  status: string;
  branch: string | null;
  agentCount: number;
}

interface TrackingIndex {
  features: TrackingIndexEntry[];
}

export function readTrackingIndex(projectPath: string): TrackingIndex | null {
  const indexPath = join(projectPath, '.claude', 'tracking', 'index.json');
  if (!existsSync(indexPath)) return null;
  try {
    const raw = readFileSync(indexPath, 'utf-8');
    return JSON.parse(raw) as TrackingIndex;
  } catch {
    return null;
  }
}

// ─── Feature Manifest ─────────────────────────────────────────

interface ManifestAgent {
  status: string;
}

interface FeatureManifest {
  feature: string;
  agents: Record<string, ManifestAgent>;
}

export function readFeatureManifest(projectPath: string, feature: string): FeatureManifest | null {
  const manifestPath = join(projectPath, '.claude', 'tracking', feature, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as FeatureManifest;
  } catch {
    return null;
  }
}

// ─── JSONL Tail Reader ────────────────────────────────────────

const CHUNK_SIZE = 8192;
const MAX_LINES = 200;

/** Scans a buffer backward for newlines and returns the trim start offset, or -1. */
function scanChunkForBoundary(
  buf: Buffer,
  readSize: number,
  newlineCount: number,
): { boundary: number; newlineCount: number } {
  let count = newlineCount;
  for (let i = readSize - 1; i >= 0; i--) {
    if (buf[i] === 0x0a) {
      count++;
      if (count > MAX_LINES) {
        return { boundary: i + 1, newlineCount: count };
      }
    }
  }
  return { boundary: -1, newlineCount: count };
}

/** Parses raw JSONL text into TrackingEvent objects, skipping malformed lines. */
function parseJsonlLines(text: string): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue;
    try {
      events.push(JSON.parse(line) as TrackingEvent);
    } catch {
      // skip malformed lines
    }
  }
  return events;
}

/** Tail-reads fd backward in chunks, collecting buffers for the last MAX_LINES lines. */
function tailReadFd(fd: number, fileSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  let remaining = fileSize;
  let newlineCount = 0;

  while (remaining > 0) {
    const readSize = Math.min(CHUNK_SIZE, remaining);
    remaining -= readSize;
    const buf = Buffer.alloc(readSize);
    readSync(fd, buf, 0, readSize, remaining);

    const { boundary, newlineCount: updatedCount } = scanChunkForBoundary(
      buf,
      readSize,
      newlineCount,
    );
    newlineCount = updatedCount;

    if (boundary >= 0) {
      chunks.unshift(buf.subarray(boundary));
      break;
    }
    chunks.unshift(buf);
  }

  return chunks;
}

/**
 * Reads the last MAX_LINES lines of a JSONL file using backward seeks.
 * Avoids loading the full file into memory.
 */
export function parseEventsJsonl(filePath: string): TrackingEvent[] {
  if (!existsSync(filePath)) return [];

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(filePath);
  } catch {
    return [];
  }

  const fileSize = stat.size;
  if (fileSize === 0) return [];

  let fd: number;
  try {
    fd = openSync(filePath, 'r');
  } catch {
    return [];
  }

  try {
    const chunks = tailReadFd(fd, fileSize);
    const text = Buffer.concat(chunks).toString('utf-8');
    return parseJsonlLines(text);
  } finally {
    try {
      closeSync(fd);
    } catch {
      // ignore close errors
    }
  }
}

// ─── Per-Agent JSONL ──────────────────────────────────────────

interface AgentEvent {
  ts: string;
  type: string;
  sid: string;
}

function readAgentEvents(projectPath: string, feature: string, agentName: string): AgentEvent[] {
  const filePath = join(
    projectPath,
    '.claude',
    'tracking',
    feature,
    'agents',
    `${agentName}.jsonl`,
  );
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const events: AgentEvent[] = [];
    for (const line of lines) {
      try {
        events.push(JSON.parse(line) as AgentEvent);
      } catch {
        // skip
      }
    }
    return events;
  } catch {
    return [];
  }
}

// ─── Status Derivation ────────────────────────────────────────

const ACTIVE_WINDOW_MS = 120_000;

export function deriveAgentStatus(agentEvents: AgentEvent[]): AgentStatus {
  if (agentEvents.length === 0) return 'pending';

  // Find last agent.idle event
  let lastIdleTs: string | null = null;
  for (let i = agentEvents.length - 1; i >= 0; i--) {
    if (agentEvents[i].type === 'agent.idle') {
      lastIdleTs = agentEvents[i].ts;
      break;
    }
  }

  if (lastIdleTs !== null) {
    const age = Date.now() - new Date(lastIdleTs).getTime();
    if (age <= ACTIVE_WINDOW_MS) return 'active';
    return 'idle';
  }

  // Check for completion or error events
  const lastEvent = agentEvents.at(-1);
  if (!lastEvent) return 'pending';
  if (lastEvent.type === 'agent.completed' || lastEvent.type === 'task.completed') {
    return 'completed';
  }
  if (lastEvent.type === 'agent.error') return 'error';

  return 'pending';
}

// ─── Task File Finder ─────────────────────────────────────────

function findTaskFileContent(
  projectPath: string,
  feature: string,
  taskNumber: number | null,
): string | null {
  if (taskNumber === null) return null;
  const taskDir = join(projectPath, '.claude', 'progress', feature, 'tasks');
  if (!existsSync(taskDir)) return null;

  // Try common patterns: task-1.md, task-1a.md, task-1b.md
  const candidates = [
    join(taskDir, `task-${taskNumber}.md`),
    join(taskDir, `task-${taskNumber}a.md`),
    join(taskDir, `task-${taskNumber}b.md`),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        return readFileSync(c, 'utf-8');
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ─── Feature Builder ──────────────────────────────────────────

function buildFeatureData(
  projectPath: string,
  entry: TrackingIndexEntry,
): FeatureAgentData {
  const { feature, status, branch } = entry;

  const manifest = readFeatureManifest(projectPath, feature);
  const agentNames = manifest ? Object.keys(manifest.agents) : [];

  const eventsPath = join(projectPath, '.claude', 'tracking', feature, 'events.jsonl');
  const events = parseEventsJsonl(eventsPath);

  const tasks: AgentTaskInfo[] = agentNames.map((agentName) => {
    const taskNumber = agentNameToTaskNumber(agentName);
    const agentEvents = readAgentEvents(projectPath, feature, agentName);

    const lastEvent = agentEvents.at(-1) ?? null;
    const lastEventTs = lastEvent ? lastEvent.ts : null;
    const lastSid = lastEvent ? lastEvent.sid : null;

    const taskContent = findTaskFileContent(projectPath, feature, taskNumber);
    const parsed = taskContent ? parseTaskFile(taskContent) : null;

    const agentRole = parsed?.agentRole ?? null;
    const isGuardian =
      agentName.startsWith('guardian') || agentRole === 'codebase-guardian';

    return {
      agentName,
      taskNumber: parsed?.taskNumber ?? taskNumber,
      taskName: parsed?.taskName ?? null,
      agentRole,
      wave: parsed?.wave ?? null,
      blockedBy: parsed?.blockedBy ?? [],
      status: deriveAgentStatus(agentEvents),
      lastEventTs,
      lastSid,
      fileScope: parsed?.fileScope ?? [],
      eventCount: agentEvents.length,
      isGuardian,
    };
  });

  return {
    feature,
    status,
    branch: branch ?? null,
    agentCount: agentNames.length,
    tasks,
    events,
  };
}

// ─── Public API ───────────────────────────────────────────────

export function buildAgentTeamsData(projectPath: string): AgentTeamsData {
  const trackingDir = join(projectPath, '.claude', 'tracking');

  if (!existsSync(trackingDir)) {
    return { projectPath, features: [], hasTrackingDir: false };
  }

  const index = readTrackingIndex(projectPath);
  if (!index) {
    return { projectPath, features: [], hasTrackingDir: true };
  }

  const features: FeatureAgentData[] = [];
  for (const entry of index.features) {
    try {
      features.push(buildFeatureData(projectPath, entry));
    } catch {
      // Skip features that fail to load — graceful degradation
    }
  }

  return { projectPath, features, hasTrackingDir: true };
}
