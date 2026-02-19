/**
 * Project route group — Project list + nested project views
 */

import { type AnyRoute, createRoute, redirect } from '@tanstack/react-router';

import { ROUTE_PATTERNS, ROUTES } from '@shared/constants';

import { AgentDashboard } from '@features/agents';
import { ChangelogPage } from '@features/changelog';
import { GitHubPage } from '@features/github';
import { IdeationPage } from '@features/ideation';
import { InsightsPage } from '@features/insights';
import { ProjectListPage } from '@features/projects';
import { RoadmapPage } from '@features/roadmap';
import { TaskDataGrid } from '@features/tasks';
import { TerminalGrid } from '@features/terminals';
import { WorkflowPipelinePage } from '@features/workflow-pipeline';

export function createProjectRoutes(appLayoutRoute: AnyRoute) {
  const projectsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PROJECTS,
    component: ProjectListPage,
  });

  const projectRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT,
    beforeLoad: ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTE_PATTERNS.PROJECT_TASKS, params });
    },
  });

  const tasksRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_TASKS,
    component: TaskDataGrid,
  });

  const terminalsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_TERMINALS,
    component: TerminalGrid,
  });

  const agentsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_AGENTS,
    component: AgentDashboard,
  });

  const githubRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_GITHUB,
    component: GitHubPage,
  });

  const roadmapRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_ROADMAP,
    component: RoadmapPage,
  });

  const ideationRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_IDEATION,
    component: IdeationPage,
  });

  const changelogRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_CHANGELOG,
    component: ChangelogPage,
  });

  const insightsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_INSIGHTS,
    component: InsightsPage,
  });

  const workflowRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_WORKFLOW,
    component: WorkflowPipelinePage,
  });

  return [
    projectsRoute,
    projectRoute,
    tasksRoute,
    terminalsRoute,
    agentsRoute,
    githubRoute,
    roadmapRoute,
    ideationRoute,
    changelogRoute,
    insightsRoute,
    workflowRoute,
  ] as const;
}
