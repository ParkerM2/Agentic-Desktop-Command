/**
 * Dashboard Service — Disk-persisted quick captures
 *
 * Captures are stored as JSON in the app's user data directory.
 * All methods are synchronous; IPC handlers wrap with Promise.resolve().
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IpcRouter } from '../../ipc/router';

export interface Capture {
  id: string;
  text: string;
  createdAt: string;
}

export interface DashboardService {
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
  const filePath = join(deps.dataDir, 'captures.json');
  const store = loadCapturesFile(filePath);

  function persist(): void {
    saveCapturesFile(filePath, store);
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
  };
}
