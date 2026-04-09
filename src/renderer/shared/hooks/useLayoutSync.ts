/**
 * useLayoutSync — Restores persisted layout state on app startup.
 *
 * On mount, fetches layout via IPC, hydrates the layout store, then fetches the
 * project list, starts the assistant, and spawns workspace sessions for all
 * persisted project tabs. Replaces the LayoutHydrator component.
 *
 * Call once in the root layout so the layout store picks up persisted sidebar
 * state, project tabs, and active project before first paint.
 */

import { useEffect } from 'react';


import { ASSISTANT } from '@shared/ipc/assistant/channels';
import { PROJECTS } from '@shared/ipc/projects/channels';
import { SETTINGS } from '@shared/ipc/settings/channels';
import { WORKSPACE } from '@shared/ipc/workspace/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useLayoutStore } from '../stores/layout-store';

export function useLayoutSync(): void {
  const hydrate = useLayoutStore((s) => s.hydrate);

  useEffect(() => {
    void (async () => {
      try {
        const layout = await ipc(SETTINGS.GET.LAYOUT, {});
        hydrate(layout);

        // Fetch full project list to map IDs → names/paths
        const allProjects = await ipc(PROJECTS.LIST.ALL, {});

        // Build project info for open tabs (fall back to full list if no tabs)
        const tabIds = new Set(layout.openProjectTabs);
        const activeProjects =
          tabIds.size > 0
            ? allProjects.filter((p) => tabIds.has(p.id))
            : allProjects;

        const projectInfos = activeProjects.map((p) => ({
          id: p.id,
          name: p.name,
          path: p.path,
        }));

        // Start global assistant session with project context
        await ipc(ASSISTANT.START.SESSION, { projects: projectInfos });

        // Eagerly spawn workspace sessions for all persisted project tabs
        await ipc(WORKSPACE.INIT['ALL-PROJECTS'], {
          projects: activeProjects.map((p) => ({ id: p.id, path: p.path })),
        });
      } catch {
        // Settings unavailable — keep defaults
      }
    })();
  }, [hydrate]);
}
