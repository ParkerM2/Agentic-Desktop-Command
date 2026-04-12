/**
 * QuickCapture — Quick text input for ideas, tasks, and notes
 *
 * Persists captures via IPC (dashboard.captures.*) so they survive restarts.
 * Supports inline editing, search filter, show-all toggle, and per-capture
 * kebab menu with Convert to Task / Convert to Note / Delete actions.
 */

import { useRef, useState } from 'react';

import { MoreHorizontal, Plus } from 'lucide-react';

import { formatRelativeTime } from '@renderer/shared/lib/utils';
import { useToastStore } from '@renderer/shared/stores';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  SearchInput,
  Text,
} from '@ui';

import { useCreateNote } from '@features/personal/notes';
import { useCreateProgressTask } from '@features/tasks';

import { useCaptureMutations, useCaptures, useUpdateCapture } from '../api/useCaptures';

interface EditState {
  id: string;
  value: string;
}

export function QuickCapture() {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: captures } = useCaptures();
  const { createCapture, deleteCapture } = useCaptureMutations();
  const updateCapture = useUpdateCapture();
  const createProgressTask = useCreateProgressTask();
  const createNote = useCreateNote();
  const { addToast } = useToastStore();

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;
    createCapture.mutate(trimmed);
    setInputValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  function handleEditStart(id: string, currentText: string) {
    setEditState({ id, value: currentText });
    // Focus the input on next tick after render
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  }

  function handleEditSave() {
    if (editState === null) return;
    const trimmed = editState.value.trim();
    if (trimmed.length > 0) {
      updateCapture.mutate({ id: editState.id, text: trimmed });
    }
    setEditState(null);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      setEditState(null);
    }
  }

  function handleConvertToTask(text: string, captureId: string) {
    createProgressTask.mutate(
      { title: text, description: '' },
      {
        onSuccess() {
          deleteCapture.mutate(captureId);
          addToast('Converted to task', 'success');
        },
      },
    );
  }

  function handleConvertToNote(text: string, captureId: string) {
    createNote.mutate(
      { title: text, content: '' },
      {
        onSuccess() {
          deleteCapture.mutate(captureId);
          addToast('Converted to note', 'success');
        },
      },
    );
  }

  const allCaptures = captures ?? [];

  const filteredCaptures =
    searchQuery.trim().length > 0
      ? allCaptures.filter((c) =>
          c.text.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : allCaptures;

  const LIMIT = 5;
  const visibleCaptures = showAll ? filteredCaptures : filteredCaptures.slice(0, LIMIT);
  const hasMore = filteredCaptures.length > LIMIT;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-foreground mb-3 text-sm font-semibold">Quick Capture</p>

        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Quick idea, task, or note..."
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            disabled={inputValue.trim().length === 0}
            size="md"
            type="button"
            onClick={handleSubmit}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {(allCaptures.length > 0) ? (
          <div className="mt-3">
            <SearchInput
              className="mb-2"
              placeholder="Filter captures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {(visibleCaptures.length > 0) ? (
              <ul className="space-y-1.5">
                {visibleCaptures.map((capture) => (
                  <li
                    key={capture.id}
                    className="border-border flex items-start gap-2 rounded-md border px-3 py-2"
                  >
                    {(editState !== null && editState.id === capture.id) ? (
                      <Input
                        ref={editInputRef}
                        className="h-6 flex-1 border-0 p-0 text-xs focus-visible:ring-0"
                        value={editState.value}
                        onBlur={handleEditSave}
                        onKeyDown={handleEditKeyDown}
                        onChange={(e) =>
                          setEditState({ ...editState, value: e.target.value })
                        }
                      />
                    ) : (
                      <Button
                        className="text-foreground min-w-0 h-auto flex-1 cursor-text justify-start px-0 py-0 text-left text-xs font-normal"
                        type="button"
                        variant="ghost"
                        onClick={() => handleEditStart(capture.id, capture.text)}
                      >
                        {capture.text}
                      </Button>
                    )}
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatRelativeTime(capture.createdAt)}
                    </span>

                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label="Capture actions"
                            className="text-muted-foreground hover:text-foreground h-auto shrink-0 p-0"
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() =>
                              handleConvertToTask(capture.text, capture.id)
                            }
                          >
                            Convert to Task
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              handleConvertToNote(capture.text, capture.id)
                            }
                          >
                            Convert to Note
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete capture?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this capture. This action cannot
                            be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCapture.mutate(capture.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            ) : (
              <Text size="sm" variant="muted">No captures match your search.</Text>
            )}

            {hasMore ? (
              <Button
                className="mt-2 w-full"
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? 'Show less'
                  : `Show all (${filteredCaptures.length - LIMIT} more)`}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
