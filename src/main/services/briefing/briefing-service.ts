/**
 * Briefing Service — Daily briefing generation
 *
 * Generates daily briefings by aggregating:
 * - Tasks due today (from taskService)
 * - Tasks completed yesterday
 * - Overdue tasks
 * - Agent activity summary
 * - GitHub notifications (if configured)
 *
 * Uses ClaudeClient to generate natural language summary.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type {
  BriefingConfig,
  DailyBriefing,
  TaskSummary,
  AgentActivitySummary,
  Suggestion,
} from '@shared/types';

import type { SuggestionEngine } from './suggestion-engine';
import type { IpcRouter } from '../../ipc/router';
import type { AgentService } from '../agent/agent-service';
import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { ClaudeClient } from '../claude/claude-client';
import type { NotificationManager } from '../notifications';
import type { ProjectService } from '../project/project-service';
import type { TaskService } from '../project/task-service';

const BRIEFING_FILE = 'briefings.json';
const CONFIG_FILE = 'briefing-config.json';
const BRIEFING_READY_EVENT = 'event:briefing.ready' as const;

const DEFAULT_CONFIG: BriefingConfig = {
  enabled: true,
  scheduledTime: '09:00',
  includeGitHub: true,
  includeAgentActivity: true,
};

/** Briefing service interface */
export interface BriefingService {
  /** Get the current daily briefing (cached for the day) */
  getDailyBriefing: () => DailyBriefing | null;
  /** Generate a new daily briefing */
  generateBriefing: () => Promise<DailyBriefing>;
  /** Get briefing configuration */
  getConfig: () => BriefingConfig;
  /** Update briefing configuration */
  updateConfig: (updates: Partial<BriefingConfig>) => BriefingConfig;
  /** Get proactive suggestions */
  getSuggestions: () => Suggestion[];
  /** Start the scheduled briefing checker */
  startScheduler: () => void;
  /** Stop the scheduled briefing checker */
  stopScheduler: () => void;
}

/** Dependencies for the briefing service */
export interface BriefingServiceDeps {
  router: IpcRouter;
  projectService: ProjectService;
  taskService: TaskService;
  agentService: AgentService;
  claudeClient: ClaudeClient;
  notificationManager?: NotificationManager;
  suggestionEngine: SuggestionEngine;
  agentOrchestrator?: AgentOrchestrator;
}

interface BriefingsStore {
  briefings: DailyBriefing[];
}

/**
 * Create a briefing service instance.
 */
