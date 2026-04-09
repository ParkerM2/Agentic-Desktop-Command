/**
 * SubRepoSelector — Checkbox selection of child repositories
 */

import { FolderGit2 } from 'lucide-react';

import type { PROJECTS } from '@shared/ipc/projects/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Checkbox } from '@ui';

type ChildRepo = InvokeOutput<typeof PROJECTS.DETECT.REPO>['childRepos'][number];

interface SubRepoSelectorProps {
  repos: ChildRepo[];
  selected: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export function SubRepoSelector({ repos, selected, onSelectionChange }: SubRepoSelectorProps) {
  function handleToggle(path: string) {
    const next = new Set(selected);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    onSelectionChange(next);
  }

  function handleSelectAll() {
    onSelectionChange(new Set(repos.map((r) => r.path)));
  }

  function handleDeselectAll() {
    onSelectionChange(new Set());
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Selected: {String(selected.size)} of {String(repos.length)}
        </p>
        <div className="flex gap-2">
          <Button className="text-primary h-auto p-0 text-xs" size="sm" type="button" variant="link" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button className="text-muted-foreground h-auto p-0 text-xs" size="sm" type="button" variant="link" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {repos.map((repo) => (
          <label
            key={repo.path}
            className={cn(
              'border-border flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
              'hover:bg-accent',
              selected.has(repo.path) && 'border-primary/50 bg-accent',
            )}
          >
            <Checkbox
              checked={selected.has(repo.path)}
              onCheckedChange={() => handleToggle(repo.path)}
            />
            <FolderGit2 className="text-muted-foreground h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{repo.name}</p>
              <p className="text-muted-foreground truncate text-xs">{repo.relativePath}</p>
              {repo.gitUrl ? (
                <p className="text-muted-foreground truncate text-xs">{repo.gitUrl}</p>
              ) : null}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
