/**
 * Session Log Reader
 *
 * Reads Claude session JSONL files from ~/.claude/projects/{encodedPath}/
 * matching by session ID prefix from tracking events.
 */

import { closeSync, existsSync, openSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { SessionLogLine, SessionLogPage } from './types';

// ─── Path Encoding ────────────────────────────────────────────

/**
 * Encodes a project path for use as a directory name under ~/.claude/projects/.
 *
 * Windows: C:\Users\foo\app → C--Users-foo-app
 * Unix:    /Users/foo/app  → Users-foo-app
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath
    .replaceAll(/^[/\\]+/u, '') // strip leading separator(s)
    .replaceAll(/[/\\]/gu, '-') // replace all separators with -
    .replaceAll(':', '-'); // replace Windows drive colon
}

// ─── Session File Finder ──────────────────────────────────────

function getClaudeProjectsDir(): string {
  return join(homedir(), '.claude', 'projects');
}

/**
 * Finds a session JSONL file by matching the sid prefix.
 * Session files are named like <sid>.jsonl under ~/.claude/projects/{encodedPath}/.
 */
export function findSessionFile(
  projectPath: string,
  sid: string | null,
): string | null {
  if (!sid) return null;

  const encodedPath = encodeProjectPath(projectPath);
  const projectDir = join(getClaudeProjectsDir(), encodedPath);

  if (!existsSync(projectDir)) return null;

  const candidate = join(projectDir, `${sid}.jsonl`);
  if (existsSync(candidate)) return candidate;

  // Try prefix match — sid in tracking may be truncated
  try {
    const entries = readdirSync(projectDir);
    for (const entry of entries) {
      if (entry.endsWith('.jsonl') && entry.startsWith(sid)) {
        return join(projectDir, entry);
      }
    }
  } catch {
    // ignore read errors
  }

  return null;
}

// ─── Session Log Pagination ───────────────────────────────────

const PAGE_SIZE = 100;

interface BuildSessionLogOpts {
  projectPath: string;
  agentName: string;
  feature: string;
  /** Session ID prefix to locate the file, or null */
  sid: string | null;
  /** Byte offset cursor from previous page, or 0 for first page */
  cursor: number;
}

/** Finds the line index corresponding to a byte offset in an array of lines. */
function findStartLineIndex(allLines: string[], cursor: number): { index: number; bytePos: number } {
  let bytePos = 0;
  for (const [i, line] of allLines.entries()) {
    if (bytePos >= cursor) {
      return { index: i, bytePos };
    }
    bytePos += Buffer.byteLength(line, 'utf-8') + 1; // +1 for \n
  }
  return { index: allLines.length, bytePos };
}

/** Parses a single JSONL line into a SessionLogLine. */
function parseSessionLine(line: string, index: number): SessionLogLine {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    // keep parsed as null
  }
  return {
    index,
    raw: line,
    ts: typeof parsed?.ts === 'string' ? parsed.ts : undefined,
    type: typeof parsed?.type === 'string' ? parsed.type : undefined,
  };
}

/** Checks if any non-empty line exists after the given start index. */
function hasMoreLines(allLines: string[], fromIndex: number): boolean {
  for (let i = fromIndex; i < allLines.length; i++) {
    if (allLines[i].trim().length > 0) return true;
  }
  return false;
}

/** Reads a page of lines from startLineIndex, accumulating byte offset. */
function readPage(
  allLines: string[],
  startLineIndex: number,
  startBytePos: number,
): { pageLines: SessionLogLine[]; nextByteOffset: number; processedLines: number } {
  const pageLines: SessionLogLine[] = [];
  let nextByteOffset = startBytePos;
  let processedLines = 0;

  for (let i = startLineIndex; i < allLines.length && processedLines < PAGE_SIZE; i++) {
    const line = allLines[i];
    const lineByteLen = Buffer.byteLength(line, 'utf-8') + 1;

    if (line.trim().length === 0) {
      nextByteOffset += lineByteLen;
      continue;
    }

    pageLines.push(parseSessionLine(line, i));
    nextByteOffset += lineByteLen;
    processedLines++;
  }

  return { pageLines, nextByteOffset, processedLines };
}

/**
 * Reads a page of session log lines starting at `cursor` byte offset.
 * Returns cursor=-1 when there are no more lines.
 */
export function buildSessionLog(opts: BuildSessionLogOpts): SessionLogPage {
  const { projectPath, agentName, feature, sid, cursor } = opts;

  const empty: SessionLogPage = {
    agentName,
    feature,
    lines: [],
    total: 0,
    cursor: -1,
    sessionFile: null,
  };

  const sessionFile = findSessionFile(projectPath, sid);
  if (!sessionFile) return empty;

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(sessionFile);
  } catch {
    return empty;
  }

  if (stat.size === 0) return { ...empty, sessionFile };

  let fd: number;
  try {
    fd = openSync(sessionFile, 'r');
  } catch {
    return { ...empty, sessionFile };
  }

  try {
    const raw = readFileSync(sessionFile, 'utf-8');
    const allLines = raw.split('\n');
    const totalLines = allLines.filter((l) => l.trim().length > 0).length;

    const { index: startLineIndex, bytePos } = findStartLineIndex(allLines, cursor);
    const { pageLines, nextByteOffset, processedLines } = readPage(allLines, startLineIndex, bytePos);

    const afterPageIndex = startLineIndex + processedLines;
    const nextCursor = hasMoreLines(allLines, afterPageIndex) ? nextByteOffset : -1;

    return {
      agentName,
      feature,
      lines: pageLines,
      total: totalLines,
      cursor: nextCursor,
      sessionFile,
    };
  } finally {
    try {
      closeSync(fd);
    } catch {
      // ignore close errors
    }
  }
}
