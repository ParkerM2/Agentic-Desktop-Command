/**
 * Settings IPC Schemas
 *
 * Zod schemas for application settings, profiles, OAuth providers,
 * webhook configuration, agent settings, hotkeys, voice, and screen capture.
 */

import { z } from 'zod';

// ── App Settings Schemas ────────────────────────────────────────

export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  colorTheme: z.string(),
  language: z.string(),
  uiScale: z.number(),
  onboardingCompleted: z.boolean(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  anthropicApiKey: z.string().optional(),
  hotkeys: z.record(z.string(), z.string()).optional(),
  openAtLogin: z.boolean().optional(),
  minimizeToTray: z.boolean().optional(),
  startMinimized: z.boolean().optional(),
  keepRunning: z.boolean().optional(),
});

// ── Profile Schemas ─────────────────────────────────────────────

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  configDir: z.string().optional(),
  oauthToken: z.string().optional(),
  isDefault: z.boolean(),
});

// ── Webhook Schemas ─────────────────────────────────────────────

export const WebhookConfigSchema = z.object({
  slack: z.object({
    botToken: z.string(),
    signingSecret: z.string(),
    configured: z.boolean(),
  }),
  github: z.object({
    webhookSecret: z.string(),
    configured: z.boolean(),
  }),
});

// ── Voice Schemas ───────────────────────────────────────────────

export const VoiceInputModeSchema = z.enum(['push_to_talk', 'continuous']);

export const VoiceConfigSchema = z.object({
  enabled: z.boolean(),
  language: z.string(),
  inputMode: VoiceInputModeSchema,
});

// ── Screen Capture Schemas ──────────────────────────────────────

export const ScreenSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail: z.string(),
  display_id: z.string().optional(),
  appIcon: z.string().optional(),
});

export const ScreenshotSchema = z.object({
  data: z.string(),
  timestamp: z.string(),
  source: ScreenSourceSchema,
  width: z.number(),
  height: z.number(),
});

export const ScreenPermissionStatusSchema = z.enum([
  'granted',
  'denied',
  'not-determined',
  'restricted',
]);
