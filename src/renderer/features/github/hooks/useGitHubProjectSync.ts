/**
 * useGitHubProjectSync — Auto-populates GitHub store owner/repo
 * from the currently active project's git origin remote.
 */

import { useEffect } from 'react';

import { ipc } from '@renderer/shared/lib/ipc';
import { useLayoutStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects';

import { useGitHubStore } from '../store';

/** Parse owner/repo from a GitHub URL (HTTPS or SSH) */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = /github\.com\/([^/]+)\/([^/.]+)/.exec(url);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH: git@github.com:owner/repo.git
  const sshMatch = /github\.com:([^/]+)\/([^/.]+)/.exec(url);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

export function useGitHubProjectSync() {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const setRepo = useGitHubStore((s) => s.setRepo);

  useEffect(() => {
    if (!activeProjectId || !projects) return;

    const project = projects.find((p) => p.id === activeProjectId);
    if (!project?.path) return;

    void (async () => {
      try {
        const { url } = await ipc('git.getRemoteUrl', { repoPath: project.path });
        if (url.length === 0) return;

        const parsed = parseGitHubUrl(url);
        if (parsed) {
          setRepo(parsed.owner, parsed.repo);
        }
      } catch {
        // Project may not be a git repo — silently ignore
      }
    })();
  }, [activeProjectId, projects, setRepo]);
}
