/**
 * Import Parser
 *
 * Regex-based static import extractor and path resolver.
 * Reads source files and extracts all import/require/export-from specifiers,
 * then resolves them to absolute paths.
 *
 * Does NOT use ts.createProgram, ts-morph, or dependency-cruiser.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';

import type { PathConfig } from './types';

// ─── Constants ──────────────────────────────────────────────

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'out',
  'build',
  '.next',
  '.worktrees',
  'coverage',
]);

/** Resolution suffixes tried in order when a bare path has no extension. */
const RESOLUTION_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
] as const;

// ─── Regex Patterns ──────────────────────────────────────────

/** Matches: import X from '...', import type X from '...', import { X } from '...' */
const FROM_RE = /\bimport\s+(?:type\s+)?(?:[\s\S]*?\bfrom\s+)?['"]([^'"]+)['"]/gm;

/** Matches: import('...') */
const DYN_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Matches: require('...') */
const REQ_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Matches: export { X } from '...', export * from '...', export * as X from '...' */
const EXPORT_RE =
  /\bexport\s+(?:type\s+)?(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+['"]([^'"]+)['"]/gm;

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Runs a regex (with g flag) against source and returns all captured group[1] values.
 * Resets lastIndex before each call to ensure correctness.
 */
function matchAll(re: RegExp, src: string): string[] {
  re.lastIndex = 0;
  const results: string[] = [];
  let m = re.exec(src);
  while (m !== null) {
    if (m[1]) results.push(m[1]);
    m = re.exec(src);
  }
  return results;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Extracts all import specifier strings from a TypeScript/JavaScript source string.
 * Handles: static imports, type imports, dynamic imports, require(), export-from.
 */
export function extractImportSpecifiers(src: string): string[] {
  const seen = new Set<string>();
  const add = (s: string): void => {
    seen.add(s);
  };

  matchAll(FROM_RE, src).forEach(add);
  matchAll(DYN_RE, src).forEach(add);
  matchAll(REQ_RE, src).forEach(add);
  matchAll(EXPORT_RE, src).forEach(add);

  return [...seen];
}

/**
 * Reads tsconfig.json from the project root and extracts path aliases and baseUrl.
 * Returns empty config if tsconfig.json is missing or malformed.
 */
export function loadTsconfigPaths(projectRoot: string): PathConfig {
  const tsconfigPath = join(projectRoot, 'tsconfig.json');

  if (!existsSync(tsconfigPath)) {
    return { paths: {}, baseUrl: null };
  }

  try {
    const raw = readFileSync(tsconfigPath, 'utf-8');
    // Strip single-line comments and trailing commas (common in tsconfig.json)
    const noComments = raw.replaceAll(/\/\/[^\n]*/g, '');
    const stripped = noComments.replaceAll(/,\s*([}\]])/g, '$1');
    const parsed = JSON.parse(stripped) as {
      compilerOptions?: {
        paths?: Record<string, string[]>;
        baseUrl?: string;
      };
    };
    const opts = parsed.compilerOptions ?? {};
    const rawPaths = opts.paths ?? {};
    const rawBaseUrl = opts.baseUrl ?? null;

    // Resolve each path alias entry relative to tsconfig location
    const tsconfigDir = dirname(tsconfigPath);
    const resolvedPaths: Record<string, string[]> = {};
    for (const [alias, mappings] of Object.entries(rawPaths)) {
      // Strip trailing /* from alias (e.g. "@shared/*" → "@shared")
      const cleanAlias = alias.endsWith('/*') ? alias.slice(0, -2) : alias;
      resolvedPaths[cleanAlias] = mappings.map((m) => {
        const cleanMapping = m.endsWith('/*') ? m.slice(0, -2) : m;
        return resolve(tsconfigDir, cleanMapping);
      });
    }

    const baseUrl =
      rawBaseUrl === null ? null : resolve(tsconfigDir, rawBaseUrl);

    return { paths: resolvedPaths, baseUrl };
  } catch {
    return { paths: {}, baseUrl: null };
  }
}

/**
 * Attempts to resolve a non-relative specifier using tsconfig path aliases.
 * Returns:
 *   - a resolved absolute path if the alias matched and a file was found
 *   - `{ aliasMatched: true }` if the alias matched but no file was found
 *   - `null` if no alias matched
 */
function resolveViaAlias(
  specifier: string,
  pathConfig: PathConfig,
): string | { aliasMatched: true } | null {
  for (const [alias, targets] of Object.entries(pathConfig.paths)) {
    if (specifier === alias || specifier.startsWith(`${alias}/`)) {
      const rest = specifier.slice(alias.length);
      for (const target of targets) {
        const resolved = tryResolvePath(target + rest);
        if (resolved !== null) return resolved;
      }
      return { aliasMatched: true };
    }
  }
  return null;
}

/**
 * Resolves an import specifier to an absolute file path.
 * Returns null if the specifier refers to an external package (not a local file).
 *
 * Resolution order:
 * 1. Relative specifiers (starting with './' or '../') — resolved against fromFile dir
 * 2. Absolute specifiers — used as-is
 * 3. Alias specifiers — matched against tsconfig paths, resolved to absolute
 * 4. Anything else is treated as an external package → returns null
 */
export function resolveSpecifier(
  specifier: string,
  fromFile: string,
  pathConfig: PathConfig,
): string | null {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return tryResolvePath(resolve(dirname(fromFile), specifier));
  }

  if (isAbsolute(specifier)) {
    return tryResolvePath(specifier);
  }

  // Try path alias resolution
  const aliasResult = resolveViaAlias(specifier, pathConfig);
  if (aliasResult !== null) {
    // If aliasMatched is set, the alias matched but no file was found — treat as external
    return typeof aliasResult === 'string' ? aliasResult : null;
  }

  // Try baseUrl resolution
  if (pathConfig.baseUrl !== null) {
    const resolved = tryResolvePath(join(pathConfig.baseUrl, specifier));
    if (resolved !== null) return resolved;
  }

  // External package
  return null;
}

/**
 * Tries all resolution suffixes for a base path and returns the first match,
 * or null if no match is found.
 */
function tryResolvePath(base: string): string | null {
  for (const suffix of RESOLUTION_SUFFIXES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && SOURCE_EXTENSIONS.has(extname(candidate))) {
      return candidate;
    }
  }
  return null;
}

/**
 * Recursively collects all TypeScript/JavaScript source files under `dir`.
 * Skips node_modules, .git, dist, out, build, .next, .worktrees, and coverage.
 * Returns an array of absolute file paths.
 */
export function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (SOURCE_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}
