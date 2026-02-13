/**
 * SpotifyWidget — Now playing display with playback controls
 */

import { useState } from 'react';

import { Music, Pause, Play, Search, SkipBack, SkipForward, Volume2 } from 'lucide-react';

import { IntegrationRequired } from '@renderer/shared/components/IntegrationRequired';
import { cn } from '@renderer/shared/lib/utils';

import {
  useSpotifyAddToQueue,
  useSpotifyNext,
  useSpotifyPause,
  useSpotifyPlay,
  useSpotifyPlayback,
  useSpotifyPrevious,
  useSpotifySearch,
  useSpotifyVolume,
} from '../api/useSpotify';

// ── Constants ────────────────────────────────────────────────

const CONTROL_BUTTON =
  'rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

// ── Sub-components ───────────────────────────────────────────

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

interface NowPlayingProps {
  track: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  volume: number;
}

function NowPlaying({
  track,
  artist,
  album,
  isPlaying,
  progressMs,
  durationMs,
  volume,
}: NowPlayingProps) {
  const playMutation = useSpotifyPlay();
  const pauseMutation = useSpotifyPause();
  const nextMutation = useSpotifyNext();
  const previousMutation = useSpotifyPrevious();
  const volumeMutation = useSpotifyVolume();

  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Track info */}
      <div className="flex items-center gap-4">
        <div className="bg-accent flex h-16 w-16 items-center justify-center rounded-lg">
          <Music className="text-muted-foreground h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate font-medium">{track}</p>
          <p className="text-muted-foreground truncate text-sm">{artist}</p>
          <p className="text-muted-foreground truncate text-xs">{album}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="bg-accent h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${String(progressPercent)}%` }}
          />
        </div>
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{formatDuration(progressMs)}</span>
          <span>{formatDuration(durationMs)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          className={CONTROL_BUTTON}
          title="Previous"
          type="button"
          onClick={() => {
            previousMutation.mutate();
          }}
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          title={isPlaying ? 'Pause' : 'Play'}
          type="button"
          className={cn(
            CONTROL_BUTTON,
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
          )}
          onClick={() => {
            if (isPlaying) {
              pauseMutation.mutate();
            } else {
              playMutation.mutate({});
            }
          }}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          className={CONTROL_BUTTON}
          title="Next"
          type="button"
          onClick={() => {
            nextMutation.mutate();
          }}
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <Volume2 className="text-muted-foreground h-4 w-4" />
        <input
          className="accent-primary h-1.5 flex-1 cursor-pointer"
          max="100"
          min="0"
          type="range"
          value={volume}
          onChange={(e) => {
            volumeMutation.mutate(Number(e.target.value));
          }}
        />
        <span className="text-muted-foreground w-8 text-right text-xs">{String(volume)}%</span>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export function SpotifyWidget() {
  const { data: playback, isLoading } = useSpotifyPlayback();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useSpotifySearch(searchQuery);
  const playMutation = useSpotifyPlay();
  const addToQueueMutation = useSpotifyAddToQueue();

  return (
    <div className="bg-card border-border space-y-4 rounded-lg border p-4">
      <IntegrationRequired
        description="Link your Spotify account to control playback and search tracks."
        provider="spotify"
        title="Connect Spotify"
      />
      <h3 className="text-foreground text-sm font-semibold">Spotify</h3>

      {/* Now Playing */}
      {isLoading ? <p className="text-muted-foreground text-sm">Loading playback...</p> : null}

      {!isLoading && playback ? (
        <NowPlaying
          album={playback.album ?? 'Unknown'}
          artist={playback.artist ?? 'Unknown'}
          durationMs={playback.durationMs ?? 0}
          isPlaying={playback.isPlaying}
          progressMs={playback.progressMs ?? 0}
          track={playback.track ?? 'No track'}
          volume={playback.volume ?? 50}
        />
      ) : null}

      {!isLoading && !playback ? (
        <p className="text-muted-foreground text-sm">No active playback</p>
      ) : null}

      {/* Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <input
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border py-2 pr-3 pl-9 text-sm focus:ring-1 focus:outline-none"
            placeholder="Search tracks..."
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
          />
        </div>

        {searchResults && searchResults.length > 0 ? (
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {searchResults.map((track) => (
              <div
                key={track.uri}
                className="hover:bg-accent flex items-center justify-between rounded-md px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm">{track.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {track.artist} - {track.album}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    className="text-muted-foreground hover:text-foreground p-1 text-xs"
                    title="Play"
                    type="button"
                    onClick={() => {
                      playMutation.mutate({ uri: track.uri });
                    }}
                  >
                    <Play className="h-3 w-3" />
                  </button>
                  <button
                    className="text-muted-foreground hover:text-foreground p-1 text-xs"
                    title="Add to queue"
                    type="button"
                    onClick={() => {
                      addToQueueMutation.mutate(track.uri);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
