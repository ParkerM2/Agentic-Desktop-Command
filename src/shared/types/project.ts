/**
 * Project-related types
 */

export interface Project {
  id: string;
  name: string;
  path: string;
  autoBuildPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  mainBranch: string;
  githubEnabled: boolean;
  githubRepo?: string;
  githubAuthMethod?: 'oauth' | 'pat';
  jiraEnabled: boolean;
  jiraProject?: string;
}

export interface ProjectEnvConfig {
  githubEnabled?: boolean;
  githubToken?: string;
  githubRepo?: string;
  githubAuthMethod?: 'oauth' | 'pat';
}

export interface ChildRepo {
  name: string;
  path: string;
  relativePath: string;
  gitUrl?: string;
}

export type RepoType = 'single' | 'monorepo' | 'multi-repo' | 'none';

export interface RepoDetectionResult {
  isGitRepo: boolean;
  repoType: RepoType;
  gitUrl?: string;
  defaultBranch?: string;
  childRepos: ChildRepo[];
}
