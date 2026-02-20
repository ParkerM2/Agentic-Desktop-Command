/**
 * ColorSection — Grouped set of ColorControls with a section header
 */

import type { ThemeTokens } from '@shared/types';

import { Separator } from '@ui';

import { ColorControl } from './ColorControl';

interface TokenEntry {
  key: string;
  label: string;
}

interface ColorSectionProps {
  title: string;
  tokens: TokenEntry[];
  values: ThemeTokens;
  onChange: (key: string, value: string) => void;
}

export function ColorSection({ title, tokens, values, onChange }: ColorSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h3>
      <Separator className="mb-3" />
      <div className="grid grid-cols-2 gap-3">
        {tokens.map((token) => (
          <ColorControl
            key={token.key}
            label={token.label}
            tokenKey={token.key}
            value={values[token.key as keyof ThemeTokens]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
