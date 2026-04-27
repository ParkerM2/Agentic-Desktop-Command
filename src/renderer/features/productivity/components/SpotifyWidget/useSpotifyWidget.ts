/**
 * useSpotifyWidget — logic for SpotifyWidget
 */

import { useCallback, useState } from 'react';

import {
  useSpotifyAddToQueue,
  useSpotifyNext,
  useSpotifyPause,
  useSpotifyPlay,
  useSpotifyPlayback,
  useSpotifyPrevious,
  useSpotifySearch,
  useSpotifyVolume,
} from '../../api/useSpotify';

export function useSpotifyWidget() {
  const { data: playback, isLoading } = useSpotifyPlayback();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useSpotifySearch(searchQuery);
  const playMutation = useSpotifyPlay();
  const addToQueueMutation = useSpotifyAddToQueue();

  // NowPlaying controls
  const pauseMutation = useSpotifyPause();
  const nextMutation = useSpotifyNext();
  const previousMutation = useSpotifyPrevious();
  const volumeMutation = useSpotifyVolume();

  const handlePlay = useCallback(
    (uri?: string) => {
      playMutation.mutate(uri ? { uri } : {});
    },
    [playMutation],
  );

  const handlePause = useCallback(() => {
    pauseMutation.mutate();
  }, [pauseMutation]);

  const handleNext = useCallback(() => {
    nextMutation.mutate();
  }, [nextMutation]);

  const handlePrevious = useCallback(() => {
    previousMutation.mutate();
  }, [previousMutation]);

  const handleVolumeChange = useCallback(
    (volume: number) => {
      volumeMutation.mutate(volume);
    },
    [volumeMutation],
  );

  return {
    playback,
    isLoading,
    searchQuery,
    setSearchQuery,
    searchResults,
    playMutation,
    addToQueueMutation,
    handlePlay,
    handlePause,
    handleNext,
    handlePrevious,
    handleVolumeChange,
  };
}
