import { Circle, Clock, GitBranch, GitCommit } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

interface MockCommit {
  hash: string;
  message: string;
  author: string;
  time: string;
}

const MOCK_COMMITS: MockCommit[] = [
  { hash: 'abc1234', message: 'Fix authentication flow', author: 'developer', time: '2 hours ago' },
  {
    hash: 'def5678',
    message: 'Add settings page controls',
    author: 'developer',
    time: '5 hours ago',
  },
  {
    hash: 'ghi9012',
    message: 'Update README with setup instructions',
    author: 'developer',
    time: '1 day ago',
  },
  {
    hash: 'jkl3456',
    message: 'Initial project scaffold',
    author: 'developer',
    time: '3 days ago',
  },
];

const MOCK_BRANCHES = ['main', 'develop', 'feature/settings', 'feature/profiles', 'feature/github'];

export function GitHubPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <GitBranch className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-bold">GitHub</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Repository overview and version control
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <GitBranch className="h-3.5 w-3.5" />
            Current Branch
          </div>
          <p className="text-lg font-semibold">main</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <GitBranch className="h-3.5 w-3.5" />
            Active Branches
          </div>
          <p className="text-lg font-semibold">{MOCK_BRANCHES.length}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <Clock className="h-3.5 w-3.5" />
            Last Commit
          </div>
          <p className="text-lg font-semibold">2h ago</p>
        </div>
      </div>

      {/* Recent Commits */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Recent Commits
        </h2>
        <div className="border-border bg-card divide-border divide-y rounded-lg border">
          {MOCK_COMMITS.map((commit) => (
            <div key={commit.hash} className="flex items-center gap-3 p-3">
              <GitCommit className="text-primary h-4 w-4 shrink-0" />
              <code className="text-muted-foreground text-xs">{commit.hash}</code>
              <span className="min-w-0 flex-1 truncate text-sm">{commit.message}</span>
              <span className="text-muted-foreground shrink-0 text-xs">{commit.time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Branches */}
      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Branches
        </h2>
        <div className="flex flex-wrap gap-2">
          {MOCK_BRANCHES.map((branch) => (
            <div
              key={branch}
              className={cn(
                'border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                branch === 'main' && 'border-primary',
              )}
            >
              <Circle
                className={cn(
                  'h-2 w-2',
                  branch === 'main'
                    ? 'fill-primary text-primary'
                    : 'fill-muted-foreground text-muted-foreground',
                )}
              />
              <span>{branch}</span>
              {branch === 'main' ? (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                  default
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
