import { domain, events } from '../channel-builder';

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

// ─── Hotkeys channels (absorbed from misc/hotkeys) ────────────

export const HOTKEYS = domain('hotkeys', {
  GET: ['config'],
  UPDATE: ['config'],
  RESET: ['config'],
});

// ─── Voice channels (absorbed from misc/voice) ────────────────

export const VOICE = domain('voice', {
  GET: ['config'],
  UPDATE: ['config'],
  CHECK: ['permission'],
});

export const VOICE_EVENTS = events('voice', {
  SPEECH: ['transcript'],
});

// ─── Screen channels (absorbed from misc/screen) ─────────────

export const SCREEN = domain('screen', {
  LIST: ['sources'],
  CAPTURE: ['screen'],
  CHECK: ['permission'],
});

// ─── Security channels (absorbed from security/) ─────────────

export const SECURITY = domain('security', {
  GET: ['settings'],
  UPDATE: ['settings'],
  EXPORT: ['audit'],
});

// ─── Backwards-compatible aliases ─────────────────────────────
// These re-export the absorbed domain constants so existing imports
// from misc/hotkeys, misc/voice, misc/screen, and security/ still resolve.
