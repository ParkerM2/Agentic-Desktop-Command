/**
 * Briefing Summary — Claude-powered and fallback summary text generation
 */

import type { AgentActivitySummary, Suggestion, TaskSummary } from '@shared/types';

import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { ClaudeClient } from '../claude/claude-client';

export interface BriefingSummaryDeps {
  claudeClient: ClaudeClient;
  agentOrchestrator?: AgentOrchestrator;
  getTodayDate: () => string;
}

export interface BriefingSummarizer {
  /** Generate summary text (Claude-powered with fallback) */
  generateSummary: (
    taskSummary: TaskSummary,
    agentActivity: AgentActivitySummary,
    suggestions: Suggestion[],
    githubCount: number,
  ) => Promise<string>;
}

/**
 * Create a briefing summarizer that produces natural language summaries.
 */
export function createBriefingSummarizer(deps: BriefingSummaryDeps): BriefingSummarizer {
  const { claudeClient, agentOrchestrator, getTodayDate } = deps;

  function pluralize(count: number, singular: string, plural: string): string {
    return count > 1 ? plural : singular;
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

  return {
    async generateSummary(taskSummary, agentActivity, suggestions, githubCount) {
      // Check if Claude is configured
      if (!claudeClient.isConfigured()) {
        return generateFallbackSummary(taskSummary, agentActivity, suggestions, githubCount);
      }

      const prompt = buildSummaryPrompt(taskSummary, agentActivity, suggestions, githubCount);

      try {
        const conversationId = claudeClient.createConversation('Daily Briefing');
        const response = await claudeClient.sendMessage(conversationId, prompt, {
          maxTokens: 500,
          systemPrompt:
            'You are a helpful assistant that generates brief, actionable daily briefings for a developer. Keep summaries concise and focused on what matters most today.',
        });

        claudeClient.clearConversation(conversationId);

        return response.message;
      } catch {
        return generateFallbackSummary(taskSummary, agentActivity, suggestions, githubCount);
      }
    },
  };
}
