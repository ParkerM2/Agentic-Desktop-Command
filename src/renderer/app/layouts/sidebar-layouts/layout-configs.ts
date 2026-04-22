/**
 * layout-configs — Declarative config for each sidebar layout variant
 *
 * Instead of 16 separate SidebarLayoutXX components, each layout is
 * described by a config object that drives a single AppSidebar component.
 */

import type { SidebarLayoutId } from '@shared/types/layout';

// ── Types ──────────────────────────────────────────────────────

export type CollapsibleMode = 'icon' | 'offcanvas' | 'none';
export type SidebarVariant = 'sidebar' | 'floating' | 'inset';
export type GroupStyle = 'flat' | 'collapsible' | 'nested-submenu' | 'tree' | 'nested-categorized';
export type SidebarSide = 'left' | 'right';

export interface DevSubGroup {
  label: string;
  startIndex: number;
  endIndex: number;
}

export interface DualSidebarConfig {
  rightVariant?: SidebarVariant;
  rightSide?: SidebarSide;
}

export interface SidebarLayoutConfig {
  /** Props passed to <Sidebar> */
  collapsible?: CollapsibleMode;
  variant?: SidebarVariant;
  side?: SidebarSide;
  className?: string;
  /** How nav groups render */
  groupStyle: GroupStyle;
  /** Whether menu items show tooltips (for icon-collapse modes) */
  showTooltips?: boolean;
  /** For nested-categorized: how to split development items */
  devSubGroups?: DevSubGroup[];
  /** Dual sidebar config (Layout 15 only) */
  dualSidebar?: DualSidebarConfig;
}

// ── Layout Configs ────────────────────────────────────────────

export const LAYOUT_CONFIGS: Record<SidebarLayoutId, SidebarLayoutConfig> = {
  'sidebar-04': { groupStyle: 'collapsible', variant: 'floating' },
  'sidebar-07': { groupStyle: 'flat', showTooltips: true },
};
