/**
 * RecentProjects — Grid of recently used project cards
 */

import { FolderOpen, Loader2, Sparkles, Wand2 } from 'lucide-react';

import { cn, formatRelativeTime, truncate } from '@renderer/shared/lib/utils';

import { Button, Card, CardContent, EmptyState } from '@ui';

import { CreateProjectWizard, ProjectInitWizard } from '@features/projects';

import { useRecentProjects } from './useRecentProjects';

export function RecentProjects() {
  const {
    projects,
    isLoading,
    wizardOpen,
    setWizardOpen,
    createWizardOpen,
    setCreateWizardOpen,
    handleOpenProject,
    handleWizardSetupStarted,
    handleProjectCreated,
  } = useRecentProjects();

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-foreground mb-3 text-sm font-semibold">Recent Projects</p>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {projects.map((project) => (
              <Button
                key={project.id}
                type="button"
                variant="ghost"
                className={cn(
                  'border-border flex h-auto items-start gap-3 rounded-md border p-3 text-left',
                  'hover:bg-accent transition-colors',
                )}
                onClick={() => handleOpenProject(project.id)}
              >
                <FolderOpen className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">{project.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {truncate(project.path, 40)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatRelativeTime(project.updatedAt)}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            size="sm"
            title="No projects yet"
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setWizardOpen(true)}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Init Wizard
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setCreateWizardOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  New Project
                </Button>
              </div>
            }
          />
        )}

        {wizardOpen ? (
          <ProjectInitWizard
            onClose={() => setWizardOpen(false)}
            onSetupStarted={handleWizardSetupStarted}
          />
        ) : null}

        <CreateProjectWizard
          open={createWizardOpen}
          onClose={() => setCreateWizardOpen(false)}
          onProjectCreated={handleProjectCreated}
        />
      </CardContent>
    </Card>
  );
}
