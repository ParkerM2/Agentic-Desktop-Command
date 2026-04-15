/**
 * ChangelogSummary — Compact display of the latest changelog entry
 *
 * Shows a truncated summary (~100 chars) of the most recent changelog entry
 * with Expand (opens Dialog with full ChangelogPage), Copy (clipboard),
 * and Update (opens generate form) actions.
 */

import { useState } from 'react';

import { ClipboardCopy, Expand, RefreshCw, ScrollText } from 'lucide-react';

import type { ChangelogEntry } from '@shared/types';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Text,
} from '@ui';

import { ChangelogPage, useChangelog } from '@features/changelog';

/** Build a plain-text summary from a changelog entry, truncated to maxLen chars */
function summariseEntry(entry: ChangelogEntry, maxLen = 100): string {
  const parts: string[] = [];
  for (const cat of entry.categories) {
    for (const item of cat.items) {
      parts.push(item);
    }
  }
  const joined = parts.join('; ');
  return joined.length > maxLen ? `${joined.slice(0, maxLen)}...` : joined;
}

/** Build full plain-text for clipboard copy */
function entryToClipboard(entry: ChangelogEntry): string {
  const lines: string[] = [`v${entry.version} — ${entry.date}`];
  for (const cat of entry.categories) {
    lines.push(`\n### ${cat.type}`);
    for (const item of cat.items) {
      lines.push(`- ${item}`);
    }
  }
  return lines.join('\n');
}

export function ChangelogSummary() {
  const { data: entries, isLoading } = useChangelog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const latest = entries?.[0] ?? null;

  function handleCopy(): void {
    if (!latest) return;
    void (async () => {
      await navigator.clipboard.writeText(entryToClipboard(latest));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    })();
  }

  // Loading state
  if (isLoading) {
    return (
      <Text className="text-muted-foreground text-xs">Loading changelog...</Text>
    );
  }

  // Empty state
  if (!latest) {
    return (
      <div className="flex items-center gap-2">
        <ScrollText className="text-muted-foreground h-4 w-4" />
        <Text className="text-muted-foreground text-xs">No changelog entries</Text>
      </div>
    );
  }

  const summary = summariseEntry(latest);

  return (
    <>
      <div className="flex items-center gap-2">
        <ScrollText className="text-muted-foreground h-4 w-4 shrink-0" />
        <Text className="text-muted-foreground max-w-[280px] truncate text-xs" title={summary}>
          v{latest.version}: {summary}
        </Text>

        <Button
          aria-label="Expand changelog"
          className="h-6 w-6"
          size="icon"
          variant="ghost"
          onClick={() => setDialogOpen(true)}
        >
          <Expand className="h-3 w-3" />
        </Button>

        <Button
          aria-label={copied ? 'Copied' : 'Copy latest changelog'}
          className="h-6 w-6"
          size="icon"
          variant="ghost"
          onClick={handleCopy}
        >
          <ClipboardCopy className="h-3 w-3" />
        </Button>

        <Button
          aria-label="Update changelog"
          className="h-6 w-6"
          size="icon"
          variant="ghost"
          onClick={() => setDialogOpen(true)}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Changelog</DialogTitle>
            <DialogDescription>Full version history and release notes</DialogDescription>
          </DialogHeader>
          <ChangelogPage />
        </DialogContent>
      </Dialog>
    </>
  );
}
