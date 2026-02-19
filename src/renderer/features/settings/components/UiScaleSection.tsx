/**
 * UiScaleSection — UI scale percentage slider
 */

import { Input } from '@ui';

// ── Constants ───────────────────────────────────────────────

const UI_SCALE_MIN = 75;
const UI_SCALE_MAX = 150;
const UI_SCALE_STEP = 5;

// ── Component ───────────────────────────────────────────────

interface UiScaleSectionProps {
  currentScale: number;
  onScaleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UiScaleSection({ currentScale, onScaleChange }: UiScaleSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        UI Scale
      </h2>
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground w-10 text-sm">{UI_SCALE_MIN}%</span>
        <Input
          aria-label="UI scale percentage"
          className="bg-muted accent-primary h-2 flex-1 cursor-pointer appearance-none rounded-full border-0"
          max={UI_SCALE_MAX}
          min={UI_SCALE_MIN}
          step={UI_SCALE_STEP}
          type="range"
          value={currentScale}
          onChange={onScaleChange}
        />
        <span className="text-muted-foreground w-10 text-right text-sm">{UI_SCALE_MAX}%</span>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-sm">
        Current: <span className="text-foreground font-medium">{currentScale}%</span>
      </p>
    </section>
  );
}
