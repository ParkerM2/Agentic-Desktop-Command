/**
 * Hub Protocol — Project Types
 */

import type { RepoStructure } from './enums';

// ─── Project Models ──────────────────────────────────────────

export interface Project {
  id: string;
  workspaceId?: string;
  name: string;
  description?: string;
  rootPath: string;
  gitUrl?: string;
  repoStructure: RepoStructure;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubProject {
  id: string;
  projectId: string;
  name: string;
  relativePath: string;
  gitUrl?: string;
  defaultBranch: string;
  createdAt: string;
}

// ─── Project Requests ────────────────────────────────────────

export interface ProjectCreateRequest {
  workspaceId: string;
  name: string;
  description?: string;
  rootPath: string;
  gitUrl?: string;
  repoStructure: RepoStructure;
  defaultBranch?: string;
  subProjects?: Array<{
    name: string;
    relativePath: string;
    gitUrl?: string;
    defaultBranch?: string;
  }>;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  gitUrl?: string;
  defaultBranch?: string;
}

export interface SubProjectCreateRequest {
  name: string;
  relativePath: string;
  gitUrl?: string;
  defaultBranch?: string;
}
