/**
 * WorktreeList — STUB (Task #3 fills this in)
 *
 * Exports the prop interface so GitPage can type-check cleanly.
 */

export interface WorktreeListProps {
  repoPath: string;
  projectId: string;
}

export function WorktreeList(_props: WorktreeListProps) {
  return (
    <div className="text-muted-foreground p-4 text-sm">Worktrees coming soon...</div>
  );
}
