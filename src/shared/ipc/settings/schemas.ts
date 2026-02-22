/**
 * Settings IPC Schemas
 *
 * Zod schemas for application settings, profiles, OAuth providers,
 * webhook configuration, agent settings, hotkeys, voice, and screen capture.
 */

import { z } from 'zod';

import { SIDEBAR_LAYOUT_IDS } from '@shared/types/layout';

import { DataRetentionSettingsSchema } from '../data-management/schemas';

// ── Theme Schemas ───────────────────────────────────────────────

export const ThemeTokensSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  card: z.string(),
  'card-foreground': z.string(),
  primary: z.string(),
  'primary-foreground': z.string(),
  secondary: z.string(),
  'secondary-foreground': z.string(),
  muted: z.string(),
  'muted-foreground': z.string(),
  accent: z.string(),
  'accent-foreground': z.string(),
  destructive: z.string(),
  'destructive-foreground': z.string(),
  border: z.string(),
  input: z.string(),
  ring: z.string(),
  sidebar: z.string(),
  'sidebar-foreground': z.string(),
  popover: z.string(),
  'popover-foreground': z.string(),
  success: z.string(),
  'success-foreground': z.string(),
  warning: z.string(),
  'warning-foreground': z.string(),
  info: z.string(),
  'info-foreground': z.string(),
  error: z.string(),
  'error-light': z.string(),
  'success-light': z.string(),
  'warning-light': z.string(),
  'info-light': z.string(),
  'shadow-focus': z.string(),
});

export const CustomThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  light: ThemeTokensSchema,
  dark: ThemeTokensSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ── App Settings Schemas ────────────────────────────────────────

export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  colorTheme: z.string(),
  customThemes: z.array(CustomThemeSchema).optional(),
  language: z.string(),
  uiScale: z.number(),
  sidebarLayout: z.enum(SIDEBAR_LAYOUT_IDS as [string, ...string[]]).optional(),
  onboardingCompleted: z.boolean(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  anthropicApiKey: z.string().optional(),
  hotkeys: z.record(z.string(), z.string()).optional(),
  openAtLogin: z.boolean().optional(),
  minimizeToTray: z.boolean().optional(),
  startMinimized: z.boolean().optional(),
  keepRunning: z.boolean().optional(),
  dataRetention: DataRetentionSettingsSchema.optional(),
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
