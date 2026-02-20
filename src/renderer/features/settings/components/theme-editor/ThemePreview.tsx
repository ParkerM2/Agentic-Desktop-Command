/**
 * ThemePreview — Live preview panel showing sample UI elements
 *
 * Renders an isolated scope where CSS custom properties are set inline,
 * so the main app does not flicker during editing.
 */

import { THEME_TOKEN_KEYS } from '@shared/constants/themes';
import type { ThemeTokens } from '@shared/types';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Separator } from '@ui';

// ── Style constants ──────────────────────────────────────

const VAR_FOREGROUND = 'var(--foreground)';
const VAR_MUTED_FG = 'var(--muted-foreground)';
const VAR_BORDER = 'var(--border)';

interface ThemePreviewProps {
  tokens: ThemeTokens;
}

/** Build inline style object from tokens for isolated scoping */
function buildTokenStyles(tokens: ThemeTokens): React.CSSProperties {
  const styles: Record<string, string> = {};
  for (const key of THEME_TOKEN_KEYS) {
    styles[`--${key}`] = tokens[key];
  }
  return styles as React.CSSProperties;
}

export function ThemePreview({ tokens }: ThemePreviewProps) {
  const scopeStyles = buildTokenStyles(tokens);

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        ...scopeStyles,
        backgroundColor: 'var(--background)',
        borderColor: VAR_BORDER,
        color: VAR_FOREGROUND,
      }}
    >
      <h3 className="mb-3 text-sm font-semibold" style={{ color: VAR_FOREGROUND }}>
        Live Preview
      </h3>
      <Separator className="mb-4" style={{ backgroundColor: VAR_BORDER }} />

      {/* Card sample */}
      <Card className="mb-4" style={{ backgroundColor: 'var(--card)', borderColor: VAR_BORDER }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: 'var(--card-foreground)' }}>
            Sample Card
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs" style={{ color: VAR_MUTED_FG }}>
            This card demonstrates the card, foreground, and muted-foreground tokens.
          </p>
        </CardContent>
      </Card>

      {/* Button samples */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          className="h-7 text-xs"
          size="sm"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Primary
        </Button>
        <Button
          className="h-7 text-xs"
          size="sm"
          style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
        >
          Secondary
        </Button>
        <Button
          className="h-7 text-xs"
          size="sm"
          style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
        >
          Destructive
        </Button>
      </div>

      {/* Badge samples */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge
          className="text-[10px]"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Default
        </Badge>
        <Badge
          className="text-[10px]"
          style={{ backgroundColor: 'var(--success)', color: 'var(--success-foreground)' }}
        >
          Success
        </Badge>
        <Badge
          className="text-[10px]"
          style={{ backgroundColor: 'var(--warning)', color: 'var(--warning-foreground)' }}
        >
          Warning
        </Badge>
        <Badge
          className="text-[10px]"
          style={{ backgroundColor: 'var(--error)', color: 'var(--destructive-foreground)' }}
        >
          Error
        </Badge>
        <Badge
          className="text-[10px]"
          style={{ backgroundColor: 'var(--info)', color: 'var(--info-foreground)' }}
        >
          Info
        </Badge>
      </div>

      {/* Text samples */}
      <div className="mb-4 space-y-1">
        <p className="text-xs font-medium" style={{ color: VAR_FOREGROUND }}>
          Foreground text sample
        </p>
        <p className="text-xs" style={{ color: VAR_MUTED_FG }}>
          Muted foreground text sample
        </p>
        <p className="text-xs" style={{ color: 'var(--accent-foreground)' }}>
          Accent foreground text sample
        </p>
      </div>

      {/* Alert-like samples */}
      <div className="space-y-2">
        <PreviewAlert bgColor="var(--success-light)" borderColor="var(--success)" label="Success" textColor="var(--success)" />
        <PreviewAlert bgColor="var(--warning-light)" borderColor="var(--warning)" label="Warning" textColor="var(--warning)" />
        <PreviewAlert bgColor="var(--error-light)" borderColor="var(--error)" label="Error" textColor="var(--error)" />
        <PreviewAlert bgColor="var(--info-light)" borderColor="var(--info)" label="Info" textColor="var(--info)" />
      </div>

      {/* Input sample */}
      <div className="mt-4">
        <div
          className="h-8 rounded-md border px-3 py-1.5 text-xs"
          style={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--input)',
            color: VAR_FOREGROUND,
          }}
        >
          Sample input field
        </div>
      </div>

      {/* Sidebar sample */}
      <div className="mt-4 rounded-md p-2" style={{ backgroundColor: 'var(--sidebar)' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--sidebar-foreground)' }}>
          Sidebar preview
        </p>
      </div>
    </div>
  );
}

// ── PreviewAlert helper ──────────────────────────────────

interface PreviewAlertProps {
  bgColor: string;
  borderColor: string;
  label: string;
  textColor: string;
}

function PreviewAlert({ bgColor, borderColor, label, textColor }: PreviewAlertProps) {
  return (
    <div
      className="rounded-md border-l-2 px-3 py-1.5 text-xs font-medium"
      style={{
        backgroundColor: bgColor,
        borderLeftColor: borderColor,
        color: textColor,
      }}
    >
      {label} alert message
    </div>
  );
}
