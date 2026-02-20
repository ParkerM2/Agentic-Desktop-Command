/**
 * ColorThemeSection — Shows active theme name and navigates to Theme Editor
 */

import { useNavigate } from '@tanstack/react-router';
import { Palette } from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { Button } from '@ui';


// ── Component ───────────────────────────────────────────────

interface ColorThemeSectionProps {
  currentTheme: string;
}

export function ColorThemeSection({ currentTheme }: ColorThemeSectionProps) {
  const navigate = useNavigate();

  const displayName = currentTheme === 'default' ? 'Default' : currentTheme;

  function handleCustomize() {
    // Route registered by Task #6 — type assertion needed until route tree includes /settings/themes
    void navigate({ to: ROUTES.THEMES as '/' });
  }

  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Color Theme
      </h2>
      <div className="border-border bg-card flex items-center justify-between rounded-lg border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Active Theme</span>
          <span className="text-muted-foreground text-xs">{displayName}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleCustomize}>
          <Palette className="mr-1.5 h-4 w-4" />
          Customize Theme
        </Button>
      </div>
    </section>
  );
}
