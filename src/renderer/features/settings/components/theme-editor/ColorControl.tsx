/**
 * ColorControl — Single color token editor
 *
 * Displays a label, native color picker, and hex text input.
 * For the shadow-focus token, shows only a text input (no color picker).
 */

import { useCallback, useRef } from 'react';

import { Input, Label } from '@ui';

interface ColorControlProps {
  label: string;
  tokenKey: string;
  value: string;
  onChange: (key: string, value: string) => void;
}

/** Check if a value looks like a hex color */
function isHexColor(value: string): boolean {
  return /^#[\da-f]{6}$/i.test(value);
}

export function ColorControl({ label, tokenKey, value, onChange }: ColorControlProps) {
  const rafRef = useRef<number>(0);
  const isShadowToken = tokenKey === 'shadow-focus';

  // Debounce native color picker changes using RAF
  const handleColorPickerChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (rafRef.current > 0) {
        cancelAnimationFrame(rafRef.current);
      }
      const newValue = event.target.value;
      rafRef.current = requestAnimationFrame(() => {
        onChange(tokenKey, newValue);
        rafRef.current = 0;
      });
    },
    [tokenKey, onChange],
  );

  function handleTextChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(tokenKey, event.target.value);
  }

  const controlId = `color-${tokenKey}`;
  const displayValue = isHexColor(value) ? value : '#000000';

  // Shadow token: only text input
  if (isShadowToken) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs" htmlFor={controlId}>
          {label}
        </Label>
        <Input
          className="h-8 font-mono text-xs"
          id={controlId}
          value={value}
          onChange={handleTextChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs" htmlFor={controlId}>
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          className="h-8 w-8 shrink-0 cursor-pointer border-none p-0"
          id={`${controlId}-picker`}
          type="color"
          value={displayValue}
          onChange={handleColorPickerChange}
        />
        <Input
          className="h-8 flex-1 font-mono text-xs"
          id={controlId}
          value={value}
          onChange={handleTextChange}
        />
      </div>
    </div>
  );
}
