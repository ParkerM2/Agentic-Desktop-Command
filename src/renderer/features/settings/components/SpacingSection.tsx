/**
 * SpacingSection — Layout spacing density slider
 */

import { Input, Label } from '@ui';

// ── Constants ───────────────────────────────────────────────

const SPACING_MIN = 0;
const SPACING_MAX = 16;
const SPACING_STEP = 2;

// ── Component ───────────────────────────────────────────────

interface SpacingSectionProps {
  currentGap: number;
  onGapChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SpacingSection({ currentGap, onGapChange }: SpacingSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Spacing
      </h2>
      <div className="flex items-center gap-4">
        <Label className="text-muted-foreground w-16 shrink-0 text-sm">Compact</Label>
        <Input
          aria-label="Layout spacing density"
          className="bg-muted accent-primary h-2 flex-1 cursor-pointer appearance-none rounded-full border-0"
          max={SPACING_MAX}
          min={SPACING_MIN}
          step={SPACING_STEP}
          type="range"
          value={currentGap}
          onChange={onGapChange}
        />
        <Label className="text-muted-foreground w-16 shrink-0 text-right text-sm">Spacious</Label>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-sm">
        Current: <span className="text-foreground font-medium">{currentGap}</span>
      </p>
    </section>
  );
}
