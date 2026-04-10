import { domain } from '../channel-builder';

export const SETTINGS = domain('settings', {
  GET: ['all', 'profiles', 'oauth-providers', 'webhook-config', 'agent-settings', 'layout', 'data-dir'],
  UPDATE: ['all', 'profile', 'webhook-config'],
  CREATE: ['profile'],
  DELETE: ['profile'],
  SET: ['default-profile', 'oauth-provider', 'agent-settings', 'data-dir'],
  SAVE: ['layout'],
  VALIDATE: ['data-dir'],
  CONFIRM: ['data-dir'],
  RESET: ['data-dir'],
});
