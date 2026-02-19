/**
 * ColorThemeSection — Color theme swatch grid selector
 */

import { Check } from 'lucide-react';

import { COLOR_THEMES, COLOR_THEME_LABELS } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';


// ── Constants ───────────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────────

interface ColorThemeSectionProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export function ColorThemeSection({ currentTheme, onThemeChange }: ColorThemeSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Color Theme
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {COLOR_THEMES.map((theme) => (
          <Button
            key={theme}
            variant="outline"
            className={cn(
              'relative flex h-auto flex-col items-center gap-2 rounded-lg p-3',
              currentTheme === theme && 'border-primary bg-accent',
            )}
            onClick={() => onThemeChange(theme)}
          >
            <div className={cn('h-8 w-8 rounded-full', THEME_SWATCH_COLORS[theme] ?? '')} />
            <span className="text-xs font-medium">{COLOR_THEME_LABELS[theme]}</span>
            {currentTheme === theme ? (
              <Check className="text-primary absolute top-1.5 right-1.5 h-3.5 w-3.5" />
            ) : null}
          </Button>
        ))}
      </div>
    </section>
  );
}
