/**
 * Settings IPC Contract
 *
 * Invoke and event channel definitions for app settings, profiles,
 * OAuth providers, webhooks, agent settings, hotkeys, voice, and
 * screen capture.
 */

import { z } from 'zod';

import {
  AppSettingsSchema,
  ProfileSchema,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
  VoiceConfigSchema,
  VoiceInputModeSchema,
  WebhookConfigSchema,
} from './schemas';

/** Invoke channels for app settings operations */
export const settingsInvoke = {
  'settings.get': {
    input: z.object({}),
    output: AppSettingsSchema,
  },
  'settings.update': {
    input: z.record(z.string(), z.unknown()),
    output: AppSettingsSchema,
  },
  'settings.getProfiles': {
    input: z.object({}),
    output: z.array(ProfileSchema),
  },
  'settings.createProfile': {
    input: z.object({
      name: z.string(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }),
    output: ProfileSchema,
  },
  'settings.updateProfile': {
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
  'settings.deleteProfile': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'settings.setDefaultProfile': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'settings.getOAuthProviders': {
    input: z.object({}),
    output: z.array(
      z.object({
        name: z.string(),
        hasCredentials: z.boolean(),
      }),
    ),
  },
  'settings.setOAuthProvider': {
    input: z.object({
      name: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'settings.getWebhookConfig': {
    input: z.object({}),
    output: WebhookConfigSchema,
  },
  'settings.updateWebhookConfig': {
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
  'settings.getAgentSettings': {
    input: z.object({}),
    output: z.object({
      maxConcurrentAgents: z.number(),
    }),
  },
  'settings.setAgentSettings': {
    input: z.object({
      maxConcurrentAgents: z.number(),
    }),
    output: z.object({ success: z.boolean() }),
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

