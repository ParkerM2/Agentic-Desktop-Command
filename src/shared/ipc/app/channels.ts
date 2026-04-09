import { domain, events } from '../channel-builder';

export const APP = domain('app', {
  GET: ['version', 'login-setting', 'update-status', 'error-log', 'error-stats', 'health-status'],
  CHECK: ['claude-auth', 'github-auth', 'oauth-status', 'updates'],
  SET: ['login-setting'],
  LAUNCH: ['claude-auth', 'github-auth'],
  DOWNLOAD: ['update'],
  INSTALL: ['update'],
  CLEAR: ['error-log'],
  REPORT: ['renderer-error'],
});

export const APP_EVENTS = events('app', {
  UPDATE: ['available', 'downloaded'],
  ERROR: ['occurred'],
  CAPACITY: ['alert'],
  DATA: ['recovery'],
  SERVICE: ['unhealthy'],
});
