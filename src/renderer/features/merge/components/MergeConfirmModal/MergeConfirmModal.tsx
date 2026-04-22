/**
 * MergeConfirmModal — Full-featured merge dialog with diff preview
 *
 * Near full-screen modal with tabbed Changes/Conflicts views.
 * The Changes tab houses MergePreviewPanel with the full diff viewer.
 */

import { AlertTriangle, ArrowRight, GitMerge, Loader2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ui';

import { ConflictResolver } from '../ConflictResolver';
import { MergePreviewPanel } from '../MergePreviewPanel';

import { useMergeConfirmModal } from './useMergeConfirmModal';

interface MergeConfirmModalProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenTerminal?: (file: string) => void;
}

export function MergeConfirmModal({
  repoPath,
  sourceBranch,
  targetBranch,
  isOpen,
  onClose,
  onSuccess,
  onOpenTerminal,
}: MergeConfirmModalProps) {
  const {
    mergeError,
    mergeBranch,
    diff,
    hasConflicts,
    hasChanges,
    isDataLoading,
    conflictsBadge,
    changesBadge,
    handleMerge,
    handleOpenChange,
  } = useMergeConfirmModal({ repoPath, sourceBranch, targetBranch, isOpen, onClose, onSuccess });

  function getFooterMessage(): React.ReactNode {
    if (isDataLoading) {
      return (
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading merge details...
        </span>
      );
    }
    if (hasConflicts) {
      return (
        <span className="flex items-center gap-1 text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Conflicts detected - merge may require manual resolution
        </span>
      );
    }
    if (hasChanges) {
      return <span>{diff?.changedFiles} files will be merged</span>;
    }
    return <span>No changes to merge</span>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[85vh] w-[90vw] max-w-7xl flex-col p-0">
        <DialogHeader className="border-border flex shrink-0 flex-row items-center gap-3 border-b px-6 py-4">
          <GitMerge className="text-primary h-5 w-5 shrink-0" />
          <div className="flex-1">
            <DialogTitle className="text-foreground text-lg font-semibold">
              Merge Branch
            </DialogTitle>
            <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <span className="text-foreground font-mono text-xs font-medium">{sourceBranch}</span>
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-mono text-xs font-medium">{targetBranch}</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="preview">
          <TabsList className="border-border shrink-0 justify-start rounded-none border-b px-6 py-0">
            <TabsTrigger value="preview">
              Changes
              {changesBadge === undefined ? null : (
                <span className="bg-muted text-muted-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                  {changesBadge}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflicts
              {conflictsBadge === undefined ? null : (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                  {conflictsBadge}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0 min-h-0 flex-1 overflow-hidden" value="preview">
            <MergePreviewPanel
              repoPath={repoPath}
              sourceBranch={sourceBranch}
              targetBranch={targetBranch}
            />
          </TabsContent>

          <TabsContent className="mt-0 min-h-0 flex-1 overflow-hidden" value="conflicts">
            <ScrollArea className="h-full">
              <div className="p-6">
                <ConflictResolver
                  repoPath={repoPath}
                  sourceBranch={sourceBranch}
                  targetBranch={targetBranch}
                  onOpenTerminal={onOpenTerminal}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Error message */}
        {mergeError === null ? null : (
          <div className="mx-6 mb-4 rounded-md bg-red-500/10 p-3">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {mergeError}
            </div>
          </div>
        )}

        {/* Footer */}
        <Separator />
        <div className="flex shrink-0 items-center justify-between px-6 py-4">
          <div className="text-muted-foreground text-xs">{getFooterMessage()}</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={mergeBranch.isPending || !hasChanges}
              onClick={handleMerge}
            >
              {mergeBranch.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <GitMerge className="h-4 w-4" />
                  Merge
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
