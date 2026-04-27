/**
 * React Query hooks for notes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NOTES } from '@shared/ipc/notes';

import { ipc } from '@renderer/shared/lib/ipc';

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
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
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
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

/** Delete a note */
export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(NOTES.DELETE.NOTE, { id }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
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
