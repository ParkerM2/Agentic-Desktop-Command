/**
 * Projects IPC Contract
 *
 * Invoke and event channel definitions for project CRUD and sub-projects.
 * Git and merge operations are in their own domain folders.
 */

import { z } from 'zod';

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
  'projects.list': {
    input: z.object({}),
    output: z.array(ProjectSchema),
  },
  'projects.add': {
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
  'projects.remove': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'projects.initialize': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'projects.selectDirectory': {
    input: z.object({}),
    output: z.object({ path: z.string().nullable() }),
  },
  'projects.detectRepo': {
    input: z.object({ path: z.string() }),
    output: RepoDetectionResultSchema,
  },
  'projects.update': {
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
  'projects.getSubProjects': {
    input: z.object({ projectId: z.string() }),
    output: z.array(SubProjectSchema),
  },
  'projects.createSubProject': {
    input: z.object({
      projectId: z.string(),
      name: z.string(),
      relativePath: z.string(),
      gitUrl: z.string().optional(),
      defaultBranch: z.string().optional(),
    }),
    output: SubProjectSchema,
  },
  'projects.deleteSubProject': {
    input: z.object({ projectId: z.string(), subProjectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'projects.setupExisting': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'projects.createNew': {
    input: CreateProjectInputSchema,
    output: ProjectSchema,
  },
  'projects.analyzeCodebase': {
    input: z.object({ path: z.string() }),
    output: CodebaseAnalysisSchema,
  },
} as const;

/** Event channels for project-related events */
export const projectsEvents = {
  'event:project.updated': {
    payload: z.object({ projectId: z.string() }),
  },
  'event:project.setupProgress': {
    payload: SetupProgressEventSchema,
  },
} as const;
