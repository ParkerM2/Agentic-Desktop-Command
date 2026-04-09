import { domain } from '../channel-builder';

export const SPOTIFY = domain('spotify', {
  GET: ['playback'],
  PLAY: ['track'],
  PAUSE: ['track'],
  SKIP: ['next', 'previous'],
  SEARCH: ['tracks'],
  SET: ['volume'],
  ADD: ['to-queue'],
});
