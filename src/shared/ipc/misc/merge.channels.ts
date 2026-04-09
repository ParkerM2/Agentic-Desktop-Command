import { domain } from '../channel-builder';

export const MERGE = domain('merge', {
  PREVIEW: ['diff'],
  GET: ['file-diff'],
  CHECK: ['conflicts'],
  EXECUTE: ['merge'],
  ABORT: ['merge'],
});
