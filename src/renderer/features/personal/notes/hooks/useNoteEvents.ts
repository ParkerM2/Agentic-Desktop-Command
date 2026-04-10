/**
 * Note IPC event listeners -> query invalidation
 *
 * Bridges real-time events from the main process to React Query cache.
 */

import { useQueryClient } from '@tanstack/react-query';

import { NOTES_EVENTS } from '@shared/ipc/misc/notes.channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { noteKeys } from '../api/queryKeys';

export function useNoteEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(NOTES_EVENTS.NOTE.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: noteKeys.all });
  });
}
