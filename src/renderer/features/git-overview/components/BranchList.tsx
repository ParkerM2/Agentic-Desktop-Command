/**
 * BranchList — Scrollable list of branches with current highlighted,
 * a "New Branch" dialog, and a switch branch action.
 */

import { useState } from 'react';

import { GitBranch, Plus } from 'lucide-react';

import {
  Badge,
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

import { useCreateBranch, useGitBranches } from '../api/useGit';

interface BranchListProps {
  repoPath: string;
}

export function BranchList({ repoPath }: BranchListProps) {
  const { data: branches, isLoading } = useGitBranches(repoPath);
  const createBranch = useCreateBranch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('');

  async function handleCreate() {
    if (!branchName) return;
    await createBranch.mutateAsync({
      repoPath,
      branchName,
      baseBranch: baseBranch || undefined,
    });
    setBranchName('');
    setBaseBranch('');
    setDialogOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleCreate();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Branches</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-7 gap-1 px-2 text-xs" size="sm" variant="outline">
              <Plus className="h-3 w-3" />
              New Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="branch-name">Branch name</Label>
                <Input
                  id="branch-name"
                  placeholder="feature/my-branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-branch">
                  Base branch{' '}
                  <Text className="text-muted-foreground text-xs">(optional)</Text>
                </Label>
                <Input
                  id="base-branch"
                  placeholder="main"
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!branchName || createBranch.isPending}
                onClick={handleCreate}
              >
                {createBranch.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-1 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-0.5 p-2">
              {branches?.map((branch) => (
                <div
                  key={branch.name}
                  className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                    branch.current ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <GitBranch className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <Text className="truncate text-sm">{branch.name}</Text>
                    {branch.current ? (
                      <Badge className="shrink-0 text-xs" variant="secondary">
                        current
                      </Badge>
                    ) : null}
                  </div>
                  {branch.remote === undefined ? null : (
                    <Text className="text-muted-foreground ml-2 shrink-0 text-xs">
                      {branch.remote}
                    </Text>
                  )}
                </div>
              ))}
              {branches === undefined || branches.length === 0 ? (
                <Text className="text-muted-foreground px-3 py-2 text-sm">
                  No branches found.
                </Text>
              ) : null}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
