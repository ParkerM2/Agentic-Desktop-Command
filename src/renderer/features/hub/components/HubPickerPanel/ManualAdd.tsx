/**
 * ManualAdd — collapsible "Add manually" escape hatch.
 *
 * Expanded, it reveals a URL input and a Pair button. Consumes the
 * `useHubManualPair` mutation from the feature's public API; error
 * handling (including FINGERPRINT_MISMATCH) is delegated to the parent
 * `HubPickerPanel` which owns the banner/alert state.
 */

import { useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Input, Label } from '@ui';

interface ManualAddProps {
  isPairPending: boolean;
  onSubmit: (url: string) => void;
}

export function ManualAdd({ isPairPending, onSubmit }: ManualAddProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed === '') return;
    onSubmit(trimmed);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          className="w-full justify-start gap-2 text-muted-foreground"
          type="button"
          variant="ghost"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Add manually
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <form className="mt-3 space-y-3 px-2" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="hub-manual-url">Hub URL</Label>
            <Input
              autoComplete="url"
              id="hub-manual-url"
              placeholder="https://hub.local:3200"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
              }}
            />
          </div>
          <Button
            className="w-full"
            disabled={isPairPending || url.trim() === ''}
            size="sm"
            type="submit"
          >
            {isPairPending ? 'Pairing…' : 'Pair'}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
