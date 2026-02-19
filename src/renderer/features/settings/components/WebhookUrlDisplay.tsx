/**
 * WebhookUrlDisplay — Shows a computed webhook URL with copy-to-clipboard functionality.
 */

import { Check, ClipboardCopy } from 'lucide-react';

import { Button } from '@ui';

interface WebhookUrlDisplayProps {
  label: string;
  url: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

export function WebhookUrlDisplay({
  label,
  url,
  fieldKey,
  copiedField,
  onCopy,
}: WebhookUrlDisplayProps) {
  return (
    <div className="mt-2">
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <div className="border-border bg-background flex items-center gap-2 rounded-md border px-3 py-2">
        <code className="text-foreground min-w-0 flex-1 truncate text-xs">{url}</code>
        <Button
          aria-label={`Copy ${fieldKey} webhook URL`}
          className="shrink-0"
          size="icon"
          variant="ghost"
          onClick={() => onCopy(url, fieldKey)}
        >
          {copiedField === fieldKey ? (
            <Check className="text-success h-4 w-4" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
