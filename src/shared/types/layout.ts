/**
 * Sidebar Layout Types
 *
 * Defines the 16 available sidebar layout variants and their metadata.
 */

export type SidebarLayoutId =
  | 'sidebar-01'
  | 'sidebar-02'
  | 'sidebar-03'
  | 'sidebar-04'
  | 'sidebar-05'
  | 'sidebar-06'
  | 'sidebar-07'
  | 'sidebar-08'
  | 'sidebar-09'
  | 'sidebar-10'
  | 'sidebar-11'
  | 'sidebar-12'
  | 'sidebar-13'
  | 'sidebar-14'
  | 'sidebar-15'
  | 'sidebar-16';

export interface SidebarLayoutMeta {
  id: SidebarLayoutId;
  label: string;
  description: string;
}

export const SIDEBAR_LAYOUTS: SidebarLayoutMeta[] = [
  { id: 'sidebar-01', label: 'Grouped', description: 'Simple sidebar with navigation grouped by section' },
  { id: 'sidebar-02', label: 'Collapsible Sections', description: 'Sidebar with collapsible sections' },
  { id: 'sidebar-03', label: 'Submenus', description: 'Sidebar with inline expandable sub-items' },
  { id: 'sidebar-04', label: 'Floating', description: 'Floating sidebar with detached visual style' },
  { id: 'sidebar-05', label: 'Collapsible Submenus', description: 'Sidebar with collapsible sub-items and search' },
  { id: 'sidebar-06', label: 'Dropdown Submenus', description: 'Sidebar with submenus as dropdowns' },
  { id: 'sidebar-07', label: 'Icon Collapse', description: 'Sidebar that collapses to icons' },
  { id: 'sidebar-08', label: 'Inset + Secondary', description: 'Inset sidebar with secondary navigation' },
  { id: 'sidebar-09', label: 'Nested', description: 'Collapsible nested sidebars' },
  { id: 'sidebar-10', label: 'Popover', description: 'Sidebar in a popover panel' },
  { id: 'sidebar-11', label: 'File Tree', description: 'Sidebar with collapsible file tree' },
  { id: 'sidebar-12', label: 'Calendar', description: 'Sidebar with calendar widget' },
  { id: 'sidebar-13', label: 'Dialog', description: 'Modal-based navigation sidebar' },
  { id: 'sidebar-14', label: 'Right Side', description: 'Right-aligned sidebar' },
  { id: 'sidebar-15', label: 'Dual', description: 'Left and right sidebar layout' },
  { id: 'sidebar-16', label: 'Sticky Header', description: 'Sidebar with persistent header above' },
];

export const SIDEBAR_LAYOUT_IDS: [SidebarLayoutId, ...SidebarLayoutId[]] = [
  'sidebar-01', 'sidebar-02', 'sidebar-03', 'sidebar-04',
  'sidebar-05', 'sidebar-06', 'sidebar-07', 'sidebar-08',
  'sidebar-09', 'sidebar-10', 'sidebar-11', 'sidebar-12',
  'sidebar-13', 'sidebar-14', 'sidebar-15', 'sidebar-16',
];
