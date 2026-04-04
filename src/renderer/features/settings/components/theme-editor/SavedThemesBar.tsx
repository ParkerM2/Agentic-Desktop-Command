/**
 * SavedThemesBar — Horizontal scrollable list of saved custom themes
 */

import { useState } from 'react';

import type { CustomTheme } from '@shared/types';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ScrollArea,
  ScrollBar,
} from '@ui';

interface SavedThemesBarProps {
  themes: CustomTheme[];
  onApply: (theme: CustomTheme) => void;
  onDelete: (themeId: string) => void;
}

export function SavedThemesBar({ themes, onApply, onDelete }: SavedThemesBarProps) {
  const [deleteTarget, setDeleteTarget] = useState<CustomTheme | null>(null);
  const hasThemes = themes.length > 0;

  function handleConfirmDelete() {
    if (deleteTarget !== null) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  function handleCancelDelete() {
    setDeleteTarget(null);
  }

  if (!hasThemes) {
    return (
      <div className="text-muted-foreground py-2 text-center text-xs">
        No saved themes yet. Create one by editing colors and clicking Save.
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {themes.map((theme) => (
            <SavedThemeChip
              key={theme.id}
              theme={theme}
              onApply={() => {
                onApply(theme);
              }}
              onDelete={() => {
                setDeleteTarget(theme);
              }}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) handleCancelDelete(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name ?? ''}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── SavedThemeChip ──────────────────────────────────────

interface SavedThemeChipProps {
  theme: CustomTheme;
  onApply: () => void;
  onDelete: () => void;
}

function SavedThemeChip({ theme, onApply, onDelete }: SavedThemeChipProps) {
  return (
    <div className="border-border bg-card flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2">
      <div className="flex items-center gap-1.5">
        {/* Light swatch: left half = background, right half = primary */}
        <div
          className="h-4 w-4 shrink-0 overflow-hidden rounded-full border"
          style={{ borderColor: theme.light.border }}
        >
          <div className="flex h-full w-full">
            <div className="h-full w-1/2" style={{ backgroundColor: theme.light.background }} />
            <div className="h-full w-1/2" style={{ backgroundColor: theme.light.primary }} />
          </div>
        </div>
        {/* Dark swatch: left half = background, right half = primary */}
        <div
          className="h-4 w-4 shrink-0 overflow-hidden rounded-full border"
          style={{ borderColor: theme.dark.border }}
        >
          <div className="flex h-full w-full">
            <div className="h-full w-1/2" style={{ backgroundColor: theme.dark.background }} />
            <div className="h-full w-1/2" style={{ backgroundColor: theme.dark.primary }} />
          </div>
        </div>
      </div>
      <span className="text-foreground max-w-[120px] truncate text-xs font-medium">
        {theme.name}
      </span>
      <Button className="h-6 text-[10px]" size="sm" variant="ghost" onClick={onApply}>
        Apply
      </Button>
      <Button className="h-6 text-[10px]" size="sm" variant="ghost" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
