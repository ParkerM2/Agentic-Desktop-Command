/**
 * LayoutSection — Layout settings for Settings > Display
 *
 * 2x2 bordered grid:
 *   ┌─────────────────┬─────────────────────┐
 *   │  Sidebar config  │  Content Area config │
 *   ├─────────────────┼─────────────────────┤
 *   │  Toolbar config  │  Unified SVG preview │
 *   └─────────────────┴─────────────────────┘
 *
 * The SVG shows all three regions (sidebar, toolbar, content) with
 * color-coded tints and a gap between sidebar and content/toolbar
 * to match the actual app shell.
 */

import { useNavigate } from '@tanstack/react-router';
import { Check, Settings2 } from 'lucide-react';

import { ROUTES } from '@shared/constants';
import type { ContentLayoutId, SidebarLayoutId, ToolbarStyleId } from '@shared/types/layout';
import { CONTENT_LAYOUTS, SIDEBAR_LAYOUTS, TOOLBAR_STYLES } from '@shared/types/layout';

import { useLayoutStore, useThemeStore } from '@renderer/shared/stores';

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ui';

import { useUpdateSettings } from '../api/useSettings';

// ── SVG Preview Data ───────────────────────────────────────

interface LayoutPreviewConfig {
  sidebarSide: 'left' | 'right' | 'both';
  sidebarWidth: number;
  hasSecondSidebar: boolean;
  variant: 'default' | 'floating' | 'inset';
  collapsible: 'default' | 'icon' | 'offcanvas';
  sections: number;
}

const LAYOUT_PREVIEWS: Record<SidebarLayoutId, LayoutPreviewConfig> = {
  'sidebar-01': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 2 },
  'sidebar-02': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 2 },
  'sidebar-03': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 3 },
  'sidebar-04': { sidebarSide: 'left', sidebarWidth: 55, hasSecondSidebar: false, variant: 'floating', collapsible: 'default', sections: 2 },
  'sidebar-05': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 3 },
  'sidebar-06': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 2 },
  'sidebar-07': { sidebarSide: 'left', sidebarWidth: 20, hasSecondSidebar: false, variant: 'default', collapsible: 'icon', sections: 2 },
  'sidebar-08': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'inset', collapsible: 'default', sections: 2 },
  'sidebar-09': { sidebarSide: 'left', sidebarWidth: 80, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 4 },
  'sidebar-10': { sidebarSide: 'left', sidebarWidth: 20, hasSecondSidebar: false, variant: 'floating', collapsible: 'icon', sections: 2 },
  'sidebar-11': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 3 },
  'sidebar-12': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 2 },
  'sidebar-13': { sidebarSide: 'left', sidebarWidth: 0, hasSecondSidebar: false, variant: 'default', collapsible: 'offcanvas', sections: 2 },
  'sidebar-14': { sidebarSide: 'right', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 2 },
  'sidebar-15': { sidebarSide: 'both', sidebarWidth: 50, hasSecondSidebar: true, variant: 'default', collapsible: 'default', sections: 2 },
  'sidebar-16': { sidebarSide: 'left', sidebarWidth: 60, hasSecondSidebar: false, variant: 'default', collapsible: 'default', sections: 2 },
};

// ── SVG tint colors ────────────────────────────────────────

const SIDEBAR_TINT = 'oklch(0.65 0.15 230 / 0.12)';
const TOOLBAR_TINT = 'oklch(0.70 0.10 50 / 0.12)';
const CONTENT_TINT = 'oklch(0.75 0.12 170 / 0.10)';

// ── SVG Sub-components ────────────────────────────────────

interface PreviewDimensions {
  w: number;
  h: number;
  pad: number;
  gap: number;
  sidebarW: number;
  headerH: number;
  rightSidebarW: number;
  contentX: number;
  contentW: number;
}

