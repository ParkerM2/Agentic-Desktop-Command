/**
 * MyWorkPage -- Cross-project task view
 *
 * Displays all progress tasks from SQLite, optionally grouped by team name.
 * Includes status filter, search input, sort dropdown, priority/Jira/PR badges,
 * and clickable rows that navigate to the project tasks view.
 */

import { Briefcase, Filter, RefreshCw } from 'lucide-react';

import type { ProgressTask } from '@shared/types/progress';

import {
  Button,
  EmptyState,
  PageContent,
  PageHeader,
  PageLayout,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@ui';

import { TeamGroup } from '../TeamGroup';

import {
  SORT_OPTIONS,
  STATUS_OPTIONS,
  getTaskCountLabel,
  useMyWorkPage,
} from './useMyWorkPage';

import type { TasksByTeam } from '../TeamGroup';


/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MyWorkEmptyState({ hasFilter }: { hasFilter: boolean }) {
  const title = hasFilter ? 'No tasks match filter' : 'No tasks yet';
  const description = hasFilter
    ? 'Try selecting a different status filter or changing your search to see more tasks.'
    : 'Tasks will appear here once you create them. Add a project and create tasks to get started.';

  return (
    <EmptyState
      description={description}
      icon={Briefcase}
      size="lg"
      title={title}
    />
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      description="Unable to load tasks. The progress database may be unavailable."
      icon={RefreshCw}
      size="lg"
      title="Failed to load tasks"
      action={
        <Button onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      }
    />
  );
}

interface TaskListContentProps {
  isLoading: boolean;
  isError: boolean;
  taskGroups: TasksByTeam[];
  hasFilter: boolean;
  onRetry: () => void;
  onNavigate: (task: ProgressTask) => void;
}

function TaskListContent({
  isLoading,
  isError,
  taskGroups,
  hasFilter,
  onRetry,
  onNavigate,
}: TaskListContentProps) {
  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12">
        Loading tasks...
      </div>
    );
  }

  if (taskGroups.length === 0) {
    return <MyWorkEmptyState hasFilter={hasFilter} />;
  }

  return (
    <div className="space-y-4">
      {taskGroups.map((group) => (
        <TeamGroup
          key={group.teamName}
          group={group}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function MyWorkPage() {
  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    tasksLoading,
    tasksError,
    taskGroups,
    totalTasks,
    hasFilter,
    handleRetry,
    handleTaskNavigate,
  } = useMyWorkPage();

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="All tasks across your projects">
            My Work
          </PageHeader.Title>
          <PageHeader.Actions>
            <SearchInput
              className="w-[200px]"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              onClear={() => { setSearchQuery(''); }}
            />
            <Filter className="text-muted-foreground h-4 w-4" />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => { setSortField(v as typeof sortField); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Text className="text-xs" variant="muted">
              {totalTasks} {getTaskCountLabel(totalTasks)}
            </Text>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      <PageContent>
        <TaskListContent
          hasFilter={hasFilter}
          isError={tasksError}
          isLoading={tasksLoading}
          taskGroups={taskGroups}
          onNavigate={handleTaskNavigate}
          onRetry={handleRetry}
        />
      </PageContent>
    </PageLayout>
  );
}
