/**
 * Projects IPC Contract
 *
 * Invoke and event channel definitions for project CRUD and sub-projects.
 * Git and merge operations are in their own domain folders.
 */

import { z } from 'zod';

import { PROJECTS, PROJECTS_EVENTS } from './channels';
import {
  CodebaseAnalysisSchema,
  CreateProjectInputSchema,
  ProjectSchema,
  RepoDetectionResultSchema,
  SetupProgressEventSchema,
  SubProjectSchema,
} from './schemas';

/** Invoke channels for project operations */
export const projectsInvoke = {
  [PROJECTS.LIST.ALL]: {
    input: z.object({}),
    output: z.array(ProjectSchema),
  },
  [PROJECTS.ADD.PROJECT]: {
    input: z.object({
      path: z.string(),
      name: z.string().optional(),
      workspaceId: z.string().optional(),
      description: z.string().optional(),
      repoStructure: z.enum(['single', 'monorepo', 'multi-repo']).optional(),
      defaultBranch: z.string().optional(),
    }),
    output: ProjectSchema,
  },
  [PROJECTS.REMOVE.PROJECT]: {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [PROJECTS.INITIALIZE.PROJECT]: {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  [PROJECTS.SELECT.DIRECTORY]: {
    input: z.object({}),
    output: z.object({ path: z.string().nullable() }),
  },
  [PROJECTS.DETECT.REPO]: {
    input: z.object({ path: z.string() }),
    output: RepoDetectionResultSchema,
  },
  [PROJECTS.UPDATE.PROJECT]: {
    input: z.object({
      projectId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      gitUrl: z.string().optional(),
      defaultBranch: z.string().optional(),
      workspaceId: z.string().optional(),
    }),
    output: ProjectSchema,
  },
  [PROJECTS.GET['SUB-PROJECTS']]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(SubProjectSchema),
  },
  [PROJECTS.CREATE['SUB-PROJECT']]: {
    input: z.object({
      projectId: z.string(),
      name: z.string(),
      relativePath: z.string(),
      gitUrl: z.string().optional(),
      defaultBranch: z.string().optional(),
    }),
    output: SubProjectSchema,
  },
  [PROJECTS.DELETE['SUB-PROJECT']]: {
    input: z.object({ projectId: z.string(), subProjectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [PROJECTS.SETUP.EXISTING]: {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  [PROJECTS.CREATE.NEW]: {
    input: CreateProjectInputSchema,
    output: ProjectSchema,
  },
  [PROJECTS.ANALYZE.CODEBASE]: {
    input: z.object({ path: z.string() }),
    output: CodebaseAnalysisSchema,
  },
} as const;

/** Event channels for project-related events */
export const projectsEvents = {
  [PROJECTS_EVENTS.PROJECT.UPDATED]: {
    payload: z.object({ projectId: z.string() }),
  },
  [PROJECTS_EVENTS.SETUP.PROGRESS]: {
    payload: SetupProgressEventSchema,
  },
} as const;
