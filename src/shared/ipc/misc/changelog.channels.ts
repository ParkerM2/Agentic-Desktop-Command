import { domain } from '../channel-builder';

export const CHANGELOG = domain('changelog', {
  LIST: ['entries'],
  ADD: ['entry'],
  GENERATE: ['entry'],
});
