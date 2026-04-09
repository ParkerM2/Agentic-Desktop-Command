/**
 * Codebase Analyzer — Scans a project directory and detects tech stack
 *
 * Detects languages, frameworks, package managers, build tools, test frameworks,
 * linters, TypeScript usage, Tailwind CSS, Node version, and monorepo tools.
 * All operations are synchronous per service pattern. Max 3 levels deep.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

import type { CodebaseAnalysis } from '@shared/types/project-setup';

// ─── Constants ──────────────────────────────────────────────

const MAX_DEPTH = 3;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'target',
  '__pycache__',
  '.venv',
]);

const EXTENSION_LANGUAGE_MAP = new Map<string, string>([
  ['.ts', 'TypeScript'],
  ['.tsx', 'TypeScript'],
  ['.js', 'JavaScript'],
  ['.jsx', 'JavaScript'],
  ['.py', 'Python'],
  ['.rs', 'Rust'],
  ['.go', 'Go'],
  ['.java', 'Java'],
  ['.rb', 'Ruby'],
  ['.swift', 'Swift'],
  ['.kt', 'Kotlin'],
  ['.css', 'CSS'],
  ['.scss', 'CSS'],
  ['.html', 'HTML'],
]);

const FRAMEWORK_DEPS = new Set([
  'react',
  'vue',
  '@angular/core',
  'next',
  'nuxt',
  'electron',
  'express',
  'fastify',
  '@nestjs/core',
  'svelte',
  'solid-js',
  '@remix-run/react',
]);

/** Map npm package names to human-readable display names */
const DEP_DISPLAY_NAMES: Record<string, string> = {
  '@angular/core': 'angular',
  '@nestjs/core': 'nestjs',
  'solid-js': 'solid',
  '@remix-run/react': 'remix',
};

// ─── Types ──────────────────────────────────────────────────

export interface CodebaseAnalyzerService {
  analyzeCodebase: (rootPath: string) => CodebaseAnalysis;
}

// ─── Helpers ────────────────────────────────────────────────

/** Walk directories up to MAX_DEPTH and count files by extension */
function countFilesByExtension(
  rootPath: string,
  depth: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (depth > MAX_DEPTH) return counts;

  try {
    const entries = readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const childCounts = countFilesByExtension(
          join(rootPath, entry.name),
          depth + 1,
        );
        for (const [ext, count] of childCounts) {
          counts.set(ext, (counts.get(ext) ?? 0) + count);
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (EXTENSION_LANGUAGE_MAP.has(ext)) {
          counts.set(ext, (counts.get(ext) ?? 0) + 1);
        }
      }
    }
  } catch {
    // Cannot read directory — return empty
  }

  return counts;
}

