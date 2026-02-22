/**
 * Dashboard Service — Disk-persisted quick captures
 *
 * Captures are stored as JSON in the app's user data directory.
 * All methods are synchronous; IPC handlers wrap with Promise.resolve().
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ReinitializableService } from '@main/services/data-management';

import type { IpcRouter } from '../../ipc/router';

export interface Capture {
  id: string;
  text: string;
  createdAt: string;
}

export interface DashboardService extends ReinitializableService {
  listCaptures: () => Capture[];
  createCapture: (text: string) => Capture;
  deleteCapture: (id: string) => { success: boolean };
}

interface CapturesFile {
  captures: Capture[];
}

function loadCapturesFile(filePath: string): CapturesFile {
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<CapturesFile>;
      return {
        captures: Array.isArray(parsed.captures) ? parsed.captures : [],
      };
    } catch {
      return { captures: [] };
    }
  }
  return { captures: [] };
}

function saveCapturesFile(filePath: string, data: CapturesFile): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function createDashboardService(deps: {
  dataDir: string;
  router: IpcRouter;
}): DashboardService {
  let currentFilePath = join(deps.dataDir, 'captures.json');
  let store = loadCapturesFile(currentFilePath);

  function persist(): void {
    saveCapturesFile(currentFilePath, store);
  }

  function emitChanged(captureId: string): void {
    deps.router.emit('event:dashboard.captureChanged', { captureId });
  }

  return {
    listCaptures() {
      // Most recent first
      return [...store.captures].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    createCapture(text) {
      const capture: Capture = {
        id: randomUUID(),
        text,
        createdAt: new Date().toISOString(),
      };
      store.captures.push(capture);
      persist();
      emitChanged(capture.id);
      return capture;
    },

    deleteCapture(id) {
      const index = store.captures.findIndex((c) => c.id === id);
      if (index === -1) {
        throw new Error(`Capture not found: ${id}`);
      }
      store.captures.splice(index, 1);
      persist();
      emitChanged(id);
      return { success: true };
    },

    reinitialize(dataDir: string) {
      currentFilePath = join(dataDir, 'captures.json');
      store = loadCapturesFile(currentFilePath);
    },

    clearState() {
      store = { captures: [] };
    },
  };
}
