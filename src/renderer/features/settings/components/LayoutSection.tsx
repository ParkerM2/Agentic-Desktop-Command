/**
 * LayoutSection — Layout settings for Settings > Display
 *
 * Split into two bordered config panels (Sidebar + Main Content Area)
 * with a single unified SVG preview below that shows both sections
 * together. Each section in the preview is tinted to match the config
 * panel it belongs to.
 */

import type { ContentLayoutId, SidebarLayoutId } from '@shared/types/layout';
import { CONTENT_LAYOUTS, SIDEBAR_LAYOUTS } from '@shared/types/layout';

import { useLayoutStore } from '@renderer/shared/stores';

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
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

// ── Unified SVG Preview ───────────────────────────────────

/** Tint colors — sidebar region uses info tint, content region uses primary tint */
const SIDEBAR_TINT = 'oklch(0.65 0.15 230 / 0.12)';
const CONTENT_TINT = 'oklch(0.75 0.12 170 / 0.10)';

// ── SVG Sub-components ────────────────────────────────────

interface PreviewDimensions {
  w: number;
  h: number;
  pad: number;
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

  // Inset padding amount per content style
  const INSET_MAP: Record<ContentLayoutId, number> = { flush: 0, padded: 4, bordered: 5, inset: 8 };
  const inset = INSET_MAP[layoutId];
  const innerX = contentX + inset;
  const innerY = headerH + inset;
  const innerW = contentW - inset * 2;
  const innerH = h - headerH - inset * 2;

  return (
    <g>
      {/* Border / inset frame for non-flush styles */}
      {layoutId === 'bordered' ? (
        <rect className="stroke-border" fill="none" height={innerH} rx={4} strokeWidth={0.5} width={innerW} x={innerX} y={innerY} />
      ) : null}
      {layoutId === 'inset' ? (
        <rect className="fill-muted/30 stroke-border" height={innerH} rx={6} strokeWidth={0.5} width={innerW} x={innerX} y={innerY} />
      ) : null}

      {/* Content placeholder lines */}
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
  contentLayoutId,
}: {
  sidebarConfig: LayoutPreviewConfig;
  contentLayoutId: ContentLayoutId;
}) {
  const w = 320;
  const h = 160;
  const pad = sidebarConfig.variant === 'floating' ? 4 : 0;
  const sidebarW = sidebarConfig.sidebarWidth;
  const headerH = 16;
  const rightSidebarW = sidebarConfig.hasSecondSidebar ? 35 : 0;
  const contentX = sidebarConfig.sidebarSide === 'right' ? 0 : sidebarW;
  const contentW = w - sidebarW - rightSidebarW;
  const dims: PreviewDimensions = { w, h, pad, sidebarW, headerH, rightSidebarW, contentX, contentW };

  const showLeftSidebar = sidebarConfig.sidebarSide === 'left' || sidebarConfig.sidebarSide === 'both';
  const floatingRx = sidebarConfig.variant === 'floating' ? 4 : 0;

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${String(w)} ${String(h)}`}>
      <rect className="fill-muted/20" height={h} rx={6} width={w} x={0} y={0} />

      {/* Sidebar region tint */}
      {showLeftSidebar && sidebarW > 0 ? (
        <rect fill={SIDEBAR_TINT} height={h - pad * 2} rx={floatingRx} width={sidebarW - pad} x={pad} y={pad} />
      ) : null}
      {sidebarConfig.sidebarSide === 'right' ? (
        <rect fill={SIDEBAR_TINT} height={h} width={sidebarW} x={w - sidebarW} y={0} />
      ) : null}
      {sidebarConfig.hasSecondSidebar ? (
        <rect fill={SIDEBAR_TINT} height={h} opacity={0.6} width={rightSidebarW} x={w - rightSidebarW} y={0} />
      ) : null}

      {/* Content region tint + top bar */}
      <rect fill={CONTENT_TINT} height={h - headerH} width={contentW} x={contentX} y={headerH} />
      <rect className="fill-muted/50" height={headerH} width={contentW} x={contentX} y={0} />

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

      {/* Content area detail */}
      <ContentDetail dims={dims} layoutId={contentLayoutId} />

      <rect className="stroke-border" fill="none" height={h} rx={6} strokeWidth={0.5} width={w} x={0} y={0} />
    </svg>
  );
}

// ── Main Section ───────────────────────────────────────────

export function LayoutSection() {
  const { sidebarLayout, setSidebarLayout, contentLayout, setContentLayout } = useLayoutStore();
  const updateSettings = useUpdateSettings();

  const selectedSidebar = SIDEBAR_LAYOUTS.find((l) => l.id === sidebarLayout);
  const selectedContent = CONTENT_LAYOUTS.find((l) => l.id === contentLayout);
  const previewConfig = LAYOUT_PREVIEWS[sidebarLayout];

  function handleSidebarChange(value: string) {
    const layoutId = value as SidebarLayoutId;
    setSidebarLayout(layoutId);
    updateSettings.mutate({ sidebarLayout: layoutId });
  }

  function handleContentChange(value: string) {
    const layoutId = value as ContentLayoutId;
    setContentLayout(layoutId);
  }

  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Layout
      </h2>

      <div className="border-border overflow-hidden rounded-lg border">
        {/* ── Config row ──────────────────────────── */}
        <div className="grid grid-cols-2">
          {/* Sidebar config */}
          <div className="border-border space-y-2 border-r p-4">
            <Text className="text-foreground text-sm font-medium">Sidebar</Text>
            <div className="space-y-1.5">
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

          {/* Content area config */}
          <div className="space-y-2 p-4">
            <Text className="text-foreground text-sm font-medium">Main Content Area</Text>
            <div className="space-y-1.5">
              <Label htmlFor="content-layout">Style</Label>
              <Select value={contentLayout} onValueChange={handleContentChange}>
                <SelectTrigger id="content-layout">
                  <SelectValue placeholder="Select a layout" />
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
        </div>

        {/* ── Unified preview ─────────────────────── */}
        <div className="border-border bg-card/50 border-t px-6 py-4">
          <div className="mx-auto h-[140px] max-w-[400px]">
            <UnifiedLayoutPreview contentLayoutId={contentLayout} sidebarConfig={previewConfig} />
          </div>
          <div className="mt-2 flex justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: SIDEBAR_TINT }}
              />
              <Text className="text-[10px]" variant="muted">Sidebar</Text>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: CONTENT_TINT }}
              />
              <Text className="text-[10px]" variant="muted">Content Area</Text>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
