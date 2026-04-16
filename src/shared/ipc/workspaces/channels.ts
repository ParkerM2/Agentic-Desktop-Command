import { domain } from '../channel-builder';

export const WORKSPACES = domain('workspaces', {
  LIST: ['all'],
  CREATE: ['workspace'],
  UPDATE: ['workspace'],
  DELETE: ['workspace'],
});
