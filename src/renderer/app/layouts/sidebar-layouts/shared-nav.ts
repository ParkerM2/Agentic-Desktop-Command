/**
 * shared-nav — Shared navigation items for all sidebar layouts
 *
 * Extracted from Sidebar.tsx. Every SidebarLayoutXX component imports
 * these items instead of duplicating the navigation data.
 */


import {
  BarChart3,
  Bot,
  Briefcase,
  Dumbbell,
  Headphones,
  Home,
  ListTodo,
  Network,
  Terminal,
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

/** Personal nav items (not project-scoped) */
export const personalItems: NavItem[] = [
  { label: 'Home', icon: Home, path: ROUTES.DASHBOARD },
  { label: 'My Work', icon: Briefcase, path: ROUTES.MY_WORK },
  { label: 'Fitness', icon: Dumbbell, path: ROUTES.FITNESS },
  { label: 'Productivity', icon: Headphones, path: ROUTES.PRODUCTIVITY },
];

/** Development nav items (project-scoped) */
export const developmentItems: NavItem[] = [
  { label: 'Workspace', icon: Bot, path: PROJECT_VIEWS.AGENTS },
  { label: 'Tasks', icon: ListTodo, path: PROJECT_VIEWS.TASKS },
  { label: 'Terminals', icon: Terminal, path: PROJECT_VIEWS.TERMINALS },
  { label: 'Visual Map', icon: Network, path: PROJECT_VIEWS.VISUALIZATION },
  { label: 'Tools', icon: BarChart3, path: PROJECT_VIEWS.TOOLS },
];
