/**
 * VersionCard — Displays a single changelog version with edit/delete actions
 */

import { useState } from 'react';

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import type { ChangeCategory } from '@shared/types';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Text,
} from '@ui';

import { useDeleteChangelogEntry } from '../api/useChangelog';

import { CategorySection } from './CategorySection';
import { EditEntryDialog } from './EditEntryDialog';

interface VersionCardProps {
  entry: { version: string; date: string; categories: ChangeCategory[] };
}

export function VersionCard({ entry }: VersionCardProps) {
  const deleteEntry = useDeleteChangelogEntry();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function handleDeleteConfirm(): void {
    deleteEntry.mutate({ version: entry.version });
  }

  const hasCategories = entry.categories.length > 0;

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="border-primary bg-primary/30 absolute top-1 left-0 h-3 w-3 rounded-full border-2" />

      {/* Version header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-lg font-semibold">
          {entry.version}{' '}
          <span className="text-muted-foreground text-sm font-normal">-- {entry.date}</span>
        </h3>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Entry actions"
              size="icon"
              variant="ghost"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content card */}
      <div className="border-border bg-card space-y-4 rounded-lg border p-4">
        {hasCategories ? (
          entry.categories.map((category) => (
            <CategorySection key={category.type} category={category} />
          ))
        ) : (
          <Text variant="muted">No changes listed.</Text>
        )}
      </div>

      {/* Edit dialog */}
      <EditEntryDialog
        entry={entry}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {entry.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this changelog entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
