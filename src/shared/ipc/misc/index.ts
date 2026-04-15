/**
 * Misc IPC -- Barrel Export
 *
 * Small domain contracts that don't warrant their own top-level folder.
 * Each domain has a single <name>.contract.ts file.
 */

// ── MCP ──
export { mcpInvoke } from './mcp.contract';

// ── Screen ──
export {
  screenInvoke,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
} from './screen.contract';

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
