/**
 * BranchSelector — Displays and selects git branches for a project
 */

import { ChevronDown, GitBranch, Plus } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from '@ui';

import { useBranchSelector } from './useBranchSelector';

interface BranchSelectorProps {
  repoPath: string;
}

export function BranchSelector({ repoPath }: BranchSelectorProps) {
  const {
    status,
    branches,
    isLoading,
    isOpen,
    showNewBranch,
    newBranchName,
    createBranch,
    setIsOpen,
    setShowNewBranch,
    setNewBranchName,
    handleCreateBranch,
    handleKeyDown,
  } = useBranchSelector({ repoPath });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Spinner className="text-muted-foreground" size="sm" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button className="gap-2" size="sm" variant="outline">
          <GitBranch className="h-3.5 w-3.5" />
          <span className="font-medium">{status?.branch ?? 'unknown'}</span>
          {status ? (
            <span className="text-muted-foreground text-xs">
              {status.isClean ? '' : `${String(status.modified.length)} modified`}
            </span>
          ) : null}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[200px] p-0">
        <div className="max-h-60 overflow-y-auto p-1">
          {branches?.map((b) => (
            <div
              key={b.name}
              className={cn(
                'flex items-center gap-2 rounded px-3 py-1.5 text-sm',
                b.current ? 'bg-accent font-medium' : 'hover:bg-accent/50 cursor-pointer',
              )}
            >
              <GitBranch className="h-3 w-3" />
              <span>{b.name}</span>
              {b.current ? (
                <span className="text-muted-foreground ml-auto text-xs">current</span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="border-border border-t p-1">
          {showNewBranch ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <Input
                className="h-6 flex-1 rounded border px-2 py-0.5 text-xs"
                placeholder="new-branch"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                className="h-6 px-2 py-0.5 text-xs"
                disabled={!newBranchName || createBranch.isPending}
                size="sm"
                onClick={handleCreateBranch}
              >
                Create
              </Button>
            </div>
          ) : (
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
              onClick={() => setShowNewBranch(true)}
            >
              <Plus className="h-3 w-3" />
              New branch
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
