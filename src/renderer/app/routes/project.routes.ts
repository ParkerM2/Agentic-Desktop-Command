/**
 * Project route group — Project list + nested project views
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';

import { ROUTE_PATTERNS, ROUTES } from '@shared/constants';

import { ProjectSkeleton } from '../components/route-skeletons';

export function createProjectRoutes(appLayoutRoute: AnyRoute) {
  const projectsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PROJECTS,
    staticData: { breadcrumbLabel: 'Projects' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/projects'),
      'ProjectListPage',
    ),
  });

  const projectRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT,
    staticData: { breadcrumbLabel: 'Project' },
    beforeLoad: ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTE_PATTERNS.PROJECT_TASKS, params });
    },
  });

  const tasksRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_TASKS,
    staticData: { breadcrumbLabel: 'Tasks' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/tasks'),
      'ProgressTaskGrid',
    ),
  });

  const terminalsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_TERMINALS,
    staticData: { breadcrumbLabel: 'Terminals' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/terminals'),
      'TerminalGrid',
    ),
  });

  const agentsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_AGENTS,
    staticData: { breadcrumbLabel: 'Workspace' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/workspace'),
      'WorkspacePage',
    ),
  });

  const planningRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_PLANNING,
    staticData: { breadcrumbLabel: 'Planning' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/planning'),
      'PlanningPage',
    ),
  });

  const gitRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_GIT,
    staticData: { breadcrumbLabel: 'Git' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/git-overview'),
      'GitPage',
    ),
  });

  // ── Legacy redirect routes ──────────────────────────────────
  const roadmapRedirect = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_ROADMAP,
    beforeLoad: ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTE_PATTERNS.PROJECT_PLANNING, params });
    },
  });

  const ideationRedirect = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_IDEATION,
    beforeLoad: ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTE_PATTERNS.PROJECT_PLANNING, params });
    },
  });

  const insightsRedirect = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_INSIGHTS,
    beforeLoad: ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTE_PATTERNS.PROJECT_PLANNING, params });
    },
  });

  const githubRedirect = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_GITHUB,
    beforeLoad: ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTE_PATTERNS.PROJECT_GIT, params });
    },
  });

  const changelogRedirect = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_CHANGELOG,
    beforeLoad: ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTE_PATTERNS.PROJECT_GIT, params });
    },
  });

  const toolsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_TOOLS,
    staticData: { breadcrumbLabel: 'Tools' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/tools'),
      'ToolsPage',
    ),
  });

  const workflowRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_WORKFLOW,
    staticData: { breadcrumbLabel: 'Pipeline' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/workflow-pipeline'),
      'WorkflowPipelinePage',
    ),
  });

  const visualizationRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_VISUALIZATION,
    staticData: { breadcrumbLabel: 'Visual Map' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/visualization'),
      'VisualizationPage',
    ),
  });

  const qaRecorderRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_QA_RECORDER,
    staticData: { breadcrumbLabel: 'QA Recorder' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      // @ts-expect-error -- qa-recorder feature is built in parallel (Task #37); resolves at runtime
      () => import('@features/qa-recorder'),
      'QaRecorderPage',
    ),
  });

  return [
    projectsRoute,
    projectRoute,
    tasksRoute,
    terminalsRoute,
    agentsRoute,
    planningRoute,
    gitRoute,
    toolsRoute,
    workflowRoute,
    visualizationRoute,
    qaRecorderRoute,
    // Legacy redirects
    roadmapRedirect,
    ideationRedirect,
    insightsRedirect,
    githubRedirect,
    changelogRedirect,
  ] as const;
}
