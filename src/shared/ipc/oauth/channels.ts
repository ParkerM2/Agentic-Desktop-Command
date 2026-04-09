import { domain } from '../channel-builder';

export const OAUTH = domain('oauth', {
  AUTHORIZE: ['provider'],
  CHECK: ['authenticated'],
  REVOKE: ['provider'],
});
