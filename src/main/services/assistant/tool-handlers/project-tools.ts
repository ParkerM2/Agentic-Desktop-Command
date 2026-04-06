/**
 * Project tool handlers for the assistant tool executor.
 *
 * Handles: projects_list (alias for list_projects)
 */

import type { ProjectService } from '../../project/project-service';
import type { ToolResult } from '../tool-executor';

type ToolInput = Record<string, unknown>;

export function handleProjectTool(
  toolName: string,
  _input: ToolInput,
  projectService: Pick<ProjectService, 'listProjectsSync'> | null,
): ToolResult | undefined {
  if (toolName === 'list_projects') {
    const projects = projectService?.listProjectsSync() ?? [];
    return { success: true, data: projects, queryKeyRoots: [] };
  }
  return undefined;
}
