import { domain } from '../channel-builder';

export const HOTKEYS = domain('hotkeys', {
  GET: ['config'],
  UPDATE: ['config'],
  RESET: ['config'],
});
