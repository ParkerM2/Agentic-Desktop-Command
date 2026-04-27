/**
 * WorkspaceInitOverlay — full-screen loading overlay while team-lead worktrees
 * provision on app startup. Shown only when useLayoutSync reports phase='starting'.
 *
 * All logic lives in useWorkspaceInitOverlay; this component is pure JSX.
 */

import type { WorkspaceInitPhase } from '@renderer/shared/hooks/useLayoutSync';

import { Card, Heading, Spinner, Text } from '@ui';

import { useWorkspaceInitOverlay } from './useWorkspaceInitOverlay';

interface WorkspaceInitOverlayProps {
  phase: WorkspaceInitPhase;
  projectCount: number;
}

export function WorkspaceInitOverlay({ phase, projectCount }: WorkspaceInitOverlayProps) {
  const { visible, countLabel } = useWorkspaceInitOverlay({ phase, projectCount });

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-label="Starting workspace sessions"
      aria-live="polite"
      className="bg-background/80 pointer-events-none fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      role="status"
    >
      <Card className="pointer-events-auto flex flex-col items-center gap-3 p-6 shadow-lg">
        <Spinner size="md" />
        <Heading as="h4">Starting workspace sessions…</Heading>
        <Text size="sm" variant="muted">
          Provisioning {countLabel}
        </Text>
      </Card>
    </div>
  );
}
