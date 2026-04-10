/**
 * shared-nav — Shared navigation items for all sidebar layouts
 *
 * Extracted from Sidebar.tsx. Every SidebarLayoutXX component imports
 * these items instead of duplicating the navigation data.
 */


import {
  Bot,
  Briefcase,
  GitBranch,
  Home,
  ListTodo,
  Map,
  Network,
  Plug,
  Terminal,
  User,
  Wrench,
} from 'lucide-react';

import { PROJECT_VIEWS, ROUTES } from '@shared/constants';

import type { LucideIcon } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

// ── Navigation Data ────────────────────────────────────────────

/** Top-level nav items (not project-scoped) */
export const personalItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, path: ROUTES.DASHBOARD },
  { label: 'My Work', icon: Briefcase, path: ROUTES.MY_WORK },
  { label: 'Personal', icon: User, path: ROUTES.PERSONAL },
  { label: 'Integrations', icon: Plug, path: ROUTES.INTEGRATIONS },
];

/** Development nav items (project-scoped) */
export const developmentItems: NavItem[] = [
  { label: 'Workspace', icon: Bot, path: PROJECT_VIEWS.AGENTS },
  { label: 'Tasks', icon: ListTodo, path: PROJECT_VIEWS.TASKS },
  { label: 'Terminals', icon: Terminal, path: PROJECT_VIEWS.TERMINALS },
  { label: 'Planning', icon: Map, path: PROJECT_VIEWS.PLANNING },
  { label: 'Git', icon: GitBranch, path: PROJECT_VIEWS.GIT },
  { label: 'Tools', icon: Wrench, path: PROJECT_VIEWS.TOOLS },
  { label: 'Visual Map', icon: Network, path: PROJECT_VIEWS.VISUALIZATION },
];
