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

// ─── Docker channels (absorbed from docker/) ──────────────────

export const DOCKER = domain('docker', {
  GET: ['status'],
  SETUP: ['hub'],
});

// ─── Window channels (absorbed from window/) ─────────────────

export const WINDOW = domain('window', {
  MINIMIZE: ['app'],
  MAXIMIZE: ['app'],
  CLOSE: ['app'],
  CHECK: ['maximized'],
});

// ─── Backwards-compatible aliases ─────────────────────────────
// APP.GET['HEALTH-STATUS'] and APP.GET['ERROR-LOG'] etc. remain on APP.
// DOCKER and WINDOW are the canonical aliases consumers should use.
