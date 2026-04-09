/**
 * Codebase Graph Builder
 *
 * Builds a dependency graph for an arbitrary project by:
 * 1. Detecting the project framework from package.json
 * 2. Collecting all source files
 * 3. Parsing import specifiers via regex
 * 4. Resolving specifiers to absolute paths
 * 5. Grouping files by directory structure
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

import {
  collectSourceFiles,
  extractImportSpecifiers,
  loadTsconfigPaths,
  resolveSpecifier,
} from './import-parser';

import type { CodebaseEdge, CodebaseFile, CodebaseGraph } from './types';

// ─── Framework Detection ─────────────────────────────────────

/**
 * Detects the frontend/backend framework used in a project by inspecting package.json.
 * Returns one of: 'electron', 'nextjs', 'vite-spa', 'node-server', 'unknown'.
 */
export function detectFramework(projectPath: string): string {
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return 'unknown';

  try {
    const raw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if ('electron-vite' in allDeps || 'electron' in allDeps) return 'electron';
    if ('next' in allDeps) return 'nextjs';
    if ('vite' in allDeps) return 'vite-spa';
    if ('express' in allDeps || 'fastify' in allDeps || 'koa' in allDeps)
      return 'node-server';

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Returns the segment after a path prefix (e.g. "src/main/services/" → first dir name). */
function segmentAfter(p: string, prefix: string): string {
  return p.slice(prefix.length).split('/')[0] ?? 'unknown';
}

/**
 * Determines the file group for an electron-framework project.
 * Returns null if no electron-specific rule matches.
 */
function getElectronGroup(p: string): string | null {
  if (p.startsWith('src/renderer/features/')) {
    return `features/${segmentAfter(p, 'src/renderer/features/')}`;
  }
  if (p.startsWith('src/main/services/')) {
    return `main/services/${segmentAfter(p, 'src/main/services/')}`;
  }
  if (p.startsWith('src/main/ipc/')) return 'main/ipc';
  if (p.startsWith('src/main/bootstrap/')) return 'main/bootstrap';
  if (p.startsWith('src/main/')) return 'main';
  if (p.startsWith('src/shared/')) return 'shared';
  if (p.startsWith('src/preload/')) return 'preload';
  if (p.startsWith('src/renderer/')) {
    const subdir = segmentAfter(p, 'src/renderer/');
    return subdir ? `renderer/${subdir}` : 'renderer';
  }
  return null;
}

/**
 * Determines the display group for a file given a framework.
 *
 * For 'electron' framework:
 * - src/renderer/features/<name>/... → 'features/<name>'
 * - src/main/services/<name>/... → 'main/services/<name>'
 * - src/main/ipc/... → 'main/ipc'
 * - src/main/bootstrap/... → 'main/bootstrap'
 * - src/shared/... → 'shared'
 * - src/preload/... → 'preload'
 * - other src/renderer/... → 'renderer/<subdir>'
 * - anything else → 'other'
 */
export function getFileGroup(relativePath: string, framework: string): string {
  // Normalize separators to forward slashes
  const p = relativePath.replaceAll('\\', '/');

  if (framework === 'electron') {
    const group = getElectronGroup(p);
    if (group !== null) return group;
  }

  // Generic fallback: use top-level directory as group
  const parts = p.split('/');
  return parts.length > 1 && parts[0] ? parts[0] : 'other';
}

// ─── Graph Builder ───────────────────────────────────────────

/**
 * Builds a complete codebase dependency graph for the given project.
 *
 * Scans `{projectPath}/src/` (falls back to `{projectPath}/` if no src/ dir),
 * parses all import specifiers with regex, resolves them to absolute paths,
 * and groups files by framework-aware directory structure.
 *
 * Handles missing tsconfig.json, missing src/ dir, and empty projects gracefully —
 * returns an empty graph rather than throwing.
 */
export function buildCodebaseGraph(projectPath: string): CodebaseGraph {
  const startMs = Date.now();

  // Determine scan root: prefer src/ subdirectory
  const srcDir = join(projectPath, 'src');
  const scanRoot = existsSync(srcDir) ? srcDir : projectPath;

  // Detect framework
  const framework = detectFramework(projectPath);

  // Load tsconfig path aliases
  const pathConfig = loadTsconfigPaths(projectPath);

  // Collect all source files
  let allFiles: string[];
  try {
    allFiles = collectSourceFiles(scanRoot);
  } catch {
    allFiles = [];
  }

  if (allFiles.length === 0) {
    return {
      projectPath,
      framework,
      files: [],
      edges: [],
      groups: [],
      buildTimeMs: Date.now() - startMs,
    };
  }

  // Build a set for O(1) membership checks during resolution
  const fileSet = new Set(allFiles);

  // Accumulate import counts keyed by absolute path
  const importCounts = new Map<string, number>();
  for (const f of allFiles) {
    importCounts.set(f, 0);
  }

  // Parse imports and build edges
  const edges: CodebaseEdge[] = [];

  for (const filePath of allFiles) {
    let src: string;
    try {
      src = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const specifiers = extractImportSpecifiers(src);
    for (const specifier of specifiers) {
      const resolved = resolveSpecifier(specifier, filePath, pathConfig);
      if (resolved !== null && fileSet.has(resolved) && resolved !== filePath) {
        edges.push({ source: filePath, target: resolved });
        importCounts.set(resolved, (importCounts.get(resolved) ?? 0) + 1);
      }
    }
  }

  // Build file records
  const groupSet = new Set<string>();
  const files: CodebaseFile[] = allFiles.map((absPath) => {
    const rel = relative(projectPath, absPath).replaceAll('\\', '/');
    const group = getFileGroup(rel, framework);
    groupSet.add(group);

    return {
      path: absPath,
      relativePath: rel,
      fileName: basename(absPath),
      ext: extname(absPath),
      group,
      importCount: importCounts.get(absPath) ?? 0,
    };
  });

  return {
    projectPath,
    framework,
    files,
    edges,
    groups: [...groupSet],
    buildTimeMs: Date.now() - startMs,
  };
}
