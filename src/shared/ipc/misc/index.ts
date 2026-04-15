/**
 * Misc IPC -- Barrel Export
 *
 * Small domain contracts that don't warrant their own top-level folder.
 * Each domain has a single <name>.contract.ts file.
 */

// ── Voice ──
export {
  voiceEvents,
  voiceInvoke,
  VoiceConfigSchema,
  VoiceInputModeSchema,
} from './voice.contract';

// ── Webhook ──
export { webhookEvents, webhookInvoke } from './webhook.contract';

// ── Workspaces ──
export {
  workspacesInvoke,
  WorkspaceSchema,
  WorkspaceSettingsSchema,
} from './workspaces.contract';
