/**
 * LayoutSection — Sidebar layout selector for Settings > Display
 *
 * Dropdown to pick from 16 sidebar layouts with an SVG wireframe preview card.
 */

import type { SidebarLayoutId } from '@shared/types/layout';
import { SIDEBAR_LAYOUTS } from '@shared/types/layout';

import { useLayoutStore } from '@renderer/shared/stores';

import { Card, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui';

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

// ── SVG Preview Component ──────────────────────────────────

function LayoutPreviewSvg({ config }: { config: LayoutPreviewConfig }) {
  const w = 200;
  const h = 120;
  const pad = config.variant === 'floating' ? 4 : 0;
  const sidebarW = config.sidebarWidth;
  const headerH = 14;
  const rightSidebarW = config.hasSecondSidebar ? 35 : 0;

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${String(w)} ${String(h)}`}>
      {/* Background */}
      <rect className="fill-muted/30" height={h} rx={4} width={w} x={0} y={0} />

      {/* Content header bar */}
      <rect
        className="fill-muted/50"
        height={headerH}
        width={w - sidebarW - rightSidebarW}
        x={config.sidebarSide === 'right' ? 0 : sidebarW}
        y={0}
      />

      {/* Left sidebar */}
      {config.sidebarSide !== 'right' && sidebarW > 0 ? (
        <g>
          <rect
            className="fill-sidebar stroke-border"
            height={h - pad * 2}
            rx={config.variant === 'floating' ? 4 : 0}
            strokeWidth={0.5}
            width={sidebarW - pad}
            x={pad}
            y={pad}
          />
          {/* Section lines */}
          {Array.from({ length: config.sections }).map((_, i) => {
            const sectionH = (h - pad * 2 - 20) / config.sections;
            const y = pad + 20 + i * sectionH;
            return (
              <g key={`section-${String(i)}`}>
                <rect
                  className="fill-muted-foreground/20"
                  height={3}
                  rx={1}
                  width={sidebarW - pad - 16}
                  x={pad + 8}
                  y={y}
                />
                {Array.from({ length: 3 }).map((_unused, j) => (
                  <rect
                    key={`item-${String(i)}-${String(j)}`}
                    className="fill-muted-foreground/10"
                    height={3}
                    rx={1}
                    width={sidebarW - pad - 20}
                    x={pad + 10}
                    y={y + 8 + j * 7}
                  />
                ))}
              </g>
            );
          })}
        </g>
      ) : null}

      {/* Right sidebar (Layout 14 or 15) */}
      {config.sidebarSide === 'right' ? (
        <rect
          className="fill-sidebar stroke-border"
          height={h}
          strokeWidth={0.5}
          width={sidebarW}
          x={w - sidebarW}
          y={0}
        />
      ) : null}

      {/* Second sidebar for dual layout */}
      {config.hasSecondSidebar ? (
        <rect
          className="fill-sidebar/50 stroke-border"
          height={h}
          strokeWidth={0.5}
          width={rightSidebarW}
          x={w - rightSidebarW}
          y={0}
        />
      ) : null}

      {/* Content area placeholder lines */}
      <g>
        {Array.from({ length: 4 }).map((_, i) => {
          const contentX =
            config.sidebarSide === 'right' ? 10 : sidebarW + 10;
          const contentW =
            w - sidebarW - rightSidebarW - 20;
          return (
            <rect
              key={`content-${String(i)}`}
              className="fill-muted-foreground/8"
              height={4}
              rx={2}
              width={contentW * (i === 3 ? 0.6 : 1)}
              x={contentX}
              y={headerH + 12 + i * 10}
            />
          );
        })}
      </g>

      {/* Icon-only indicator for collapsible=icon */}
      {config.collapsible === 'icon' ? (
        <g>
          {Array.from({ length: 4 }).map((_, i) => (
            <rect
              key={`icon-${String(i)}`}
              className="fill-muted-foreground/20"
              height={4}
              rx={1}
              width={4}
              x={pad + 8}
              y={pad + 20 + i * 12}
            />
          ))}
        </g>
      ) : null}

      {/* Offcanvas indicator (no visible sidebar) */}
      {config.collapsible === 'offcanvas' ? (
        <rect
          className="fill-muted-foreground/20"
          height={6}
          rx={1}
          width={12}
          x={6}
          y={4}
        />
      ) : null}
    </svg>
  );
}

// ── Main Section ───────────────────────────────────────────

export function LayoutSection() {
  const { sidebarLayout, setSidebarLayout } = useLayoutStore();
  const updateSettings = useUpdateSettings();

  const selectedMeta = SIDEBAR_LAYOUTS.find((l) => l.id === sidebarLayout);
  const previewConfig = LAYOUT_PREVIEWS[sidebarLayout];

  function handleLayoutChange(value: string) {
    const layoutId = value as SidebarLayoutId;
    setSidebarLayout(layoutId);
    updateSettings.mutate({ sidebarLayout: layoutId });
  }

  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Sidebar Layout
      </h2>

      <div className="flex gap-4">
        {/* Left: Select dropdown */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="sidebar-layout">Layout Style</Label>
          <Select value={sidebarLayout} onValueChange={handleLayoutChange}>
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
          {selectedMeta ? (
            <p className="text-muted-foreground text-xs">{selectedMeta.description}</p>
          ) : null}
        </div>

        {/* Right: Preview card */}
        <Card className="flex h-[140px] w-[220px] shrink-0 items-center justify-center p-2">
          <LayoutPreviewSvg config={previewConfig} />
        </Card>
      </div>
    </section>
  );
}
