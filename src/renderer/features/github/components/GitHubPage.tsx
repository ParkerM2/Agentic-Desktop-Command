import { GitBranch } from 'lucide-react';

export function GitHubPage() {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
      <GitBranch className="mb-3 h-12 w-12 opacity-40" />
      <p className="text-sm font-medium">GitHub Integration</p>
      <p className="mt-1 text-xs">Coming soon — will be ported from Claude-Auto.</p>
    </div>
  );
}
