/**
 * LayoutSection — Layout settings for Settings > Display
 *
 * Simplified preset-based layout:
 *   ┌─────────────────┬─────────────────────┐
 *   │  Layout preset   │  Color theme + edit │
 *   ├─────────────────┴─────────────────────┤
 *   │         Unified SVG preview            │
 *   │         + color legend                 │
 *   └───────────────────────────────────────┘
 */

import { useNavigate } from '@tanstack/react-router';
import { Check, Settings2 } from 'lucide-react';

import { ROUTES } from '@shared/constants';
import type { LayoutPreset } from '@shared/types/layout';
import { LAYOUT_PRESETS, getPresetConfig } from '@shared/types/layout';

import { useLayoutStore, useThemeStore } from '@renderer/shared/stores';

import {
  Button,
  Heading,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Text,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ui';

import { useUpdateSettings } from '../api/useSettings';

// ── SVG tint colors ────────────────────────────────────────

const SIDEBAR_TINT = 'oklch(0.65 0.15 230 / 0.12)';
const TOOLBAR_TINT = 'oklch(0.70 0.10 50 / 0.12)';
const CONTENT_TINT = 'oklch(0.75 0.12 170 / 0.10)';

// ── SVG Preview ────────────────────────────────────────────

function LayoutPreview({ preset }: { preset: LayoutPreset }) {
  const config = getPresetConfig(preset);
  const w = 320;
  const h = 160;
  const isFloating = preset === 'floating';
  const pad = isFloating ? 4 : 0;
  const gap = 3;
  const sidebarW = isFloating ? 55 : 20;
  const headerH = isFloating ? 14 : 16;
  const contentX = sidebarW + gap;
  const contentW = w - sidebarW - gap;
  const floatingRx = isFloating ? 4 : 0;

  const isBordered = config.content === 'bordered';
  const contentInset = isBordered ? 5 : 0;
  const innerX = contentX + contentInset;
  const innerY = headerH + contentInset;
  const innerW = contentW - contentInset * 2;
  const innerH = h - headerH - contentInset * 2;

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${String(w)} ${String(h)}`}>
      <rect className="fill-muted/20" height={h} rx={6} width={w} x={0} y={0} />

      {/* Sidebar tint */}
      <rect fill={SIDEBAR_TINT} height={h - pad * 2} rx={floatingRx} width={sidebarW - pad} x={pad} y={pad} />

      {/* Toolbar tint */}
      <rect fill={TOOLBAR_TINT} height={headerH} width={contentW} x={contentX} y={0} />

      {/* Content tint */}
      <rect fill={CONTENT_TINT} height={h - headerH} width={contentW} x={contentX} y={headerH} />

      {/* Sidebar border */}
      <rect className="stroke-border" fill="none" height={h - pad * 2} rx={floatingRx} strokeWidth={0.5} width={sidebarW - pad} x={pad} y={pad} />

      {/* Sidebar detail */}
      {isFloating ? (
        <>
          <rect className="fill-muted-foreground/20" height={3} rx={1} width={sidebarW - pad - 16} x={pad + 8} y={pad + 24} />
          {Array.from({ length: 3 }).map((_, j) => (
            <rect key={`s1-${String(j)}`} className="fill-muted-foreground/10" height={3} rx={1} width={sidebarW - pad - 20} x={pad + 10} y={pad + 32 + j * 7} />
          ))}
          <rect className="fill-muted-foreground/20" height={3} rx={1} width={sidebarW - pad - 16} x={pad + 8} y={pad + 65} />
          {Array.from({ length: 3 }).map((_, j) => (
            <rect key={`s2-${String(j)}`} className="fill-muted-foreground/10" height={3} rx={1} width={sidebarW - pad - 20} x={pad + 10} y={pad + 73 + j * 7} />
          ))}
        </>
      ) : (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={`icon-${String(i)}`} className="fill-muted-foreground/25" height={5} rx={1} width={5} x={pad + 7} y={pad + 24 + i * 14} />
          ))}
        </>
      )}

      {/* Toolbar detail */}
      <rect className="fill-muted-foreground/15" height={Math.max(headerH - 8, 4)} rx={2} width={30} x={contentX + 6} y={4} />
      <rect className="fill-muted-foreground/10" height={Math.max(headerH - 8, 4)} rx={2} width={20} x={contentX + contentW - 30} y={4} />

      {/* Content border (bordered layout only) */}
      {isBordered ? (
        <rect className="stroke-border" fill="none" height={innerH} rx={4} strokeWidth={0.5} width={innerW} x={innerX} y={innerY} />
      ) : null}

      {/* Content lines */}
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

      <rect className="stroke-border" fill="none" height={h} rx={6} strokeWidth={0.5} width={w} x={0} y={0} />
    </svg>
  );
}

// ── Main Section ───────────────────────────────────────────

export function LayoutSection() {
  const { layoutPreset, setLayoutPreset } = useLayoutStore();
  const { colorTheme, setColorTheme, customThemes } = useThemeStore();
  const updateSettings = useUpdateSettings();
  const navigate = useNavigate();

  function handlePresetChange(value: string) {
    const preset = value as LayoutPreset;
    setLayoutPreset(preset);
    updateSettings.mutate({ layoutPreset: preset });
  }

  function handleThemeChange(value: string) {
    setColorTheme(value);
    updateSettings.mutate({ colorTheme: value });
  }

  function handleCustomizeTheme() {
    void navigate({ to: ROUTES.THEMES as '/' });
  }

  const selectedPreset = LAYOUT_PRESETS.find((p) => p.id === layoutPreset);

  return (
    <section className="mb-8">
      <Heading as="h2" className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Layout
      </Heading>

      <div className="border-border overflow-hidden rounded-lg border">
        {/* Top row: preset + theme */}
        <div className="grid grid-cols-2">
          {/* Layout Preset */}
          <div className="border-border space-y-3 border-r p-4">
            <Text className="text-foreground text-sm font-medium">Layout</Text>
            <div className="flex flex-col gap-3">
              <Label htmlFor="layout-preset">Preset</Label>
              <Select value={layoutPreset} onValueChange={handlePresetChange}>
                <SelectTrigger id="layout-preset">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPreset ? (
                <Text className="text-xs" variant="muted">{selectedPreset.description}</Text>
              ) : null}
            </div>
          </div>

          {/* Color Theme */}
          <div className="space-y-3 p-4">
            <Text className="text-foreground text-sm font-medium">Theme</Text>
            <div className="flex flex-col gap-3">
              <Label htmlFor="color-theme">Color Theme</Label>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
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
            </div>
          </div>
        </div>

        {/* Bottom: SVG preview */}
        <Separator />
        <div className="p-4">
          <div className="h-[90px] w-full">
            <LayoutPreview preset={layoutPreset} />
          </div>
          <div className="mt-2 flex justify-center gap-4">
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
