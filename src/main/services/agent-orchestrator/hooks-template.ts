/**
 * Hooks Template — Generates Claude hooks config for progress tracking
 *
 * Creates a temporary settings file with PostToolUse and Stop hooks
 * that write progress entries to a per-task JSONL file.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface HooksConfig {
  hooks: {
    PostToolUse: Array<{ command: string; timeout: number }>;
    Stop: Array<{ command: string; timeout: number }>;
  };
}

/**
 * Generates the content for a Claude hooks settings file.
 *
 * The hooks write JSONL entries to a progress file that the
 * progress watcher monitors for real-time UI updates.
 */
export function generateHooksConfig(taskId: string, progressDir: string): HooksConfig {
  // Normalize path separators for cross-platform compat in the node -e script
  const normalizedDir = progressDir.replaceAll('\\', '/');
  const progressFile = `${normalizedDir}/${taskId}.jsonl`;

  const postToolUseScript = [
    `const fs=require('fs');`,
    `const entry=JSON.stringify({`,
    `type:'tool_use',`,
    `tool:process.env.CLAUDE_TOOL_USE_NAME||'unknown',`,
    `timestamp:new Date().toISOString()`,
    `})+'\\n';`,
    `fs.appendFileSync('${progressFile}',entry);`,
  ].join('');

  const stopScript = [
    `const fs=require('fs');`,
    `const entry=JSON.stringify({`,
    `type:'agent_stopped',`,
    `reason:process.env.CLAUDE_STOP_REASON||'unknown',`,
    `timestamp:new Date().toISOString()`,
    `})+'\\n';`,
    `fs.appendFileSync('${progressFile}',entry);`,
  ].join('');

  return {
    hooks: {
      PostToolUse: [
        {
          command: `node -e "${postToolUseScript}"`,
          timeout: 5000,
        },
      ],
      Stop: [
        {
          command: `node -e "${stopScript}"`,
          timeout: 10_000,
        },
      ],
    },
  };
}

/**
 * Writes the hooks config to a temporary file in the project's
 * `.claude/` directory. Returns the path to the written file.
 */
export function writeHooksConfig(
  taskId: string,
  projectPath: string,
  progressDir: string,
): string {
  const config = generateHooksConfig(taskId, progressDir);
  const configPath = join(projectPath, '.claude', `hooks-${taskId}.json`);

  // Ensure directories exist
  mkdirSync(dirname(configPath), { recursive: true });
  mkdirSync(progressDir, { recursive: true });

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  return configPath;
}
