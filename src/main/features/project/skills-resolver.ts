/**
 * Skills Resolver Service
 *
 * Maps a detected tech stack (CodebaseAnalysis) to skills.sh skill identifiers
 * and installs them into a project's `.claude/settings.json`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CodebaseAnalysis } from '@shared/types';

// ─── Types ───────────────────────────────────────────────────

export interface SkillsResolverService {
  /** Map a CodebaseAnalysis to an array of skill identifiers */
  resolveSkills: (analysis: CodebaseAnalysis) => string[];
  /** Install skill identifiers into a project's .claude/settings.json */
  installSkills: (projectPath: string, skills: string[]) => void;
}

// ─── Constants ───────────────────────────────────────────────

const NODEJS_BACKEND_PATTERNS = 'wshobson/agents:nodejs-backend-patterns';

const FRAMEWORK_TO_SKILLS: Partial<Record<string, string[]>> = {
  // Language-based
  typescript: ['wshobson/agents:typescript-advanced-types'],
  python: [],
  rust: [],
  go: [],

  // Frontend frameworks
  react: ['vercel-labs/agent-skills:vercel-react-best-practices'],
  vue: [],
  angular: [],
  svelte: [],
  next: ['vercel-labs/agent-skills:vercel-react-best-practices'],
  nuxt: [],

  // Styling
  tailwind: [
    'jezweb/claude-skills:tailwind-v4-shadcn',
    'wshobson/agents:tailwind-design-system',
  ],

  // State management
  zustand: ['wshobson/agents:react-state-management'],
  'tanstack-query': ['jezweb/claude-skills:tanstack-query'],

  // Backend
  electron: [NODEJS_BACKEND_PATTERNS],
  express: [NODEJS_BACKEND_PATTERNS, 'wshobson/agents:api-design-principles'],
  fastify: [NODEJS_BACKEND_PATTERNS, 'wshobson/agents:api-design-principles'],
  nestjs: [NODEJS_BACKEND_PATTERNS],

  // Testing
  vitest: ['antfu/skills:vitest'],
  jest: [],

  // Database
  postgresql: ['wshobson/agents:postgresql-table-design'],
};

/** Look up skills for a given key in the mapping */
function lookupSkills(key: string): string[] {
  return FRAMEWORK_TO_SKILLS[key] ?? [];
}

// ─── Factory ─────────────────────────────────────────────────

export function createSkillsResolver(): SkillsResolverService {
  function resolveSkills(analysis: CodebaseAnalysis): string[] {
    const skills: string[] = [];

    // 1. TypeScript
    if (analysis.hasTypeScript) {
      skills.push(...lookupSkills('typescript'));
    }

    // 2. Frameworks
    for (const framework of analysis.frameworks) {
      skills.push(...lookupSkills(framework.toLowerCase()));
    }

    // 3. Tailwind
    if (analysis.hasTailwind) {
      skills.push(...lookupSkills('tailwind'));
    }

    // 4. Test framework
    if (analysis.testFramework) {
      skills.push(...lookupSkills(analysis.testFramework.toLowerCase()));
    }

    // 5. Deduplicate
    return [...new Set(skills)];
  }

  function installSkills(projectPath: string, skills: string[]): void {
    if (skills.length === 0) {
      return;
    }

    const claudeDir = join(projectPath, '.claude');
    const settingsPath = join(claudeDir, 'settings.json');

    // Ensure .claude directory exists
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    // Read or initialize settings
    let settings: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      const raw = readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(raw) as Record<string, unknown>;
    }

    // Get existing skills array or create one
    const existingSkills = Array.isArray(settings.skills)
      ? (settings.skills as string[])
      : [];

    // Merge new skills without duplicates
    const existingSet = new Set(existingSkills);
    for (const skill of skills) {
      if (!existingSet.has(skill)) {
        existingSkills.push(skill);
        existingSet.add(skill);
      }
    }

    settings.skills = existingSkills;

    // Write back
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  }

  return {
    resolveSkills,
    installSkills,
  };
}
