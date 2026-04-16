import { PageContent } from '@ui';

interface SetupCardProps {
  projectId: string;
}

export function SetupCard({ projectId: _projectId }: SetupCardProps) {
  return (
    <PageContent>
      <div className="p-6 text-text-muted">Setup (placeholder)</div>
    </PageContent>
  );
}
