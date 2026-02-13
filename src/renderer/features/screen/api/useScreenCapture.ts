/**
 * React Query hooks for screen capture
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { screenKeys } from './queryKeys';

/** Fetch available screen sources (screens and windows) */
export function useAvailableSources(options?: {
  types?: Array<'screen' | 'window'>;
  thumbnailSize?: { width: number; height: number };
}) {
  return useQuery({
    queryKey: screenKeys.sourcesWithOptions(options?.types, options?.thumbnailSize),
    queryFn: () =>
      ipc('screen.listSources', {
        types: options?.types,
        thumbnailSize: options?.thumbnailSize,
      }),
    staleTime: 5000, // Sources can change frequently (windows open/close)
    refetchOnWindowFocus: true,
  });
}

/** Capture a screenshot from a specific source */
export function useCaptureScreen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      sourceId: string;
      options?: {
        width?: number;
        height?: number;
      };
    }) =>
      ipc('screen.capture', {
        sourceId: params.sourceId,
        options: params.options,
      }),
    onSuccess: () => {
      // Invalidate sources to refresh thumbnails
      void queryClient.invalidateQueries({ queryKey: screenKeys.sources() });
    },
  });
}

/** Check screen recording permission status */
export function useScreenPermission() {
  return useQuery({
    queryKey: screenKeys.permission(),
    queryFn: () => ipc('screen.checkPermission', {}),
    staleTime: Infinity, // Permission doesn't change during runtime
  });
}
