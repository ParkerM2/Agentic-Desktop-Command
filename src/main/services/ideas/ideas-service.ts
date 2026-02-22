/**
 * Ideas Service — Disk-persisted idea board
 *
 * Ideas are stored as JSON in the app's user data directory.
 * All methods are synchronous; IPC handlers wrap with Promise.resolve().
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { Idea, IdeaCategory, IdeaStatus } from '@shared/types';

import type { ReinitializableService } from '@main/services/data-management';

import type { IpcRouter } from '../../ipc/router';

const IDEAS_FILE = 'ideas.json';

export interface IdeasService extends ReinitializableService {
  listIdeas: (filters: {
    projectId?: string;
    status?: IdeaStatus;
    category?: IdeaCategory;
  }) => Idea[];
  createIdea: (data: {
    title: string;
    description: string;
    category: IdeaCategory;
    tags?: string[];
    projectId?: string;
  }) => Idea;
  updateIdea: (
    id: string,
    updates: {
      title?: string;
      description?: string;
      status?: IdeaStatus;
      category?: IdeaCategory;
      tags?: string[];
    },
  ) => Idea;
  deleteIdea: (id: string) => { success: boolean };
  voteIdea: (id: string, delta: number) => Idea;
}

interface IdeasFile {
  ideas: Idea[];
}

function loadFile(filePath: string): IdeasFile {
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<IdeasFile>;
      return {
        ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
      };
    } catch {
      return { ideas: [] };
    }
  }
  return { ideas: [] };
}

function saveFile(filePath: string, data: IdeasFile): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function createIdeasService(deps: { dataDir: string; router: IpcRouter }): IdeasService {
  let currentFilePath = join(deps.dataDir, IDEAS_FILE);
  let store = loadFile(currentFilePath);

  function persist(): void {
    saveFile(currentFilePath, store);
  }

  function emitChanged(ideaId: string): void {
    deps.router.emit('event:idea.changed', { ideaId });
  }

  function findIdea(id: string): { idea: Idea; index: number } {
    const index = store.ideas.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Idea not found: ${id}`);
    }
    return { idea: store.ideas[index], index };
  }

  return {
    listIdeas(filters) {
      let result = [...store.ideas];

      if (filters.projectId) {
        result = result.filter((i) => i.projectId === filters.projectId);
      }

      if (filters.status) {
        result = result.filter((i) => i.status === filters.status);
      }

      if (filters.category) {
        result = result.filter((i) => i.category === filters.category);
      }

      // Sort by votes descending, then by creation date
      result.sort((a, b) => {
        if (a.votes !== b.votes) return b.votes - a.votes;
        return b.createdAt.localeCompare(a.createdAt);
      });

      return result;
    },

    createIdea(data) {
      const now = new Date().toISOString();
      const idea: Idea = {
        id: randomUUID(),
        title: data.title,
        description: data.description,
        status: 'new',
        category: data.category,
        tags: data.tags ?? [],
        projectId: data.projectId,
        votes: 0,
        createdAt: now,
        updatedAt: now,
      };
      store.ideas.push(idea);
      persist();
      emitChanged(idea.id);
      return idea;
    },

    updateIdea(id, updates) {
      const { idea, index } = findIdea(id);
      const updated: Idea = {
        ...idea,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      store.ideas[index] = updated;
      persist();
      emitChanged(updated.id);
      return updated;
    },

    deleteIdea(id) {
      const { index } = findIdea(id);
      store.ideas.splice(index, 1);
      persist();
      emitChanged(id);
      return { success: true };
    },

    voteIdea(id, delta) {
      const { idea, index } = findIdea(id);
      const updated: Idea = {
        ...idea,
        votes: Math.max(0, idea.votes + delta),
        updatedAt: new Date().toISOString(),
      };
      store.ideas[index] = updated;
      persist();
      emitChanged(updated.id);
      return updated;
    },

    reinitialize(dataDir: string): void {
      currentFilePath = join(dataDir, IDEAS_FILE);
      store = loadFile(currentFilePath);
    },

    clearState(): void {
      store = { ideas: [] };
    },
  };
}
