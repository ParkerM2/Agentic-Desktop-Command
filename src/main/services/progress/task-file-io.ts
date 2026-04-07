/**
 * Task File I/O
 *
 * Low-level utilities for reading and writing markdown files with YAML
 * frontmatter. Used by ProgressService to manage `progress/<slug>/` root files.
 *
 * No gray-matter dependency — implements a minimal YAML frontmatter parser
 * that handles simple key: value pairs (no nested objects, no arrays).
 */

import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Root File Names ──────────────────────────────────────────

/** Ordered list of candidate root file names for a task directory. */
const ROOT_FILE_CANDIDATES = ['task.md', 'description.md', 'ticket.md'] as const;

// ─── Frontmatter Read/Write ───────────────────────────────────

export interface FrontmatterResult {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Parse a raw YAML value string into its typed equivalent.
 * Handles booleans, numbers, quoted strings, and plain strings.
 */
function parseYamlValue(raw: string): unknown {
  const trimmed = raw.trim();

  // Quoted strings — strip surrounding quotes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Booleans
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Null / undefined
  if (trimmed === 'null' || trimmed === '~' || trimmed === '') return null;

  // Numbers
  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== '') return num;

  // Plain string
  return trimmed;
}

/**
 * Serialize a value to a YAML-safe inline string.
 */
function serializeYamlValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Quote if the value contains characters that could confuse a YAML parser
    if (value.includes(':') || value.includes('#') || value.includes('\n') || value === '') {
      const escaped = value.replaceAll('"', '\\"');
      return `"${escaped}"`;
    }
    return value;
  }
  // For any other serializable type (Date, etc.), convert via JSON or empty fallback
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
}

/**
 * Read a markdown file and split it into YAML frontmatter and body content.
 *
 * Accepts `---` delimiters at the very start of the file (with optional
 * Windows `\r\n` line endings).
 */
export async function readFrontmatter(filePath: string): Promise<FrontmatterResult> {
  const raw = await readFile(filePath, 'utf-8');

  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!frontmatterMatch) {
    return { frontmatter: {}, content: raw };
  }

  const yamlBlock = frontmatterMatch[1];
  const content = raw.slice(frontmatterMatch[0].length);

  const frontmatter: Record<string, unknown> = {};

  for (const line of yamlBlock.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    if (!key) continue;
    const valueRaw = line.slice(colonIdx + 1).trim();
    frontmatter[key] = parseYamlValue(valueRaw);
  }

  return { frontmatter, content };
}

/**
 * Write a markdown file with YAML frontmatter.
 * Overwrites the file atomically (single write call).
 */
export async function writeFrontmatter(
  filePath: string,
  frontmatter: Record<string, unknown>,
  content: string,
): Promise<void> {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    lines.push(`${key}: ${serializeYamlValue(value)}`);
  }

  lines.push('---');

  const body = content.startsWith('\n') ? content : `\n${content}`;
  const output = `${lines.join('\n')}${body}`;

  await writeFile(filePath, output, 'utf-8');
}

/**
 * Detect the root file within a task directory.
 *
 * Checks for `task.md`, `description.md`, and `ticket.md` in order,
 * returning the first one that exists. Returns `null` if none are found.
 */
export async function detectRootFile(dirPath: string): Promise<string | null> {
  for (const candidate of ROOT_FILE_CANDIDATES) {
    const filePath = join(dirPath, candidate);
    try {
      await access(filePath);
      return candidate;
    } catch {
      // File does not exist — try next candidate
    }
  }
  return null;
}
