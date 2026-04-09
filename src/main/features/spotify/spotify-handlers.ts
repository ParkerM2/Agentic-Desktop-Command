/**
 * Spotify IPC handlers
 */

import { SPOTIFY } from '@shared/ipc/spotify/channels';

import type { SpotifyService } from "./spotify-service";
import type { IpcRouter } from '../../ipc/router';

export function registerSpotifyHandlers(router: IpcRouter, service: SpotifyService): void {
  router.handle(SPOTIFY.GET.PLAYBACK, async () => {
    return await service.getPlayback();
  });

  router.handle(SPOTIFY.PLAY.TRACK, async (params) => {
    return await service.play(params);
  });

  router.handle(SPOTIFY.PAUSE.TRACK, async () => {
    return await service.pause();
  });

  router.handle(SPOTIFY.SKIP.NEXT, async () => {
    return await service.next();
  });

  router.handle(SPOTIFY.SKIP.PREVIOUS, async () => {
    return await service.previous();
  });

  router.handle(SPOTIFY.SEARCH.TRACKS, async (params) => {
    return await service.search(params);
  });

  router.handle(SPOTIFY.SET.VOLUME, async (params) => {
    return await service.setVolume(params);
  });

  router.handle(SPOTIFY.ADD['TO-QUEUE'], async (params) => {
    return await service.addToQueue(params);
  });
}
