/**
 * WorkflowPermissionModal — High-priority notification for agent permission requests.
 *
 * Listens for event:workflow.permission events and opens a blocking modal.
 * Multiple events are queued — each must be dismissed before the next appears.
 * Hard to miss: non-dismissable via backdrop click or Escape key.
 *
 * Note: This is an informational notification. The permission event is emitted
 * by the plugin when an agent requires user awareness; it does not block the
 * agent waiting for a response.
 */

import { Bell } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui';

import { useWorkflowPermissionModal } from './useWorkflowPermissionModal';

export function WorkflowPermissionModal() {
  const {
    queue,
    handleDismiss,
    handlePointerDownOutside,
    handleEscapeKeyDown,
  } = useWorkflowPermissionModal();

  if (queue.length === 0) {
    return null;
  }

  const current = queue[0];

  return (
    <Dialog
      open
      onOpenChange={() => {
        // Intentionally no-op: only the Dismiss button may close this modal
      }}
    >
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Bell aria-hidden="true" className="text-primary h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Agent notification</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                <span className="font-medium">{current.agent}</span>
                <span className="text-muted-foreground"> · {current.ticket}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-foreground py-1 text-sm">{current.message}</p>

        {queue.length > 1 ? (
          <p aria-live="polite" className="text-muted-foreground text-xs">
            {queue.length - 1} more notification{queue.length - 1 === 1 ? '' : 's'} waiting
          </p>
        ) : null}

        <DialogFooter>
          <Button size="md" variant="primary" onClick={handleDismiss}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
