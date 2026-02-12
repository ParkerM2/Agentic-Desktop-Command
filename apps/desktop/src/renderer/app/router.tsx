/**
 * Router — TanStack Router route definitions
 *
 * All routes defined here. Each route maps to a feature's page component.
 * Deep linking works automatically (e.g. /projects/$projectId/kanban/task/$taskId).
 */
import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from '@tanstack/react-router';
import { RootLayout } from './RootLayout';

// Lazy-loaded feature pages
const KanbanPage = () => import('@/features/kanban/components/KanbanPage').then(m => m.default);
const TerminalsPage = () => import('@/features/terminals/components/TerminalsPage').then(m => m.default);
const SettingsPage = () => import('@/features/settings/components/SettingsPage').then(m => m.default);

// ─── Route Tree ─────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    // Redirect to first project or onboarding
    return <div>Select or create a project to get started.</div>;
  },
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
});

const kanbanRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/kanban',
  component: () => <div>Kanban Board (placeholder)</div>,
});

const terminalsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/terminals',
  component: () => <div>Terminals (placeholder)</div>,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => <div>Settings (placeholder)</div>,
});

// ─── Router Instance ────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute.addChildren([kanbanRoute, terminalsRoute]),
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Type-safe router for useNavigate, Link, etc.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
