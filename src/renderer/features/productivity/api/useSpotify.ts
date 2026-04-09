/**
 * React Query hooks for Spotify integration
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SPOTIFY } from '@shared/ipc/spotify/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { spotifyKeys } from './queryKeys';

/** Fetch current Spotify playback state. */
export function useSpotifyPlayback() {
  return useQuery({
    queryKey: spotifyKeys.playback(),
    queryFn: () => ipc(SPOTIFY.GET.PLAYBACK, {}),
    refetchInterval: 5000,
  });
}

/** Search for Spotify tracks. */
export function useSpotifySearch(query: string) {
  return useQuery({
    queryKey: spotifyKeys.search(query),
    queryFn: () => ipc(SPOTIFY.SEARCH.TRACKS, { query }),
    enabled: query.length > 0,
  });
}

/** Play or resume Spotify playback. */
export function useSpotifyPlay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params?: { uri?: string }) => ipc(SPOTIFY.PLAY.TRACK, { uri: params?.uri }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotifyKeys.playback() });
    },
  });
}

/** Pause Spotify playback. */
export function useSpotifyPause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipc(SPOTIFY.PAUSE.TRACK, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotifyKeys.playback() });
    },
  });
}

/** Skip to next track. */
export function useSpotifyNext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipc(SPOTIFY.SKIP.NEXT, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotifyKeys.playback() });
    },
  });
}

/** Skip to previous track. */
export function useSpotifyPrevious() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipc(SPOTIFY.SKIP.PREVIOUS, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotifyKeys.playback() });
    },
  });
}

/** Set playback volume. */
export function useSpotifyVolume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (volumePercent: number) => ipc(SPOTIFY.SET.VOLUME, { volumePercent }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotifyKeys.playback() });
    },
  });
}

/** Add a track to the queue. */
export function useSpotifyAddToQueue() {
  return useMutation({
    mutationFn: (uri: string) => ipc(SPOTIFY.ADD['TO-QUEUE'], { uri }),
  });
}
