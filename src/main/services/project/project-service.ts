/**
 * Project Service — Disk-persisted project management
 *
 * Projects are stored in a JSON file in the app's user data directory.
 * Each project also gets a .claude-ui directory in the project folder.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { dialog, app } from 'electron';

import { v4 as uuid } from 'uuid';

import type { Project } from '@shared/types';

export interface ProjectService {
  listProjects: () => Project[];
  addProject: (path: string) => Project;
  removeProject: (projectId: string) => { success: boolean };
  initializeProject: (projectId: string) => { success: boolean; error?: string };
  selectDirectory: () => Promise<{ path: string | null }>;
  /** Resolve a project ID to its filesystem path (sync, for other services) */
  getProjectPath: (projectId: string) => string | undefined;
}

/** Path to projects JSON file in app data */
function getProjectsFilePath(): string {
  const userDataPath = app.getPath('userData');
  return join(userDataPath, 'projects.json');
}

/** Load projects from disk */
function loadProjects(): Map<string, Project> {
  const filePath = getProjectsFilePath();
  const projects = new Map<string, Project>();
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const arr: Project[] = JSON.parse(raw) as unknown as Project[];
      for (const p of arr) {
        projects.set(p.id, p);
      }
    } catch {
      // Corrupted file — start fresh
    }
  }
  return projects;
}

/** Save projects to disk */
function saveProjects(projects: Map<string, Project>): void {
  const filePath = getProjectsFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const arr = Array.from(projects.values());
  writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf-8');
}

export function createProjectService(): ProjectService {
  const projects = loadProjects();

  return {
    getProjectPath(projectId) {
      return projects.get(projectId)?.path;
    },

    listProjects() {
      return Array.from(projects.values());
    },

    addProject(path) {
      for (const p of projects.values()) {
        if (p.path === path) return p;
      }
      const id = uuid();
      const now = new Date().toISOString();
      const project: Project = {
        id,
        name: basename(path),
        path,
        createdAt: now,
        updatedAt: now,
      };
      projects.set(id, project);
      saveProjects(projects);
      return project;
    },

    removeProject(projectId) {
      projects.delete(projectId);
      saveProjects(projects);
      return { success: true };
    },

    initializeProject(projectId) {
      const project = projects.get(projectId);
      if (!project) return { success: false, error: 'Project not found' };
      const claudeUiDir = join(project.path, '.claude-ui');
      try {
        if (!existsSync(claudeUiDir)) {
          mkdirSync(claudeUiDir, { recursive: true });
        }
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: msg };
      }
    },

    async selectDirectory() {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Project Folder',
      });
      return { path: result.filePaths[0] ?? null };
    },
  };
}
