/**
 * React Query hooks for notes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NOTES } from '@shared/ipc/misc/notes.channels';
import type { Note } from '@shared/types/note';

import { ipc } from '@renderer/shared/lib/ipc';
import { optimisticCreate, optimisticDelete, optimisticUpdate } from '@renderer/shared/lib/optimistic';

import { noteKeys } from './queryKeys';

/** Fetch notes with optional filters */
export function useNotes(projectId?: string, tag?: string) {
  return useQuery({
    queryKey: noteKeys.list(projectId, tag),
    queryFn: () => ipc(NOTES.LIST.ALL, { projectId, tag }),
  });
}

/** Create a new note */
export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      tags?: string[];
      projectId?: string;
      taskId?: string;
      id?: string;
    }) => {
      const id = data.id ?? crypto.randomUUID();
      return ipc(NOTES.CREATE.NOTE, { ...data, id });
    },
    ...optimisticCreate<
      {
        title: string;
        content: string;
        tags?: string[];
        projectId?: string;
        taskId?: string;
        id?: string;
      },
      Note
    >(queryClient, noteKeys.lists(), (input) => ({
      id: input.id ?? '',
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
      projectId: input.projectId,
      taskId: input.taskId,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  });
}

/** Update an existing note */
export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      title?: string;
      content?: string;
      tags?: string[];
      pinned?: boolean;
    }) => ipc(NOTES.UPDATE.NOTE, data),
    ...optimisticUpdate<
      { id: string; title?: string; content?: string; tags?: string[]; pinned?: boolean },
      Note
    >(queryClient, noteKeys.lists(), (existing, input) => ({
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.pinned !== undefined && { pinned: input.pinned }),
      updatedAt: new Date().toISOString(),
    })),
  });
}

/** Delete a note */
export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(NOTES.DELETE.NOTE, { id }),
    ...optimisticDelete<Note>(queryClient, noteKeys.lists()),
  });
}

/** Search notes by query string */
export function useSearchNotes(query: string) {
  return useQuery({
    queryKey: noteKeys.search(query),
    queryFn: () => ipc(NOTES.SEARCH.NOTES, { query }),
    enabled: query.length > 0,
  });
}