export function createBriefingService(deps: BriefingServiceDeps): BriefingService {
  const {
    router,
    projectService,
    taskService,
    agentService,
    claudeClient,
    notificationManager,
    suggestionEngine,
    agentOrchestrator,
  } = deps;

  const dataDir = app.getPath('userData');
  const briefingPath = join(dataDir, BRIEFING_FILE);
  const configPath = join(dataDir, CONFIG_FILE);

  let schedulerInterval: ReturnType<typeof setInterval> | null = null;
  let lastScheduledDate = '';

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  function loadBriefings(): BriefingsStore {
    if (!existsSync(briefingPath)) {
      return { briefings: [] };
    }
    try {
      const content = readFileSync(briefingPath, 'utf-8');
      return JSON.parse(content) as BriefingsStore;
    } catch {
      return { briefings: [] };
    }
  }

  function saveBriefings(store: BriefingsStore): void {
    writeFileSync(briefingPath, JSON.stringify(store, null, 2));
  }

  function loadConfig(): BriefingConfig {
    if (!existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }
    try {
      const content = readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...(JSON.parse(content) as Partial<BriefingConfig>) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  function saveConfig(config: BriefingConfig): void {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0] ?? '';
  }

  function getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0] ?? '';
  }

  function isCompletedYesterday(
    task: { status: string; updatedAt: string },
    yesterday: string,
  ): boolean {
    if (task.status !== 'done') return false;
    const updatedDate = task.updatedAt.split('T')[0];
    return updatedDate === yesterday;
  }

  function isDueToday(task: { status: string; createdAt: string }, today: string): boolean {
    if (task.status !== 'queue' && task.status !== 'backlog') return false;
    const createdDate = task.createdAt.split('T')[0];
    return createdDate === today || task.status === 'queue';
  }

  function isOverdue(task: { status: string; updatedAt: string }): boolean {
    if (task.status !== 'error' && task.status !== 'human_review') return false;
    const updatedTime = new Date(task.updatedAt).getTime();
    const hoursSinceUpdate = (Date.now() - updatedTime) / (60 * 60 * 1000);
    return hoursSinceUpdate > 24;
  }

  function getTaskSummary(): TaskSummary {
    const projects = projectService.listProjectsSync();
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    let dueToday = 0;
    let completedYesterday = 0;
    let overdue = 0;
    let inProgress = 0;

    for (const project of projects) {
      const tasks = taskService.listTasks(project.id);

      for (const task of tasks) {
        if (task.status === 'in_progress') inProgress++;
        if (isCompletedYesterday(task, yesterday)) completedYesterday++;
        if (isDueToday(task, today)) dueToday++;
        if (isOverdue(task)) overdue++;
      }
    }

    return { dueToday, completedYesterday, overdue, inProgress };
  }

  function getOrchestratorCounts(today: string): AgentActivitySummary {
    if (!agentOrchestrator) {
      return { runningCount: 0, completedToday: 0, errorCount: 0 };
    }
    let runningCount = 0;
    let completedToday = 0;
    let errorCount = 0;
    for (const session of agentOrchestrator.listActiveSessions()) {
      if (session.status === 'active' || session.status === 'spawning') {
        runningCount++;
      }
      if (session.status === 'completed' && session.spawnedAt.startsWith(today)) {
        completedToday++;
      }
      if (session.status === 'error') {
        errorCount++;
      }
    }
    return { runningCount, completedToday, errorCount };
  }

  function getAgentActivitySummary(): AgentActivitySummary {
    const agents = agentService.listAllAgents();
    const today = getTodayDate();

    let runningCount = 0;
    let completedToday = 0;
    let errorCount = 0;

    for (const agent of agents) {
      if (agent.status === 'running') {
        runningCount++;
      }

      if (agent.status === 'completed') {
        const completedDate = agent.completedAt?.split('T')[0];
        if (completedDate === today) {
          completedToday++;
        }
      }

      if (agent.status === 'error') {
        errorCount++;
      }
    }

    // Include orchestrator sessions if available
    const orchCounts = getOrchestratorCounts(today);
    runningCount += orchCounts.runningCount;
    completedToday += orchCounts.completedToday;
    errorCount += orchCounts.errorCount;

    return { runningCount, completedToday, errorCount };
  }

  function getGitHubNotificationCount(): number {
    if (notificationManager === undefined) {
      return 0;
    }

    try {
      const notifications = notificationManager.listNotifications({
        sources: ['github'],
        unreadOnly: true,
      });
      return notifications.length;
    } catch {
      return 0;
    }
  }

  async function generateSummary(
    taskSummary: TaskSummary,
    agentActivity: AgentActivitySummary,
    suggestions: Suggestion[],
    githubCount: number,
  ): Promise<string> {
    // Check if Claude is configured
    if (!claudeClient.isConfigured()) {
      return generateFallbackSummary(taskSummary, agentActivity, suggestions, githubCount);
    }

    const prompt = buildSummaryPrompt(taskSummary, agentActivity, suggestions, githubCount);

    try {
      // Create a temporary conversation for this summary
      const conversationId = claudeClient.createConversation('Daily Briefing');
      const response = await claudeClient.sendMessage(conversationId, prompt, {
        maxTokens: 500,
        systemPrompt:
          'You are a helpful assistant that generates brief, actionable daily briefings for a developer. Keep summaries concise and focused on what matters most today.',
      });

      // Clean up conversation after use
      claudeClient.clearConversation(conversationId);

      return response.message;
    } catch {
      // Fall back to simple summary if Claude fails
      return generateFallbackSummary(taskSummary, agentActivity, suggestions, githubCount);
    }
  }

  function buildSummaryPrompt(
    taskSummary: TaskSummary,
    agentActivity: AgentActivitySummary,
    suggestions: Suggestion[],
    githubCount: number,
  ): string {
    let orchestratorSection = '';
    if (agentOrchestrator) {
      const orchSessions = agentOrchestrator.listActiveSessions();
      const orchActive = orchSessions.filter(
        (s) => s.status === 'active' || s.status === 'spawning',
      ).length;
      const orchCompletedToday = orchSessions.filter(
        (s) => s.status === 'completed' && s.spawnedAt.startsWith(getTodayDate()),
      ).length;
      const orchErrors = orchSessions.filter((s) => s.status === 'error').length;
      orchestratorSection = `
Orchestrator:
- ${String(orchActive)} headless agent sessions active
- ${String(orchCompletedToday)} completed today
- ${String(orchErrors)} failed
`;
    }

    return `Generate a brief daily briefing summary (2-3 sentences) based on this data:

Tasks:
- ${String(taskSummary.dueToday)} tasks in queue
- ${String(taskSummary.inProgress)} tasks in progress
- ${String(taskSummary.completedYesterday)} completed yesterday
- ${String(taskSummary.overdue)} overdue

Agents:
- ${String(agentActivity.runningCount)} currently running
- ${String(agentActivity.completedToday)} completed today
- ${String(agentActivity.errorCount)} with errors
${orchestratorSection}
GitHub: ${String(githubCount)} unread notifications

Suggestions: ${suggestions.map((s) => s.title).join(', ') || 'None'}

Focus on the most important action items for today.`;
  }

  function pluralize(count: number, singular: string, plural: string): string {
    return count > 1 ? plural : singular;
  }

  function buildFallbackParts(
    taskSummary: TaskSummary,
    agentActivity: AgentActivitySummary,
    githubCount: number,
    suggestions: Suggestion[],
  ): string[] {
    const parts: string[] = [];

    if (taskSummary.inProgress > 0) {
      parts.push(`${String(taskSummary.inProgress)} ${pluralize(taskSummary.inProgress, 'task', 'tasks')} in progress`);
    }
    if (taskSummary.dueToday > 0) {
      parts.push(`${String(taskSummary.dueToday)} ${pluralize(taskSummary.dueToday, 'task', 'tasks')} in queue`);
    }
    if (taskSummary.overdue > 0) {
      parts.push(`${String(taskSummary.overdue)} overdue`);
    }
    if (agentActivity.runningCount > 0) {
      parts.push(`${String(agentActivity.runningCount)} ${pluralize(agentActivity.runningCount, 'agent', 'agents')} running`);
    }
    if (agentActivity.errorCount > 0) {
      parts.push(`${String(agentActivity.errorCount)} agent ${pluralize(agentActivity.errorCount, 'error', 'errors')}`);
    }
    if (githubCount > 0) {
      parts.push(`${String(githubCount)} GitHub ${pluralize(githubCount, 'notification', 'notifications')}`);
    }
    if (suggestions.length > 0) {
      parts.push(`${String(suggestions.length)} ${pluralize(suggestions.length, 'suggestion', 'suggestions')} available`);
    }

    return parts;
  }

  function generateFallbackSummary(
    taskSummary: TaskSummary,
    agentActivity: AgentActivitySummary,
    suggestions: Suggestion[],
    githubCount: number,
  ): string {
    const parts = buildFallbackParts(taskSummary, agentActivity, githubCount, suggestions);

    // Orchestrator summary
    if (agentOrchestrator) {
      const orchActive = agentOrchestrator.listActiveSessions().filter(
        (s) => s.status === 'active' || s.status === 'spawning',
      ).length;
      if (orchActive > 0) {
        parts.push(
          `${String(orchActive)} headless agent ${pluralize(orchActive, 'session', 'sessions')}`,
        );
      }
    }

    if (parts.length === 0) {
      return 'All clear! No pending tasks or issues to address.';
    }

    return `Today: ${parts.join(', ')}.`;
  }

  function generateId(): string {
    return `briefing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function checkScheduledTime(): void {
    const config = loadConfig();
    if (!config.enabled) return;

    const now = new Date();
    const today = getTodayDate();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if we should generate today's briefing
    if (currentTime === config.scheduledTime && lastScheduledDate !== today) {
      lastScheduledDate = today;
      void generateBriefing().then((briefing) => {
        router.emit(BRIEFING_READY_EVENT, { briefingId: briefing.id, date: briefing.date });
        return briefing;
      });
    }
  }

  async function generateBriefing(): Promise<DailyBriefing> {
    const config = loadConfig();
    const taskSummary = getTaskSummary();
    const agentActivity = config.includeAgentActivity
      ? getAgentActivitySummary()
      : {
          runningCount: 0,
          completedToday: 0,
          errorCount: 0,
        };
    const suggestions = suggestionEngine.getSuggestions();
    const githubNotifications = config.includeGitHub ? getGitHubNotificationCount() : 0;

    const summary = await generateSummary(
      taskSummary,
      agentActivity,
      suggestions,
      githubNotifications,
    );

    const briefing: DailyBriefing = {
      id: generateId(),
      date: getTodayDate(),
      summary,
      taskSummary,
      agentActivity,
      suggestions,
      githubNotifications: config.includeGitHub ? githubNotifications : undefined,
      generatedAt: new Date().toISOString(),
    };

    // Save the briefing
    const store = loadBriefings();
    // Remove old briefings for the same day
    store.briefings = store.briefings.filter((b) => b.date !== briefing.date);
    store.briefings.push(briefing);
    // Keep only last 30 days of briefings
    store.briefings = store.briefings.slice(-30);
    saveBriefings(store);

    return briefing;
  }

  return {
    getDailyBriefing() {
      const store = loadBriefings();
      const today = getTodayDate();
      return store.briefings.find((b) => b.date === today) ?? null;
    },

    generateBriefing,

    getConfig() {
      return loadConfig();
    },

    updateConfig(updates) {
      const config = loadConfig();
      const updated = { ...config, ...updates };
      saveConfig(updated);
      return updated;
    },

    getSuggestions() {
      return suggestionEngine.getSuggestions();
    },

    startScheduler() {
      if (schedulerInterval !== null) return;
      // Check every minute for scheduled time
      schedulerInterval = setInterval(checkScheduledTime, 60 * 1000);
      // Also check immediately
      checkScheduledTime();
    },

    stopScheduler() {
      if (schedulerInterval !== null) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
      }
    },
  };
}