function SidebarSections({ config, dims }: { config: LayoutPreviewConfig; dims: PreviewDimensions }) {
  const { pad, sidebarW, h } = dims;
  return (
    <>
      {Array.from({ length: config.sections }).map((_, i) => {
        const sectionH = (h - pad * 2 - 24) / config.sections;
        const sy = pad + 24 + i * sectionH;
        return (
          <g key={`section-${String(i)}`}>
            <rect className="fill-muted-foreground/20" height={3} rx={1} width={sidebarW - pad - 16} x={pad + 8} y={sy} />
            {Array.from({ length: 3 }).map((_unused, j) => (
              <rect key={`item-${String(i)}-${String(j)}`} className="fill-muted-foreground/10" height={3} rx={1} width={sidebarW - pad - 20} x={pad + 10} y={sy + 8 + j * 7} />
            ))}
          </g>
        );
      })}
    </>
  );
}

function ContentDetail({ layoutId, dims }: { layoutId: ContentLayoutId; dims: PreviewDimensions }) {
  const { contentX, contentW, headerH, h } = dims;
  const INSET_MAP: Record<ContentLayoutId, number> = { flush: 0, padded: 4, bordered: 5, inset: 8 };
  const inset = INSET_MAP[layoutId];
  const innerX = contentX + inset;
  const innerY = headerH + inset;
  const innerW = contentW - inset * 2;
  const innerH = h - headerH - inset * 2;

  return (
    <g>
      {layoutId === 'bordered' ? (
        <rect className="stroke-border" fill="none" height={innerH} rx={4} strokeWidth={0.5} width={innerW} x={innerX} y={innerY} />
      ) : null}
      {layoutId === 'inset' ? (
        <rect className="fill-muted/30 stroke-border" height={innerH} rx={6} strokeWidth={0.5} width={innerW} x={innerX} y={innerY} />
      ) : null}
      {Array.from({ length: 5 }).map((_, i) => (
        <rect
          key={`line-${String(i)}`}
          className="fill-muted-foreground/10"
          height={5}
          rx={2}
          width={(innerW - 20) * (i === 4 ? 0.5 : 0.9 - i * 0.08)}
          x={innerX + 10}
          y={innerY + 10 + i * 12}
        />
      ))}
    </g>
  );
}

// ── Unified SVG Preview ───────────────────────────────────