/** Parse languages from extension counts */
function detectLanguages(
  extensionCounts: Map<string, number>,
): CodebaseAnalysis['languages'] {
  const languageCounts = new Map<string, number>();

  for (const [ext, count] of extensionCounts) {
    const language = EXTENSION_LANGUAGE_MAP.get(ext);
    if (language !== undefined) {
      languageCounts.set(language, (languageCounts.get(language) ?? 0) + count);
    }
  }

  const totalFiles = [...languageCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  if (totalFiles === 0) return [];

  return [...languageCounts.entries()]
    .map(([name, count]) => ({
      name,
      percentage: Math.round((count / totalFiles) * 1000) / 10,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/** Read and parse a JSON file, returning null on failure */
function readJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Extract dependency names from package.json */
function extractDepsFromPackageJson(
  packageJson: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(typeof packageJson.dependencies === 'object' &&
    packageJson.dependencies !== null
      ? (packageJson.dependencies as Record<string, unknown>)
      : {}),
    ...(typeof packageJson.devDependencies === 'object' &&
    packageJson.devDependencies !== null
      ? (packageJson.devDependencies as Record<string, unknown>)
      : {}),
  };
}

/** Detect frameworks from package.json dependencies */
function detectDependencyFrameworks(rootPath: string): string[] {
  const frameworks: string[] = [];
  const packageJson = readJsonSafe(join(rootPath, 'package.json'));
  if (!packageJson) return frameworks;

  const deps = extractDepsFromPackageJson(packageJson);

  for (const dep of FRAMEWORK_DEPS) {
    if (dep in deps) {
      frameworks.push(DEP_DISPLAY_NAMES[dep] ?? dep);
    }
  }

  return frameworks;
}

/** Detect frameworks from config files on disk */
function detectConfigFrameworks(rootPath: string): string[] {
  const frameworks: string[] = [];

  if (hasTailwindConfig(rootPath)) {
    frameworks.push('tailwind');
  }

  if (hasFileMatching(rootPath, 'vite.config')) {
    frameworks.push('vite');
  }

  if (existsSync(join(rootPath, 'Cargo.toml'))) {
    frameworks.push('rust');
  }

  if (existsSync(join(rootPath, 'go.mod'))) {
    frameworks.push('go');
  }

  if (
    existsSync(join(rootPath, 'pyproject.toml')) ||
    existsSync(join(rootPath, 'requirements.txt'))
  ) {
    frameworks.push('python');
  }

  if (existsSync(join(rootPath, 'Gemfile'))) {
    frameworks.push('ruby');
  }

  return frameworks;
}

/** Detect all frameworks from both package.json and config files */
function detectFrameworks(rootPath: string): string[] {
  return [
    ...detectDependencyFrameworks(rootPath),
    ...detectConfigFrameworks(rootPath),
  ];
}

/** Check if a file matching a prefix exists (e.g. vite.config.ts, vite.config.js) */
function hasFileMatching(rootPath: string, prefix: string): boolean {
  try {
    const entries = readdirSync(rootPath, { withFileTypes: true });
    return entries.some(
      (entry) => entry.isFile() && entry.name.startsWith(prefix),
    );
  } catch {
    return false;
  }
}

/** Check for Tailwind config or @tailwindcss in postcss config */
function hasTailwindConfig(rootPath: string): boolean {
  if (hasFileMatching(rootPath, 'tailwind.config')) return true;

  // Check postcss config for @tailwindcss
  const postcssFiles = [
    'postcss.config.mjs',
    'postcss.config.js',
    'postcss.config.cjs',
  ];
  for (const file of postcssFiles) {
    const filePath = join(rootPath, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes('@tailwindcss')) return true;
      } catch {
        // Cannot read — skip
      }
    }
  }

  return false;
}

/** Detect package manager from lock files */
function detectPackageManager(rootPath: string): string | null {
  if (existsSync(join(rootPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(rootPath, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(rootPath, 'bun.lockb'))) return 'bun';
  if (existsSync(join(rootPath, 'package-lock.json'))) return 'npm';
  return null;
}

/** Detect build tool from config files */
function detectBuildTool(rootPath: string): string | null {
  if (hasFileMatching(rootPath, 'vite.config')) return 'vite';
  if (hasFileMatching(rootPath, 'webpack.config')) return 'webpack';
  if (
    hasFileMatching(rootPath, 'esbuild.config') ||
    hasFileMatching(rootPath, '.esbuild')
  ) {
    return 'esbuild';
  }
  if (existsSync(join(rootPath, 'turbo.json'))) return 'turbopack';
  return null;
}

/** Detect test framework from config files */
function detectTestFramework(rootPath: string): string | null {
  if (hasFileMatching(rootPath, 'vitest.config')) return 'vitest';
  if (hasFileMatching(rootPath, 'jest.config')) return 'jest';
  if (hasFileMatching(rootPath, '.mocharc')) return 'mocha';
  return null;
}

/** Detect linter from config files */
function detectLinter(rootPath: string): string | null {
  if (
    hasFileMatching(rootPath, 'eslint.config') ||
    hasFileMatching(rootPath, '.eslintrc')
  ) {
    return 'eslint';
  }
  if (existsSync(join(rootPath, 'biome.json'))) return 'biome';
  return null;
}

/** Detect Node version from config files */
function detectNodeVersion(rootPath: string): string | null {
  // Check .nvmrc
  const nvmrcPath = join(rootPath, '.nvmrc');
  if (existsSync(nvmrcPath)) {
    try {
      return readFileSync(nvmrcPath, 'utf-8').trim();
    } catch {
      // Cannot read — fall through
    }
  }

  // Check .node-version
  const nodeVersionPath = join(rootPath, '.node-version');
  if (existsSync(nodeVersionPath)) {
    try {
      return readFileSync(nodeVersionPath, 'utf-8').trim();
    } catch {
      // Cannot read — fall through
    }
  }

  // Check engines.node in package.json
  const packageJson = readJsonSafe(join(rootPath, 'package.json'));
  if (packageJson) {
    const { engines } = packageJson;
    if (
      typeof engines === 'object' &&
      engines !== null &&
      'node' in engines &&
      typeof (engines as Record<string, unknown>).node === 'string'
    ) {
      return (engines as Record<string, string>).node;
    }
  }

  return null;
}

/** Detect monorepo tools */
function detectMonorepoTool(rootPath: string): string | null {
  if (existsSync(join(rootPath, 'turbo.json'))) return 'turborepo';
  if (existsSync(join(rootPath, 'nx.json'))) return 'nx';
  if (existsSync(join(rootPath, 'lerna.json'))) return 'lerna';
  if (existsSync(join(rootPath, 'pnpm-workspace.yaml')))
    return 'pnpm-workspaces';
  return null;
}

// ─── Factory ────────────────────────────────────────────────

export function createCodebaseAnalyzer(): CodebaseAnalyzerService {
  return {
    analyzeCodebase(rootPath: string): CodebaseAnalysis {
      const extensionCounts = countFilesByExtension(rootPath, 1);
      const languages = detectLanguages(extensionCounts);

      return {
        languages,
        frameworks: detectFrameworks(rootPath),
        packageManager: detectPackageManager(rootPath),
        buildTool: detectBuildTool(rootPath),
        testFramework: detectTestFramework(rootPath),
        linter: detectLinter(rootPath),
        hasTypeScript: existsSync(join(rootPath, 'tsconfig.json')),
        hasTailwind: hasTailwindConfig(rootPath),
        nodeVersion: detectNodeVersion(rootPath),
        monorepoTool: detectMonorepoTool(rootPath),
      };
    },
  };
}
