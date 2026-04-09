/**
 * Doc Detectors — Project analysis helpers for doc generation
 *
 * Pure detection functions that scan a project's file system and dependencies
 * to produce markdown content for documentation stubs.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { CodebaseAnalysis } from '@shared/types/project-setup';

const EMPTY_TABLE_ROW = '| (none detected) | - | - |';

/** Read all dependencies (dependencies + devDependencies) from a package.json */
function readAllDeps(projectPath: string): Record<string, unknown> {
  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) return {};

  try {
    const raw = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };

    return {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
  } catch {
    return {};
  }
}

/** Detect services by looking for factory-pattern directories under src/main/services/ */
export function detectServices(projectPath: string): string {
  const servicesDir = join(projectPath, 'src', 'main', 'services');
  if (!existsSync(servicesDir)) return EMPTY_TABLE_ROW;

  const rows: string[] = [];
  try {
    const entries = readdirSync(servicesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const { name } = entry;
        const location = `src/main/services/${name}/`;
        rows.push(`| ${name} | \`${location}\` | - |`);
      }
    }
  } catch {
    // Cannot read services directory
  }

  return rows.length > 0 ? rows.join('\n') : EMPTY_TABLE_ROW;
}

/** Detect data persistence patterns from package.json dependencies */
export function detectDataPersistence(projectPath: string): string {
  const lines: string[] = [];
  const allDeps = readAllDeps(projectPath);

  const storagePatterns: Array<[string, string]> = [
    ['electron-store', 'electron-store — JSON file-based key-value storage'],
    ['better-sqlite3', 'better-sqlite3 — SQLite database'],
    ['sqlite3', 'sqlite3 — SQLite database'],
    ['typeorm', 'TypeORM — ORM with database abstraction'],
    ['prisma', 'Prisma — Type-safe ORM'],
    ['mongoose', 'Mongoose — MongoDB ODM'],
    ['redis', 'Redis — In-memory data store'],
    ['lowdb', 'lowdb — JSON file database'],
    ['keytar', 'keytar — OS keychain for secrets'],
  ];

  for (const [dep, description] of storagePatterns) {
    if (dep in allDeps) {
      lines.push(`- **${description}**`);
    }
  }

  if (lines.length === 0) {
    lines.push('No persistence libraries detected. Document storage patterns as they are added.');
  }

  return lines.join('\n');
}

/** Detect component patterns from the project structure */
export function detectComponentPattern(
  projectPath: string,
  analysis: CodebaseAnalysis,
): string {
  const lines: string[] = [];

  const featuresDir = join(projectPath, 'src', 'renderer', 'features');
  const componentsDir = join(projectPath, 'src', 'renderer', 'shared', 'components');

  if (existsSync(featuresDir)) {
    lines.push('- **Feature modules** at `src/renderer/features/` — co-located components, hooks, and stores');
  }
  if (existsSync(componentsDir)) {
    lines.push('- **Shared components** at `src/renderer/shared/components/` — reusable UI primitives');
  }

  if (analysis.frameworks.some((f) => f.toLowerCase().includes('react'))) {
    lines.push('- **React** functional components with hooks');
  }
  if (analysis.hasTypeScript) {
    lines.push('- **TypeScript** strict mode — all props typed via interfaces');
  }
  if (analysis.hasTailwind) {
    lines.push('- **Tailwind CSS** for styling');
  }

  return lines.length > 0
    ? lines.join('\n')
    : 'Document component patterns as the project develops.';
}

/** Detect service patterns from the project */
export function detectServicePattern(projectPath: string): string {
  const lines: string[] = [];
  const servicesDir = join(projectPath, 'src', 'main', 'services');

  if (existsSync(servicesDir)) {
    lines.push(
      '- Factory function pattern: `createXService()` returning a typed interface',
      '- Services located in `src/main/services/<name>/`',
    );

    const ipcDir = join(projectPath, 'src', 'shared', 'ipc');
    if (existsSync(ipcDir)) {
      lines.push('- IPC contracts in `src/shared/ipc/` — Zod schemas for type-safe communication');
    }
  }

  return lines.length > 0
    ? lines.join('\n')
    : 'Document service patterns as the project develops.';
}

/** Detect state management approach */
export function detectStateManagement(
  projectPath: string,
  analysis: CodebaseAnalysis,
): string {
  const lines: string[] = [];
  const allDeps = readAllDeps(projectPath);

  const statePatterns: Array<[string, string]> = [
    ['zustand', 'Zustand — lightweight state management'],
    ['@reduxjs/toolkit', 'Redux Toolkit — centralized state management'],
    ['redux', 'Redux — centralized state management'],
    ['mobx', 'MobX — reactive state management'],
    ['jotai', 'Jotai — atomic state management'],
    ['recoil', 'Recoil — atomic state management'],
    ['@tanstack/react-query', 'TanStack Query — server state management'],
    ['valtio', 'Valtio — proxy-based state management'],
  ];

  for (const [dep, description] of statePatterns) {
    if (dep in allDeps) {
      lines.push(`- **${description}**`);
    }
  }

  if (analysis.frameworks.some((f) => f.toLowerCase().includes('react'))) {
    lines.push('- React built-in: `useState`, `useReducer`, `useContext`');
  }

  return lines.length > 0
    ? lines.join('\n')
    : 'Document state management patterns as the project develops.';
}

/** Detect error handling patterns */
export function detectErrorHandling(analysis: CodebaseAnalysis): string {
  const lines: string[] = [];

  if (analysis.hasTypeScript) {
    lines.push('- TypeScript strict null checks for compile-time safety');
  }

  lines.push(
    '- Document error handling conventions as they emerge',
    '- Consider: error boundaries (React), IPC error shapes, service-level try/catch',
  );

  return lines.join('\n');
}

/** Detect feature modules from src/renderer/features/ */
export function detectFeatureModules(projectPath: string): string {
  const featuresDir = join(projectPath, 'src', 'renderer', 'features');
  if (!existsSync(featuresDir)) return EMPTY_TABLE_ROW;

  const rows: string[] = [];
  try {
    const entries = readdirSync(featuresDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const { name } = entry;
        const location = `src/renderer/features/${name}/`;
        rows.push(`| ${name} | \`${location}\` | - |`);
      }
    }
  } catch {
    // Cannot read features directory
  }

  return rows.length > 0 ? rows.join('\n') : EMPTY_TABLE_ROW;
}

/** Detect shared UI components from src/renderer/shared/components/ */
export function detectSharedComponents(projectPath: string): string {
  const uiDir = join(projectPath, 'src', 'renderer', 'shared', 'components', 'ui');
  const componentsDir = join(projectPath, 'src', 'renderer', 'shared', 'components');
  const searchDir = existsSync(uiDir) ? uiDir : componentsDir;

  if (!existsSync(searchDir)) return EMPTY_TABLE_ROW;

  const rows: string[] = [];
  try {
    const entries = readdirSync(searchDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        const name = basename(entry.name, entry.name.slice(entry.name.lastIndexOf('.')));
        const relativePath = searchDir === uiDir
          ? `src/renderer/shared/components/ui/${entry.name}`
          : `src/renderer/shared/components/${entry.name}`;
        rows.push(`| ${name} | \`${relativePath}\` | - |`);
      }
    }
  } catch {
    // Cannot read components directory
  }

  return rows.length > 0 ? rows.join('\n') : EMPTY_TABLE_ROW;
}