function UnifiedLayoutPreview({
  sidebarConfig,
  toolbarStyleId,
  contentLayoutId,
}: {
  sidebarConfig: LayoutPreviewConfig;
  toolbarStyleId: ToolbarStyleId;
  contentLayoutId: ContentLayoutId;
}) {
  const w = 320;
  const h = 160;
  const pad = sidebarConfig.variant === 'floating' ? 4 : 0;
  const gap = sidebarConfig.variant === 'inset' ? 6 : 3;
  const sidebarW = sidebarConfig.sidebarWidth;
  const rightSidebarW = sidebarConfig.hasSecondSidebar ? 35 : 0;

  // Toolbar height varies by style
  const TOOLBAR_H: Record<ToolbarStyleId, number> = {
    default: 16, compact: 12, spacious: 22, floating: 14,
    bordered: 16, glass: 16, minimal: 10, inset: 16,
  };
  const headerH = TOOLBAR_H[toolbarStyleId];

  // Content starts after sidebar + gap
  const contentX = sidebarConfig.sidebarSide === 'right' ? 0 : sidebarW + gap;
  const contentW = w - sidebarW - rightSidebarW - gap;
  const dims: PreviewDimensions = { w, h, pad, gap, sidebarW, headerH, rightSidebarW, contentX, contentW };

  const showLeftSidebar = sidebarConfig.sidebarSide === 'left' || sidebarConfig.sidebarSide === 'both';
  const floatingRx = sidebarConfig.variant === 'floating' ? 4 : 0;

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${String(w)} ${String(h)}`}>
      <rect className="fill-muted/20" height={h} rx={6} width={w} x={0} y={0} />

      {/* Sidebar tint */}
      {showLeftSidebar && sidebarW > 0 ? (
        <rect fill={SIDEBAR_TINT} height={h - pad * 2} rx={floatingRx} width={sidebarW - pad} x={pad} y={pad} />
      ) : null}
      {sidebarConfig.sidebarSide === 'right' ? (
        <rect fill={SIDEBAR_TINT} height={h} width={sidebarW} x={w - sidebarW} y={0} />
      ) : null}
      {sidebarConfig.hasSecondSidebar ? (
        <rect fill={SIDEBAR_TINT} height={h} opacity={0.6} width={rightSidebarW} x={w - rightSidebarW} y={0} />
      ) : null}

      {/* Toolbar tint */}
      <rect fill={TOOLBAR_TINT} height={headerH} width={contentW} x={contentX} y={0} />
      {/* Toolbar bottom border for 'bordered' style */}
      {toolbarStyleId === 'bordered' ? (
        <line className="stroke-border" strokeWidth={1} x1={contentX} x2={contentX + contentW} y1={headerH} y2={headerH} />
      ) : null}

      {/* Content tint */}
      <rect fill={CONTENT_TINT} height={h - headerH} width={contentW} x={contentX} y={headerH} />

      {/* Sidebar detail */}
      {showLeftSidebar && sidebarW > 0 ? (
        <g>
          <rect className="stroke-border" fill="none" height={h - pad * 2} rx={floatingRx} strokeWidth={0.5} width={sidebarW - pad} x={pad} y={pad} />
          {sidebarConfig.collapsible === 'icon' ? null : <SidebarSections config={sidebarConfig} dims={dims} />}
        </g>
      ) : null}

      {sidebarConfig.collapsible === 'icon' ? (
        <g>
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={`icon-${String(i)}`} className="fill-muted-foreground/25" height={5} rx={1} width={5} x={pad + 7} y={pad + 24 + i * 14} />
          ))}
        </g>
      ) : null}

      {sidebarConfig.collapsible === 'offcanvas' ? (
        <rect className="fill-muted-foreground/20" height={8} rx={2} width={14} x={6} y={4} />
      ) : null}

      {sidebarConfig.sidebarSide === 'right' ? (
        <rect className="stroke-border" fill="none" height={h} strokeWidth={0.5} width={sidebarW} x={w - sidebarW} y={0} />
      ) : null}

      {/* Toolbar detail — small indicator blocks */}
      <g>
        <rect className="fill-muted-foreground/15" height={Math.max(headerH - 8, 4)} rx={2} width={30} x={contentX + 6} y={4} />
        <rect className="fill-muted-foreground/10" height={Math.max(headerH - 8, 4)} rx={2} width={20} x={contentX + contentW - 30} y={4} />
      </g>

      {/* Content area detail */}
      <ContentDetail dims={dims} layoutId={contentLayoutId} />

      <rect className="stroke-border" fill="none" height={h} rx={6} strokeWidth={0.5} width={w} x={0} y={0} />
    </svg>
  );
}

// ── Main Section ───────────────────────────────────────────

export function LayoutSection() {
  const {
    sidebarLayout, setSidebarLayout,
    toolbarStyle, setToolbarStyle,
    contentLayout, setContentLayout,
  } = useLayoutStore();
  const { colorTheme, setColorTheme, customThemes } = useThemeStore();
  const updateSettings = useUpdateSettings();
  const navigate = useNavigate();

  const selectedSidebar = SIDEBAR_LAYOUTS.find((l) => l.id === sidebarLayout);
  const selectedToolbar = TOOLBAR_STYLES.find((l) => l.id === toolbarStyle);
  const selectedContent = CONTENT_LAYOUTS.find((l) => l.id === contentLayout);
  const previewConfig = LAYOUT_PREVIEWS[sidebarLayout];

  function handleSidebarChange(value: string) {
    const layoutId = value as SidebarLayoutId;
    setSidebarLayout(layoutId);
    updateSettings.mutate({ sidebarLayout: layoutId });
  }

  function handleToolbarChange(value: string) {
    setToolbarStyle(value as ToolbarStyleId);
  }

  function handleContentChange(value: string) {
    setContentLayout(value as ContentLayoutId);
  }

  function handleThemeChange(value: string) {
    setColorTheme(value);
    updateSettings.mutate({ colorTheme: value });
  }

  function handleCustomizeTheme() {
    void navigate({ to: ROUTES.THEMES as '/' });
  }

  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Layout
      </h2>

      <div className="border-border grid grid-cols-2 grid-rows-2 overflow-hidden rounded-lg border">
        {/* ── Top-left: Sidebar ──────────────────── */}
        <div className="border-border space-y-3 border-r border-b p-4">
          <Text className="text-foreground text-sm font-medium">Sidebar</Text>
          <div className="flex flex-col gap-3">
            <Label htmlFor="sidebar-layout">Style</Label>
            <Select value={sidebarLayout} onValueChange={handleSidebarChange}>
              <SelectTrigger id="sidebar-layout">
                <SelectValue placeholder="Select a layout" />
              </SelectTrigger>
              <SelectContent>
                {SIDEBAR_LAYOUTS.map((layout) => (
                  <SelectItem key={layout.id} value={layout.id}>
                    {layout.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSidebar ? (
              <Text className="text-xs" variant="muted">{selectedSidebar.description}</Text>
            ) : null}
          </div>
        </div>

        {/* ── Top-right: Content Area ────────────── */}
        <div className="border-border space-y-3 border-b p-4">
          <Text className="text-foreground text-sm font-medium">Main Content Area</Text>
          <div className="flex flex-col gap-3">
            <Label htmlFor="content-layout">Style</Label>
            <Select value={contentLayout} onValueChange={handleContentChange}>
              <SelectTrigger id="content-layout">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_LAYOUTS.map((layout) => (
                  <SelectItem key={layout.id} value={layout.id}>
                    {layout.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedContent ? (
              <Text className="text-xs" variant="muted">{selectedContent.description}</Text>
            ) : null}
          </div>
        </div>

        {/* ── Bottom-left: Top Toolbar ────────────── */}
        <div className="border-border space-y-3 border-r p-4">
          <Text className="text-foreground text-sm font-medium">Top Toolbar</Text>
          <div className="flex flex-col gap-3">
            <Label htmlFor="toolbar-style">Style</Label>
            <Select value={toolbarStyle} onValueChange={handleToolbarChange}>
              <SelectTrigger id="toolbar-style">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {TOOLBAR_STYLES.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedToolbar ? (
              <Text className="text-xs" variant="muted">{selectedToolbar.description}</Text>
            ) : null}
          </div>
        </div>

        {/* ── Bottom-right: Theme + Preview ────────── */}
        <div className="bg-card/50 flex flex-col gap-3 p-4">
          {/* Theme selector row */}
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 flex flex-col gap-3">
              <Label htmlFor="color-theme">Color Theme</Label>
              <Select value={colorTheme} onValueChange={handleThemeChange}>
                <SelectTrigger id="color-theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <span className="flex items-center gap-2">
                      Default
                      {colorTheme === 'default' ? <Check className="text-success h-3 w-3" /> : null}
                    </span>
                  </SelectItem>
                  {customThemes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        {t.name}
                        {colorTheme === t.id ? <Check className="text-success h-3 w-3" /> : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={handleCustomizeTheme}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit themes</TooltipContent>
            </Tooltip>
          </div>

          {/* SVG preview */}
          <div className="h-[90px] w-full">
            <UnifiedLayoutPreview
              contentLayoutId={contentLayout}
              sidebarConfig={previewConfig}
              toolbarStyleId={toolbarStyle}
            />
          </div>
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SIDEBAR_TINT }} />
              <Text className="text-[9px]" variant="muted">Sidebar</Text>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: TOOLBAR_TINT }} />
              <Text className="text-[9px]" variant="muted">Toolbar</Text>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CONTENT_TINT }} />
              <Text className="text-[9px]" variant="muted">Content</Text>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
