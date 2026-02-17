/**
 * Assistant IPC Contract
 *
 * Invoke and event channel definitions for the AI assistant, Claude SDK,
 * email, notifications, GitHub, briefings, Spotify, calendar, time parser,
 * and MCP operations.
 */

import { z } from 'zod';

import {
  AssistantContextSchema,
  AssistantResponseSchema,
  BriefingConfigSchema,
  ClaudeConversationSchema,
  ClaudeMessageSchema,
  ClaudeSendMessageResponseSchema,
  ClaudeStreamChunkSchema,
  CommandHistoryEntrySchema,
  DailyBriefingSchema,
  EmailSchema,
  EmailSendResultSchema,
  GitHubIssueSchema,
  GitHubNotificationSchema,
  GitHubPullRequestSchema,
  GitHubWatcherConfigSchema,
  NotificationFilterSchema,
  NotificationSchema,
  NotificationSourceSchema,
  NotificationWatcherConfigSchema,
  QueuedEmailSchema,
  SlackWatcherConfigSchema,
  SmtpConfigSchema,
  SuggestionSchema,
} from './schemas';

/** Invoke channels for assistant operations */
export const assistantInvoke = {
  'assistant.sendCommand': {
    input: z.object({
      input: z.string(),
      context: AssistantContextSchema.optional(),
    }),
    output: AssistantResponseSchema,
  },
  'assistant.getHistory': {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(CommandHistoryEntrySchema),
  },
  'assistant.clearHistory': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for Claude SDK operations */
export const claudeInvoke = {
  'claude.sendMessage': {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: ClaudeSendMessageResponseSchema,
  },
  'claude.streamMessage': {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'claude.createConversation': {
    input: z.object({ title: z.string().optional() }),
    output: z.object({ conversationId: z.string() }),
  },
  'claude.listConversations': {
    input: z.object({}),
    output: z.array(ClaudeConversationSchema),
  },
  'claude.getMessages': {
    input: z.object({ conversationId: z.string() }),
    output: z.array(ClaudeMessageSchema),
  },
  'claude.clearConversation': {
    input: z.object({ conversationId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'claude.isConfigured': {
    input: z.object({}),
    output: z.object({ configured: z.boolean() }),
  },
} as const;

/** Invoke channels for email operations */
export const emailInvoke = {
  'email.send': {
    input: EmailSchema,
    output: EmailSendResultSchema,
  },
  'email.getConfig': {
    input: z.object({}),
    output: SmtpConfigSchema.nullable(),
  },
  'email.updateConfig': {
    input: SmtpConfigSchema,
    output: z.object({ success: z.boolean() }),
  },
  'email.testConnection': {
    input: z.object({}),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'email.getQueue': {
    input: z.object({}),
    output: z.array(QueuedEmailSchema),
  },
  'email.retryQueued': {
    input: z.object({ emailId: z.string() }),
    output: EmailSendResultSchema,
  },
  'email.removeFromQueue': {
    input: z.object({ emailId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for notification operations */
export const notificationsInvoke = {
  'notifications.list': {
    input: z.object({
      filter: NotificationFilterSchema.optional(),
      limit: z.number().optional(),
    }),
    output: z.array(NotificationSchema),
  },
  'notifications.markRead': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'notifications.markAllRead': {
    input: z.object({ source: NotificationSourceSchema.optional() }),
    output: z.object({ success: z.boolean(), count: z.number() }),
  },
  'notifications.getConfig': {
    input: z.object({}),
    output: NotificationWatcherConfigSchema,
  },
  'notifications.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      slack: SlackWatcherConfigSchema.partial().optional(),
      github: GitHubWatcherConfigSchema.partial().optional(),
    }),
    output: NotificationWatcherConfigSchema,
  },
  'notifications.startWatching': {
    input: z.object({}),
    output: z.object({ success: z.boolean(), watchersStarted: z.array(z.string()) }),
  },
  'notifications.stopWatching': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'notifications.getWatcherStatus': {
    input: z.object({}),
    output: z.object({
      isWatching: z.boolean(),
      activeWatchers: z.array(NotificationSourceSchema),
      lastPollTime: z.record(NotificationSourceSchema, z.string()).optional(),
      errors: z.record(NotificationSourceSchema, z.string()).optional(),
    }),
  },
} as const;

/** Invoke channels for GitHub operations */
export const githubInvoke = {
  'github.listPrs': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubPullRequestSchema),
  },
  'github.getPr': {
    input: z.object({ owner: z.string(), repo: z.string(), number: z.number() }),
    output: GitHubPullRequestSchema,
  },
  'github.listIssues': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubIssueSchema),
  },
  'github.createIssue': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string().optional(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional(),
    }),
    output: GitHubIssueSchema,
  },
  'github.getNotifications': {
    input: z.object({ all: z.boolean().optional() }),
    output: z.array(GitHubNotificationSchema),
  },
} as const;

/** Invoke channels for Spotify operations */
export const spotifyInvoke = {
  'spotify.getPlayback': {
    input: z.object({}),
    output: z
      .object({
        isPlaying: z.boolean(),
        track: z.string().optional(),
        artist: z.string().optional(),
        album: z.string().optional(),
        albumArt: z.string().optional(),
        progressMs: z.number().optional(),
        durationMs: z.number().optional(),
        device: z.string().optional(),
        volume: z.number().optional(),
      })
      .nullable(),
  },
  'spotify.play': {
    input: z.object({ uri: z.string().optional() }),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.pause': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.next': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.previous': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.search': {
    input: z.object({ query: z.string(), limit: z.number().optional() }),
    output: z.array(
      z.object({
        name: z.string(),
        artist: z.string(),
        album: z.string(),
        uri: z.string(),
        durationMs: z.number(),
      }),
    ),
  },
  'spotify.setVolume': {
    input: z.object({ volumePercent: z.number() }),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.addToQueue': {
    input: z.object({ uri: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for calendar operations */
export const calendarInvoke = {
  'calendar.listEvents': {
    input: z.object({
      calendarId: z.string().optional(),
      timeMin: z.string(),
      timeMax: z.string(),
      maxResults: z.number().optional(),
    }),
    output: z.array(
      z.object({
        id: z.string(),
        summary: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
        location: z.string().optional(),
        status: z.string(),
        attendees: z.number(),
      }),
    ),
  },
  'calendar.createEvent': {
    input: z.object({
      summary: z.string(),
      startDateTime: z.string(),
      endDateTime: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      timeZone: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }),
    output: z.object({
      id: z.string(),
      summary: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
      htmlLink: z.string(),
    }),
  },
  'calendar.deleteEvent': {
    input: z.object({ eventId: z.string(), calendarId: z.string().optional() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for briefing operations */
export const briefingInvoke = {
  'briefing.getDaily': {
    input: z.object({}),
    output: DailyBriefingSchema.nullable(),
  },
  'briefing.generate': {
    input: z.object({}),
    output: DailyBriefingSchema,
  },
  'briefing.getConfig': {
    input: z.object({}),
    output: BriefingConfigSchema,
  },
  'briefing.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      scheduledTime: z.string().optional(),
      includeGitHub: z.boolean().optional(),
      includeAgentActivity: z.boolean().optional(),
    }),
    output: BriefingConfigSchema,
  },
  'briefing.getSuggestions': {
    input: z.object({}),
    output: z.array(SuggestionSchema),
  },
} as const;

/** Invoke channels for time parser */
export const timeInvoke = {
  'time.parse': {
    input: z.object({
      text: z.string(),
      referenceDate: z.string().optional(),
    }),
    output: z
      .object({
        iso: z.string(),
        text: z.string(),
        isRelative: z.boolean(),
      })
      .nullable(),
  },
} as const;

/** Invoke channels for MCP operations */
export const mcpInvoke = {
  'mcp.callTool': {
    input: z.object({
      server: z.string(),
      tool: z.string(),
      args: z.record(z.string(), z.unknown()),
    }),
    output: z.object({
      content: z.array(
        z.object({
          type: z.string(),
          text: z.string(),
        }),
      ),
      isError: z.boolean(),
    }),
  },
  'mcp.listConnected': {
    input: z.object({}),
    output: z.array(z.string()),
  },
  'mcp.getConnectionState': {
    input: z.object({ server: z.string() }),
    output: z.enum(['disconnected', 'connecting', 'connected', 'error']),
  },
} as const;

/** Event channels for assistant-related events */
export const assistantEvents = {
  'event:assistant.response': {
    payload: z.object({ content: z.string(), type: z.enum(['text', 'action', 'error']) }),
  },
  'event:assistant.thinking': {
    payload: z.object({ isThinking: z.boolean() }),
  },
  'event:assistant.commandCompleted': {
    payload: z.object({
      id: z.string(),
      source: z.enum(['commandbar', 'slack', 'github']),
      action: z.string(),
      summary: z.string(),
      timestamp: z.string(),
    }),
  },
  'event:assistant.proactive': {
    payload: z.object({
      content: z.string(),
      source: z.enum(['watch', 'qa', 'agent']),
      taskId: z.string().optional(),
      followUp: z.string().optional(),
    }),
  },
  'event:claude.streamChunk': {
    payload: ClaudeStreamChunkSchema,
  },
  'event:webhook.received': {
    payload: z.object({
      source: z.enum(['slack', 'github']),
      commandText: z.string(),
      sourceContext: z.record(z.string(), z.string()),
      timestamp: z.string(),
    }),
  },
} as const;

/** Event channels for email-related events */
export const emailEvents = {
  'event:email.sent': {
    payload: z.object({
      messageId: z.string(),
      to: z.array(z.string()),
      subject: z.string(),
    }),
  },
  'event:email.failed': {
    payload: z.object({
      to: z.array(z.string()),
      subject: z.string(),
      error: z.string(),
    }),
  },
} as const;

/** Event channels for notification-related events */
export const notificationEvents = {
  'event:notifications.new': {
    payload: z.object({
      notification: NotificationSchema,
    }),
  },
  'event:notifications.watcherError': {
    payload: z.object({
      source: NotificationSourceSchema,
      error: z.string(),
    }),
  },
  'event:notifications.watcherStatusChanged': {
    payload: z.object({
      source: NotificationSourceSchema,
      status: z.enum(['started', 'stopped', 'polling', 'error']),
    }),
  },
} as const;

/** Event channels for GitHub-related events */
export const githubEvents = {
  'event:github.updated': {
    payload: z.object({
      type: z.enum(['pr', 'issue', 'notification']),
      owner: z.string(),
      repo: z.string(),
    }),
  },
} as const;

/** Event channels for briefing-related events */
export const briefingEvents = {
  'event:briefing.ready': {
    payload: z.object({
      briefingId: z.string(),
      date: z.string(),
    }),
  },
} as const;

/** Event channels for rate limiting */
export const rateLimitEvents = {
  'event:rateLimit.detected': {
    payload: z.object({
      taskId: z.string().optional(),
      provider: z.string(),
      retryAfter: z.number().optional(),
    }),
  },
} as const;
