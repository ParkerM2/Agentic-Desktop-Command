/**
 * TypographySection — Font family dropdown + font size slider
 */

import { useId, useState } from 'react';

import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Input } from '@ui';


// ── Constants ───────────────────────────────────────────────

const FONT_FAMILY_OPTIONS = [
  { value: 'system-ui', label: 'System Default' },
  { value: "'Inter'", label: 'Inter' },
  { value: "'JetBrains Mono'", label: 'JetBrains Mono' },
  { value: "'Fira Code'", label: 'Fira Code' },
  { value: "'SF Mono'", label: 'SF Mono' },
] as const;

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 20;

// ── Component ───────────────────────────────────────────────

interface TypographySectionProps {
  currentFontFamily: string;
  currentFontSize: number;
  onFontFamilyChange: (fontFamily: string) => void;
  onFontSizeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TypographySection({
  currentFontFamily,
  currentFontSize,
  onFontFamilyChange,
  onFontSizeChange,
}: TypographySectionProps) {
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const fontListboxId = useId();

  const currentFontLabel =
    FONT_FAMILY_OPTIONS.find((opt) => opt.value === currentFontFamily)?.label ?? 'System Default';

  function handleFontFamilySelect(fontFamily: string) {
    onFontFamilyChange(fontFamily);
    setFontDropdownOpen(false);
  }

  function handleDropdownKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFontDropdownOpen(!fontDropdownOpen);
    } else if (event.key === 'Escape') {
      setFontDropdownOpen(false);
    }
  }

  function handleOptionKeyDown(event: React.KeyboardEvent, fontFamily: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFontFamilySelect(fontFamily);
    }
  }

  return (
    <>
      {/* ── Font Family ── */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Font Family
        </h2>
        <div className="relative">
          <Button
            aria-controls={fontListboxId}
            aria-expanded={fontDropdownOpen}
            aria-haspopup="listbox"
            aria-label="Select font family"
            className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm"
            role="combobox"
            variant="outline"
            onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
            onKeyDown={handleDropdownKeyDown}
          >
            <span>{currentFontLabel}</span>
            <ChevronDown
              className={cn(
                'text-muted-foreground h-4 w-4 transition-transform',
                fontDropdownOpen && 'rotate-180',
              )}
            />
          </Button>
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
                  onClick={() => handleFontFamilySelect(opt.value)}
                  onKeyDown={(event) => handleOptionKeyDown(event, opt.value)}
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
          <Input
            aria-label="Font size in pixels"
            className="bg-muted accent-primary h-2 flex-1 cursor-pointer appearance-none rounded-full border-0"
            max={FONT_SIZE_MAX}
            min={FONT_SIZE_MIN}
            step={1}
            type="range"
            value={currentFontSize}
            onChange={onFontSizeChange}
          />
          <span className="text-muted-foreground w-10 text-right text-sm">{FONT_SIZE_MAX}px</span>
        </div>
        <p className="text-muted-foreground mt-2 text-center text-sm">
          Current: <span className="text-foreground font-medium">{currentFontSize}px</span>
        </p>
      </section>
    </>
  );
}
