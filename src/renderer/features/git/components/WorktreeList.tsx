/**
 * WorktreeList — Lists all git worktrees for a project with add/remove actions.
 *
 * Accepts repoPath (for create/remove mutations) and projectId (for the list query).
 * Displays path (truncated), branch name, and createdAt as relative time.
 * "Add Worktree" opens a dialog with worktreePath + branch inputs.
 * Each row has a "Remove" button that shows a confirmation dialog before deleting.
 */

import { useState } from 'react';

import { GitFork, Plus, Trash2 } from 'lucide-react';

import { formatRelativeTime } from '@renderer/shared/lib/utils';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  ScrollArea,
  Skeleton,
  Text,
} from '@ui';

import { useCreateWorktree, useListWorktrees, useRemoveWorktree } from '../api/useGit';

export interface WorktreeListProps {
  repoPath: string;
  projectId: string;
}

export function WorktreeList({ repoPath, projectId }: WorktreeListProps) {
  const { data: worktrees, isLoading } = useListWorktrees(projectId);
  const createWorktree = useCreateWorktree();
  const removeWorktree = useRemoveWorktree();

  const [addOpen, setAddOpen] = useState(false);
  const [worktreePath, setWorktreePath] = useState('');
  const [branch, setBranch] = useState('');

  async function handleCreate() {
    if (!worktreePath || !branch) return;
    await createWorktree.mutateAsync({ repoPath, worktreePath, branch });
    setWorktreePath('');
    setBranch('');
    setAddOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleCreate();
    }
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="space-y-1 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }

    const hasWorktrees = (worktrees?.length ?? 0) > 0;

    if (!hasWorktrees) {
      return (
        <Text className="text-muted-foreground px-4 py-3 text-sm">No worktrees found.</Text>
      );
    }

    return (
      <ScrollArea className="h-48">
        <div className="space-y-0.5 p-2">
          {worktrees?.map((worktree) => (
            <div
              key={worktree.id}
              className="hover:bg-accent/50 flex items-center justify-between rounded px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <GitFork className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                <Text className="truncate max-w-xs text-sm">{worktree.path}</Text>
                <Text className="text-muted-foreground shrink-0 text-xs">{worktree.branch}</Text>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-2">
                <Text className="text-muted-foreground text-xs">
                  {formatRelativeTime(worktree.createdAt)}
                </Text>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      aria-label={`Remove worktree at ${worktree.path}`}
                      className="h-7 w-7"
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Worktree</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove worktree at {worktree.path}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          removeWorktree.mutate({ repoPath, worktreePath: worktree.path });
                        }}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Worktrees</CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-7 gap-1 px-2 text-xs" size="sm" variant="outline">
              <Plus className="h-3 w-3" />
              Add Worktree
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Worktree</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="worktree-path">Worktree path</Label>
                <Input
                  id="worktree-path"
                  placeholder="/path/to/worktree"
                  value={worktreePath}
                  onChange={(e) => setWorktreePath(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="worktree-branch">Branch</Label>
                <Input
                  id="worktree-branch"
                  placeholder="feature/my-branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!worktreePath || !branch || createWorktree.isPending}
                onClick={() => {
                  void handleCreate();
                }}
              >
                {createWorktree.isPending ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">{renderContent()}</CardContent>
    </Card>
  );
}
