import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ClaudeConfigItem } from '@shared/ipc/claude/schemas';

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return {};
  const block = match[1];
  const name = /^name:\s*["']?(.+?)["']?\s*$/m.exec(block)?.[1]?.trim();
  const description = /^description:\s*["']?(.+?)["']?\s*$/m.exec(block)?.[1]?.trim();
  return { name, description };
}

function scanDir(dir: string, type: ClaudeConfigItem['type']): ClaudeConfigItem[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .flatMap((f) => {
        const filePath = join(dir, f);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const { name, description } = parseFrontmatter(content);
          if (!name) return [];
          return [{ name, description: description ?? '', type, filePath }];
        } catch {
          console.warn(`[claude-config-scanner] Failed to parse ${filePath}`);
          return [];
        }
      });
  } catch {
    return [];
  }
}

export function scanClaudeConfig(projectRoot: string, userHome: string) {
  const globalSkillsDir = join(userHome, '.claude', 'skills');
  const projectSkillsDir = join(projectRoot, '.claude', 'skills');
  const globalAgentsDir = join(userHome, '.claude', 'agents');
  const projectAgentsDir = join(projectRoot, '.claude', 'agents');

  const globalSkills = scanDir(globalSkillsDir, 'skill');
  const projectSkills = scanDir(projectSkillsDir, 'skill');
  // Deduplicate: project skills/agents override global by name
  const skillNames = new Set(projectSkills.map((s) => s.name));
  const skills = [...projectSkills, ...globalSkills.filter((s) => !skillNames.has(s.name))];

  const globalAgents = scanDir(globalAgentsDir, 'agent');
  const projectAgents = scanDir(projectAgentsDir, 'agent');
  const agentNames = new Set(projectAgents.map((a) => a.name));
  const agents = [...projectAgents, ...globalAgents.filter((a) => !agentNames.has(a.name))];

  return {
    skills,
    agents,
    commands: [] as ClaudeConfigItem[],
  };
}
