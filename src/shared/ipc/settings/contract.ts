/**
 * Settings IPC Contract
 *
 * Invoke and event channel definitions for app settings, profiles,
 * OAuth providers, webhooks, agent settings, hotkeys, voice, and
 * screen capture.
 */

import { z } from 'zod';

import { SETTINGS } from './channels';
import {
  AppSettingsSchema,
  DataDirInfoSchema,
  LayoutStateSchema,
  LayoutUpdateSchema,
  ProfileSchema,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
  ValidationCheckSchema,
  VoiceConfigSchema,
  VoiceInputModeSchema,
  WebhookConfigSchema,
} from './schemas';

/** Invoke channels for app settings operations */
export const settingsInvoke = {
  [SETTINGS.GET.ALL]: {
    input: z.object({}),
    output: AppSettingsSchema,
  },
  [SETTINGS.UPDATE.ALL]: {
    input: z.record(z.string(), z.unknown()),
    output: AppSettingsSchema,
  },
  [SETTINGS.GET.PROFILES]: {
    input: z.object({}),
    output: z.array(ProfileSchema),
  },
  [SETTINGS.CREATE.PROFILE]: {
    input: z.object({
      name: z.string(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }),
    output: ProfileSchema,
  },
  [SETTINGS.UPDATE.PROFILE]: {
    input: z.object({
      id: z.string(),
      updates: z.object({
        name: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      }),
    }),
    output: ProfileSchema,
  },
  [SETTINGS.DELETE.PROFILE]: {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [SETTINGS.SET['DEFAULT-PROFILE']]: {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [SETTINGS.GET['OAUTH-PROVIDERS']]: {
    input: z.object({}),
    output: z.array(
      z.object({
        name: z.string(),
        hasCredentials: z.boolean(),
      }),
    ),
  },
  [SETTINGS.SET['OAUTH-PROVIDER']]: {
    input: z.object({
      name: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  [SETTINGS.GET['WEBHOOK-CONFIG']]: {
    input: z.object({}),
    output: WebhookConfigSchema,
  },
  [SETTINGS.UPDATE['WEBHOOK-CONFIG']]: {
    input: z.object({
      slack: z
        .object({
          botToken: z.string().optional(),
          signingSecret: z.string().optional(),
        })
        .optional(),
      github: z
        .object({
          webhookSecret: z.string().optional(),
        })
        .optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  [SETTINGS.GET['AGENT-SETTINGS']]: {
    input: z.object({}),
    output: z.object({
      maxConcurrentAgents: z.number(),
    }),
  },
  [SETTINGS.SET['AGENT-SETTINGS']]: {
    input: z.object({
      maxConcurrentAgents: z.number(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  [SETTINGS.GET.LAYOUT]: {
    input: z.object({}),
    output: LayoutStateSchema,
  },
  [SETTINGS.SAVE.LAYOUT]: {
    input: LayoutUpdateSchema,
    output: z.object({ success: z.boolean() }),
  },
  [SETTINGS.GET['DATA-DIR']]: {
    input: z.object({}),
    output: DataDirInfoSchema,
  },
  [SETTINGS.SET['DATA-DIR']]: {
    input: z.object({ path: z.string() }),
    output: z.object({ validationResults: z.array(ValidationCheckSchema) }),
  },
  [SETTINGS.VALIDATE['DATA-DIR']]: {
    input: z.object({ path: z.string() }),
    output: z.object({ checks: z.array(ValidationCheckSchema) }),
  },
  [SETTINGS.CONFIRM['DATA-DIR']]: {
    input: z.object({ path: z.string(), useExisting: z.boolean().optional() }),
    output: z.object({ requiresRestart: z.literal(true) }),
  },
  [SETTINGS.RESET['DATA-DIR']]: {
    input: z.object({}),
    output: z.object({ requiresRestart: z.literal(true) }),
  },
} as const;

/** Invoke channels for hotkey operations */
export const hotkeysInvoke = {
  'hotkeys.get': {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },
  'hotkeys.update': {
    input: z.object({
      hotkeys: z.record(z.string(), z.string()),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'hotkeys.reset': {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },
} as const;

/** Invoke channels for voice operations */
export const voiceInvoke = {
  'voice.getConfig': {
    input: z.object({}),
    output: VoiceConfigSchema,
  },
  'voice.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      language: z.string().optional(),
      inputMode: VoiceInputModeSchema.optional(),
    }),
    output: VoiceConfigSchema,
  },
  'voice.checkPermission': {
    input: z.object({}),
    output: z.object({
      granted: z.boolean(),
      canRequest: z.boolean(),
    }),
  },
} as const;

/** Invoke channels for screen capture operations */
export const screenInvoke = {
  'screen.listSources': {
    input: z.object({
      types: z.array(z.enum(['screen', 'window'])).optional(),
      thumbnailSize: z.object({ width: z.number(), height: z.number() }).optional(),
    }),
    output: z.array(ScreenSourceSchema),
  },
  'screen.capture': {
    input: z.object({
      sourceId: z.string(),
      options: z
        .object({
          width: z.number().optional(),
          height: z.number().optional(),
        })
        .optional(),
    }),
    output: ScreenshotSchema,
  },
  'screen.checkPermission': {
    input: z.object({}),
    output: z.object({
      status: ScreenPermissionStatusSchema,
      platform: z.string(),
    }),
  },
} as const;

