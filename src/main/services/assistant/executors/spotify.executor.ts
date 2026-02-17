/**
 * Spotify executor — handles playback control commands.
 */

import type { AssistantResponse } from '@shared/types';

import { buildActionResponse, buildTextResponse } from './response-builders';

import type { SpotifyService } from '../../spotify/spotify-service';
import type { ClassifiedIntent } from '../intent-classifier';

export async function handleSpotify(
  intent: ClassifiedIntent,
  spotifyService: SpotifyService,
): Promise<AssistantResponse | null> {
  const action = intent.extractedEntities.action || '';
  const query = (intent.extractedEntities.query || '').trim();

  switch (action) {
    case 'play': {
      if (query.length > 0) {
        const tracks = await spotifyService.search({ query, limit: 1 });
        if (tracks.length > 0) {
          await spotifyService.play({ uri: tracks[0].uri });
          return buildActionResponse(
            `Playing: ${tracks[0].name} by ${tracks[0].artist}`,
            intent,
            'spotify_control',
          );
        }
        return buildTextResponse(`No tracks found for "${query}"`);
      }
      await spotifyService.play({});
      return buildActionResponse('Resumed playback', intent, 'spotify_control');
    }
    case 'pause': {
      await spotifyService.pause();
      return buildActionResponse('Paused playback', intent, 'spotify_control');
    }
    case 'skip':
    case 'next': {
      await spotifyService.next();
      return buildActionResponse('Skipped to next track', intent, 'spotify_control');
    }
    case 'previous': {
      await spotifyService.previous();
      return buildActionResponse('Went to previous track', intent, 'spotify_control');
    }
    case 'volume': {
      const vol = Number.parseInt(query, 10);
      if (!Number.isNaN(vol)) {
        await spotifyService.setVolume({ volumePercent: vol });
        return buildActionResponse(`Volume set to ${String(vol)}%`, intent, 'spotify_control');
      }
      return buildTextResponse('Please specify a volume level (0-100)');
    }
    default:
      return null;
  }
}
