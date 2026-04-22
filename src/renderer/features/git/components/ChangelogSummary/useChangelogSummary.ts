import { useState } from 'react';

import type { ChangelogEntry } from '@shared/types';

import { useChangelog } from '@features/changelog';

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

export function useChangelogSummary() {
  const { data: entries, isLoading } = useChangelog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const latest = entries?.[0] ?? null;
  const summary = latest === null ? '' : summariseEntry(latest);

  function handleCopy(): void {
    if (!latest) return;
    void (async () => {
      await navigator.clipboard.writeText(entryToClipboard(latest));
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    })();
  }

  return {
    isLoading,
    latest,
    summary,
    dialogOpen,
    setDialogOpen,
    copied,
    handleCopy,
  };
}
