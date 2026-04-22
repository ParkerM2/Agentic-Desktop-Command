/**
 * Layout Types — Preset-based layout system
 *
 * Two layout presets (default, floating) each map to a fixed
 * sidebar + toolbar + content combination.
 */

// ── Sidebar ────────────────────────────────────────────────

export type SidebarLayoutId = 'sidebar-04' | 'sidebar-07';

export interface SidebarLayoutMeta {
  id: SidebarLayoutId;
  label: string;
  description: string;
}

export const SIDEBAR_LAYOUTS: SidebarLayoutMeta[] = [
  { id: 'sidebar-07', label: 'Icon Collapse', description: 'Sidebar that collapses to icons' },
  { id: 'sidebar-04', label: 'Floating', description: 'Floating sidebar with detached visual style' },
];

export const SIDEBAR_LAYOUT_IDS: [SidebarLayoutId, ...SidebarLayoutId[]] = [
  'sidebar-04', 'sidebar-07',
];

// ── Toolbar ────────────────────────────────────────────────

export type ToolbarStyleId = 'default' | 'floating';

export interface ToolbarStyleMeta {
  id: ToolbarStyleId;
  label: string;
  description: string;
}

export const TOOLBAR_STYLES: ToolbarStyleMeta[] = [
  { id: 'default', label: 'Standard', description: 'Default toolbar with solid background and bottom border' },
  { id: 'floating', label: 'Floating', description: 'Detached bar with rounded corners and shadow' },
];

export const TOOLBAR_STYLE_IDS: [ToolbarStyleId, ...ToolbarStyleId[]] = [
  'default', 'floating',
];

// ── Content ────────────────────────────────────────────────

export type ContentLayoutId = 'flush' | 'bordered';

export interface ContentLayoutMeta {
  id: ContentLayoutId;
  label: string;
  description: string;
}

export const CONTENT_LAYOUTS: ContentLayoutMeta[] = [
  { id: 'flush', label: 'Flush', description: 'No padding — content extends edge to edge' },
  { id: 'bordered', label: 'Bordered', description: 'Rounded border with inner spacing' },
];

export const CONTENT_LAYOUT_IDS: [ContentLayoutId, ...ContentLayoutId[]] = [
  'flush', 'bordered',
];

// ── Layout Presets ─────────────────────────────────────────

export type LayoutPreset = 'default' | 'floating';

export interface LayoutPresetConfig {
  id: LayoutPreset;
  label: string;
  description: string;
  sidebar: SidebarLayoutId;
  toolbar: ToolbarStyleId;
  content: ContentLayoutId;
}

export const LAYOUT_PRESETS: LayoutPresetConfig[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Icon-collapse sidebar, flush content, standard toolbar',
    sidebar: 'sidebar-07',
    toolbar: 'default',
    content: 'flush',
  },
  {
    id: 'floating',
    label: 'Floating',
    description: 'Floating sidebar and toolbar, bordered content area',
    sidebar: 'sidebar-04',
    toolbar: 'floating',
    content: 'bordered',
  },
];

export const LAYOUT_PRESET_IDS: [LayoutPreset, ...LayoutPreset[]] = [
  'default', 'floating',
];

/** Look up a preset config by ID, falling back to 'default' */
export function getPresetConfig(id: LayoutPreset): LayoutPresetConfig {
  return LAYOUT_PRESETS.find((p) => p.id === id) ?? LAYOUT_PRESETS[0];
}
