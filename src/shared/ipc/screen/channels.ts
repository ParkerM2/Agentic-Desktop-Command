import { domain } from '../channel-builder';

export const SCREEN = domain('screen', {
  LIST: ['sources'],
  CAPTURE: ['screen'],
  CHECK: ['permission'],
});
