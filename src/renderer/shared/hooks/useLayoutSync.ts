/**
 * useLayoutSync — Restores persisted layout state on app startup.
 *
 * On mount, fetches layout via IPC, hydrates the layout store, then fetches the
 * project list, starts the assistant, and spawns workspace sessions for all
 * persisted project tabs. Replaces the LayoutHydrator component.
 *
 * Call once in the root layout so the layout store picks up persisted sidebar
 * state, project tabs, and active project before first paint.
 *
 * Returns `initState` so the root layout can show a loading overlay while
 * workspace sessions spawn — each team-lead requires git-worktree provisioning
 * and a setup script, which can take 10–30s per project.
 */

import { useEffect, useState } from 'react';


import { ASSISTANT } from '@shared/ipc/assistant/channels';
import { PROJECTS } from '@shared/ipc/projects/channels';
import { SETTINGS } from '@shared/ipc/settings/channels';
import { WORKSPACE } from '@shared/ipc/workspace/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useLayoutStore } from '../stores/layout-store';

export type WorkspaceInitPhase = 'idle' | 'starting' | 'done';

export interface LayoutSyncState {
  phase: WorkspaceInitPhase;
  projectCount: number;
}

export function useLayoutSync(): LayoutSyncState {
  const hydrate = useLayoutStore((s) => s.hydrate);
  const [state, setState] = useState<LayoutSyncState>({ phase: 'idle', projectCount: 0 });

  useEffect(() => {
    void (async () => {
      try {
        const layout = await ipc(SETTINGS.GET.LAYOUT, {});
        hydrate(layout);

        // Fetch full project list to map IDs → names/paths
        const allProjects = await ipc(PROJECTS.LIST.ALL, {});

        // Build project info for open tabs only
        const tabIds = new Set(layout.openProjectTabs);
        const openTabProjects = allProjects.filter((p) => tabIds.has(p.id));

        const projectInfos = openTabProjects.map((p) => ({
          id: p.id,
          name: p.name,
          path: p.path,
        }));

        // Start global assistant session with open-tab project context
        await ipc(ASSISTANT.START.SESSION, { projects: projectInfos });

        // Spawn workspace sessions only for projects with open tabs.
        // WorkspacePage also calls WORKSPACE.INIT.PROJECT per tab, so this
        // handles the case where tabs were open at last shutdown.
        if (openTabProjects.length > 0) {
          setState({ phase: 'starting', projectCount: openTabProjects.length });
          await ipc(WORKSPACE.INIT['ALL-PROJECTS'], {
            projects: openTabProjects.map((p) => ({ id: p.id, path: p.path })),
          });
        }
        setState({ phase: 'done', projectCount: openTabProjects.length });
      } catch {
        // Settings unavailable — keep defaults and don't block the UI
        setState({ phase: 'done', projectCount: 0 });
      }
    })();
  }, [hydrate]);

  return state;
}
