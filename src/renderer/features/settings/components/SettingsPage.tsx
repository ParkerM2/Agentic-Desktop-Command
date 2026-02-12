/**
 * SettingsPage — App settings view
 *
 * Sections: Appearance (mode + color theme), UI Scale, Typography, Language, About
 */

import { useId, useState } from 'react';

import { Check, ChevronDown, Loader2, Monitor, Moon, Sun } from 'lucide-react';

import { COLOR_THEMES, COLOR_THEME_LABELS } from '@shared/constants';
import type { ThemeMode } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';
import { useThemeStore } from '@renderer/shared/stores';

import { useSettings, useUpdateSettings } from '../api/useSettings';

import { ProfileSection } from './ProfileSection';

const themeOptions: Array<{
// ── Constants ───────────────────────────────────────────────

const THEME_MODE_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

/** Dark-mode primary colors for each color theme, used as swatch previews */
const THEME_SWATCH_COLORS: Record<string, string> = {
  default: 'bg-[#D6D876]',
  dusk: 'bg-[#E6E7A3]',
  lime: 'bg-[#8B5CF6]',
  ocean: 'bg-[#38BDF8]',
  retro: 'bg-[#FBBF24]',
  neo: 'bg-[#F0ABFC]',
  forest: 'bg-[#4ADE80]',
};

const FONT_FAMILY_OPTIONS = [
  { value: 'system-ui', label: 'System Default' },
  { value: "'Inter'", label: 'Inter' },
  { value: "'JetBrains Mono'", label: 'JetBrains Mono' },
  { value: "'Fira Code'", label: 'Fira Code' },
  { value: "'SF Mono'", label: 'SF Mono' },
] as const;

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 20;

const UI_SCALE_MIN = 75;
const UI_SCALE_MAX = 150;
const UI_SCALE_STEP = 5;

// ── Component ───────────────────────────────────────────────

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { mode, colorTheme, uiScale, setMode, setColorTheme, setUiScale } = useThemeStore();

  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const fontListboxId = useId();

  const currentFontFamily = settings?.fontFamily ?? 'system-ui';
  const currentFontSize = settings?.fontSize ?? 14;

  function handleThemeChange(newMode: ThemeMode) {
    setMode(newMode);
    updateSettings.mutate({ theme: newMode });
  }

  function handleColorThemeChange(theme: string) {
    setColorTheme(theme);
    updateSettings.mutate({ colorTheme: theme });
  }

  function handleUiScaleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const scale = Number(event.target.value);
    setUiScale(scale);
    updateSettings.mutate({ uiScale: scale });
  }

  function handleFontFamilyChange(fontFamily: string) {
    document.documentElement.style.setProperty('--app-font-sans', fontFamily);
    updateSettings.mutate({ fontFamily });
    setFontDropdownOpen(false);
  }

  function handleFontSizeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fontSize = Number(event.target.value);
    document.documentElement.style.setProperty('--app-font-size', `${String(fontSize)}px`);
    updateSettings.mutate({ fontSize });
  }

  function handleFontDropdownKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFontDropdownOpen(!fontDropdownOpen);
    } else if (event.key === 'Escape') {
      setFontDropdownOpen(false);
    }
  }

  function handleFontOptionKeyDown(event: React.KeyboardEvent, fontFamily: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFontFamilyChange(fontFamily);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const currentFontLabel =
    FONT_FAMILY_OPTIONS.find((opt) => opt.value === currentFontFamily)?.label ?? 'System Default';

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-8">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      {/* ── Appearance Mode ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Appearance
        </h2>
        <div className="flex gap-3">
          {THEME_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              className={cn(
                'border-border flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                'hover:bg-accent',
                mode === opt.mode && 'border-primary bg-accent',
              )}
              onClick={() => handleThemeChange(opt.mode)}
            >
              <opt.icon className="h-6 w-6" />
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Profiles */}
      <ProfileSection />

      {/* About */}
      {/* ── Color Theme ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Color Theme
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              className={cn(
                'border-border relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
                'hover:bg-accent',
                colorTheme === theme && 'border-primary bg-accent',
              )}
              onClick={() => handleColorThemeChange(theme)}
            >
              <div
                className={cn('h-8 w-8 rounded-full', THEME_SWATCH_COLORS[theme] ?? '')}
              />
              <span className="text-xs font-medium">
                {COLOR_THEME_LABELS[theme]}
              </span>
              {colorTheme === theme ? (
                <Check className="text-primary absolute top-1.5 right-1.5 h-3.5 w-3.5" />
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {/* ── UI Scale ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          UI Scale
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground w-10 text-sm">{UI_SCALE_MIN}%</span>
          <input
            aria-label="UI scale percentage"
            className="bg-muted accent-primary h-2 flex-1 cursor-pointer appearance-none rounded-full"
            max={UI_SCALE_MAX}
            min={UI_SCALE_MIN}
            step={UI_SCALE_STEP}
            type="range"
            value={uiScale}
            onChange={handleUiScaleChange}
          />
          <span className="text-muted-foreground w-10 text-right text-sm">{UI_SCALE_MAX}%</span>
        </div>
        <p className="text-muted-foreground mt-2 text-center text-sm">
          Current: <span className="text-foreground font-medium">{uiScale}%</span>
        </p>
      </section>

      {/* ── Font Family ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Font Family
        </h2>
        <div className="relative">
          <button
            aria-controls={fontListboxId}
            aria-expanded={fontDropdownOpen}
            aria-haspopup="listbox"
            aria-label="Select font family"
            role="combobox"
            type="button"
            className={cn(
              'border-border bg-card flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-colors',
              'hover:bg-accent focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
            )}
            onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
            onKeyDown={handleFontDropdownKeyDown}
          >
            <span>{currentFontLabel}</span>
            <ChevronDown
              className={cn(
                'text-muted-foreground h-4 w-4 transition-transform',
                fontDropdownOpen && 'rotate-180',
              )}
            />
          </button>
          {fontDropdownOpen ? (
            <div
              className="border-border bg-card absolute z-10 mt-1 w-full overflow-hidden rounded-lg border shadow-lg"
              id={fontListboxId}
              role="listbox"
            >
              {FONT_FAMILY_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  aria-selected={currentFontFamily === opt.value}
                  role="option"
                  tabIndex={0}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition-colors',
                    'hover:bg-accent',
                    currentFontFamily === opt.value && 'bg-accent text-primary',
                  )}
                  onClick={() => handleFontFamilyChange(opt.value)}
                  onKeyDown={(event) => handleFontOptionKeyDown(event, opt.value)}
                >
                  <span>{opt.label}</span>
                  {currentFontFamily === opt.value ? (
                    <Check className="text-primary h-4 w-4" />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Font Size ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Font Size
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground w-10 text-sm">{FONT_SIZE_MIN}px</span>
          <input
            aria-label="Font size in pixels"
            className="bg-muted accent-primary h-2 flex-1 cursor-pointer appearance-none rounded-full"
            max={FONT_SIZE_MAX}
            min={FONT_SIZE_MIN}
            step={1}
            type="range"
            value={currentFontSize}
            onChange={handleFontSizeChange}
          />
          <span className="text-muted-foreground w-10 text-right text-sm">{FONT_SIZE_MAX}px</span>
        </div>
        <p className="text-muted-foreground mt-2 text-center text-sm">
          Current: <span className="text-foreground font-medium">{currentFontSize}px</span>
        </p>
      </section>

      {/* ── Language ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Language
        </h2>
        <div
          className="border-border bg-card flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
        >
          <span>English</span>
          <span className="text-muted-foreground text-xs">Only language available</span>
        </div>
      </section>

      {/* ── About ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          About
        </h2>
        <p className="text-muted-foreground text-sm">Claude UI v0.1.0</p>
      </section>
    </div>
  );
}
