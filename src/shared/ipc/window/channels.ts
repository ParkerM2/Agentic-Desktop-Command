import { domain } from '../channel-builder';

export const WINDOW = domain('window', {
  MINIMIZE: ['app'],
  MAXIMIZE: ['app'],
  CLOSE: ['app'],
  CHECK: ['maximized'],
});
