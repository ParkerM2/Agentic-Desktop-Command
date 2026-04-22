/**
 * QuickCapture — Quick text input for ideas, tasks, and notes
 *
 * Persists captures via IPC (dashboard.captures.*) so they survive restarts.
 * Supports inline editing, search filter, show-all toggle, and per-capture
 * kebab menu with Convert to Task / Convert to Note / Delete actions.
 */

import { MoreHorizontal, Plus } from 'lucide-react';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';

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

import { useQuickCapture } from './useQuickCapture';

export function QuickCapture() {
  const {
    inputValue,
    setInputValue,
    searchQuery,
    setSearchQuery,
    showAll,
    setShowAll,
    editState,
    setEditState,
    editInputRef,
    allCaptures,
    filteredCaptures,
    visibleCaptures,
    hasMore,
    deleteCapture,
    handleSubmit,
    handleKeyDown,
    handleEditStart,
    handleEditSave,
    handleEditKeyDown,
    handleConvertToTask,
    handleConvertToNote,
    LIMIT,
  } = useQuickCapture();

  return (
    <Card>
      <CardContent className="p-4">
        <Text className="mb-3 font-semibold">Quick Capture</Text>

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

        {allCaptures.length > 0 ? (
          <div className="mt-3">
            <SearchInput
              className="mb-2"
              placeholder="Filter captures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {visibleCaptures.length > 0 ? (
              <ul className="space-y-1.5">
                {visibleCaptures.map((capture) => (
                  <li
                    key={capture.id}
                    className="border-border flex items-start gap-2 rounded-md border px-3 py-2"
                  >
                    {editState !== null && editState.id === capture.id ? (
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
                    <RelativeTime
                      className="text-muted-foreground shrink-0 text-xs"
                      value={capture.createdAt}
                    />

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
