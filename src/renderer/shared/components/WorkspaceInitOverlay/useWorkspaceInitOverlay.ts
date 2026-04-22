/**
 * useWorkspaceInitOverlay — derives display state for the workspace-init overlay.
 *
 * Pure derivation from the layout-sync state: phase + project count → visibility
 * and the pluralised label. No side effects, no data fetching.
 */

import type { WorkspaceInitPhase } from '@renderer/shared/hooks/useLayoutSync';

interface UseWorkspaceInitOverlayParams {
  phase: WorkspaceInitPhase;
  projectCount: number;
}

export interface WorkspaceInitOverlayViewModel {
  visible: boolean;
  countLabel: string;
}

export function useWorkspaceInitOverlay({
  phase,
  projectCount,
}: UseWorkspaceInitOverlayParams): WorkspaceInitOverlayViewModel {
  const visible = phase === 'starting';
  const countLabel =
    projectCount === 1 ? '1 project' : `${String(projectCount)} projects`;

  return { visible, countLabel };
}
