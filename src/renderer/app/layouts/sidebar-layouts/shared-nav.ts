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
  GitBranch,
  Headphones,
  Home,
  Lightbulb,
  ListTodo,
  Map,
  Plus,
  ScrollText,
  Settings,
  Terminal,
  Workflow,
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
  { label: 'Dashboard', icon: Home, path: ROUTES.DASHBOARD },
  { label: 'My Work', icon: Briefcase, path: ROUTES.MY_WORK },
  { label: 'Fitness', icon: Dumbbell, path: ROUTES.FITNESS },
  { label: 'Productivity', icon: Headphones, path: ROUTES.PRODUCTIVITY },
];

/** Development nav items (project-scoped) */
export const developmentItems: NavItem[] = [
  { label: 'Tasks', icon: ListTodo, path: PROJECT_VIEWS.TASKS },
  { label: 'Terminals', icon: Terminal, path: PROJECT_VIEWS.TERMINALS },
  { label: 'Agents', icon: Bot, path: PROJECT_VIEWS.AGENTS },
  { label: 'Pipeline', icon: Workflow, path: PROJECT_VIEWS.WORKFLOW },
  { label: 'Roadmap', icon: Map, path: PROJECT_VIEWS.ROADMAP },
  { label: 'Ideation', icon: Lightbulb, path: PROJECT_VIEWS.IDEATION },
  { label: 'GitHub', icon: GitBranch, path: PROJECT_VIEWS.GITHUB },
  { label: 'Changelog', icon: ScrollText, path: PROJECT_VIEWS.CHANGELOG },
  { label: 'Insights', icon: BarChart3, path: PROJECT_VIEWS.INSIGHTS },
];

/** Standalone nav items (footer section) */
export const settingsItem: NavItem = {
  label: 'Settings',
  icon: Settings,
  path: ROUTES.SETTINGS,
};

export const addProjectItem: NavItem = {
  label: 'Add Project',
  icon: Plus,
  path: ROUTES.PROJECTS,
};
