/**
 * PipelineConnector — Horizontal line connecting two pipeline step nodes.
 * Visual state reflects the progress between connected steps.
 */

import { cn } from '@renderer/shared/lib/utils';

interface PipelineConnectorProps {
  state: 'completed' | 'active' | 'future';
}

export function PipelineConnector({ state }: PipelineConnectorProps) {
  return (
    <div
      className={cn(
        'flex-1 self-center',
        state === 'completed' && 'h-0.5 bg-success',
        state === 'active' && 'h-0.5 bg-primary',
        state === 'future' && 'h-0 border-t-2 border-dashed border-border',
      )}
    />
  );
}
