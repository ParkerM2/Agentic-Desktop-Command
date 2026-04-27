/**
 * ChangelogSummary — Compact display of the latest changelog entry
 *
 * Shows a truncated summary (~100 chars) of the most recent changelog entry
 * with Expand (opens Dialog with full ChangelogPage), Copy (clipboard),
 * and Update (opens generate form) actions.
 */

import { ClipboardCopy, Expand, RefreshCw, ScrollText } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Text,
} from '@ui';

import { ChangelogPage } from '@features/changelog';

import { useChangelogSummary } from './useChangelogSummary';

export function ChangelogSummary() {
  const { isLoading, latest, summary, dialogOpen, setDialogOpen, copied, handleCopy } =
    useChangelogSummary();

  if (isLoading) {
    return (
      <Text className="text-muted-foreground text-xs">Loading changelog...</Text>
    );
  }

  if (!latest) {
    return (
      <div className="flex items-center gap-2">
        <ScrollText className="text-muted-foreground h-4 w-4" />
        <Text className="text-muted-foreground text-xs">No changelog entries</Text>
      </div>
    );
  }

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
          onClick={() => { setDialogOpen(true); }}
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
          onClick={() => { setDialogOpen(true); }}
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
