/**
 * BriefingPage — Daily briefing with tasks, agents, and suggestions
 */

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  GitBranch,
  Lightbulb,
  RefreshCw,
  Sun,
} from 'lucide-react';

import { useDailyBriefing, useGenerateBriefing, useSuggestions } from '../api/useBriefing';

import { SuggestionCard } from './SuggestionCard';

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatItem(props: { icon: React.ElementType; label: string; value: string | number; variant?: 'default' | 'success' | 'warning' | 'error' }) {
  const IconComponent = props.icon;
  const variant = props.variant ?? 'default';

  const colorMap = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-destructive',
  };
  const iconColor = colorMap[variant];

  return (
    <div className="flex items-center gap-2">
      <IconComponent className={`h-4 w-4 ${iconColor}`} />
      <span className="text-muted-foreground text-sm">{props.label}:</span>
      <span className="text-foreground text-sm font-medium">{String(props.value)}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-muted-foreground flex items-center justify-center py-12">
      Loading briefing...
    </div>
  );
}

interface EmptyStateProps {
  isPending: boolean;
  onGenerate: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

function EmptyState({ isPending, onGenerate, onKeyDown }: EmptyStateProps) {
  return (
    <div className="border-border bg-card rounded-lg border p-8 text-center">
      <Sun className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
      <h2 className="text-foreground mb-2 text-lg font-semibold">No briefing yet</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Generate your daily briefing to see a summary of your tasks and suggestions.
      </p>
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
        disabled={isPending}
        type="button"
        onClick={onGenerate}
        onKeyDown={onKeyDown}
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        Generate Briefing
      </button>
    </div>
  );
}

export function BriefingPage() {
  const { data: briefing, isLoading: briefingLoading } = useDailyBriefing();
  const { data: suggestions } = useSuggestions();
  const generateBriefing = useGenerateBriefing();

  const displaySuggestions = briefing?.suggestions ?? suggestions ?? [];
  const hasBriefing = briefing !== null && briefing !== undefined;

  function handleGenerate(): void {
    generateBriefing.mutate();
  }

  function handleGenerateKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleGenerate();
    }
  }

  function renderContent() {
    if (briefingLoading) {
      return <LoadingState />;
    }

    if (!hasBriefing) {
      return (
        <EmptyState
          isPending={generateBriefing.isPending}
          onGenerate={handleGenerate}
          onKeyDown={handleGenerateKeyDown}
        />
      );
    }

    return null;
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="text-primary h-6 w-6" />
            <h1 className="text-foreground text-2xl font-bold">Daily Briefing</h1>
          </div>
          <button
            className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
            disabled={generateBriefing.isPending}
            type="button"
            onClick={handleGenerate}
            onKeyDown={handleGenerateKeyDown}
          >
            <RefreshCw className={`h-4 w-4 ${generateBriefing.isPending ? 'animate-spin' : ''}`} />
            {generateBriefing.isPending ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
        {hasBriefing ? (
          <p className="text-muted-foreground mt-1 text-sm">
            Generated at {formatTime(briefing.generatedAt)}
          </p>
        ) : null}
      </div>

      {renderContent()}

      {hasBriefing ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="border-border bg-card rounded-lg border p-6">
            <p className="text-foreground text-lg">{briefing.summary}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Task Summary */}
            <div className="border-border bg-card rounded-lg border p-4">
              <h3 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Tasks
              </h3>
              <div className="space-y-3">
                <StatItem
                  icon={Clock}
                  label="In Progress"
                  value={briefing.taskSummary.inProgress}
                />
                <StatItem
                  icon={AlertCircle}
                  label="In Queue"
                  value={briefing.taskSummary.dueToday}
                  variant={briefing.taskSummary.dueToday > 5 ? 'warning' : 'default'}
                />
                <StatItem
                  icon={CheckCircle2}
                  label="Completed Yesterday"
                  value={briefing.taskSummary.completedYesterday}
                  variant="success"
                />
                {briefing.taskSummary.overdue > 0 && (
                  <StatItem
                    icon={AlertCircle}
                    label="Overdue"
                    value={briefing.taskSummary.overdue}
                    variant="error"
                  />
                )}
              </div>
            </div>

            {/* Agent Activity */}
            <div className="border-border bg-card rounded-lg border p-4">
              <h3 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4" />
                Agent Activity
              </h3>
              <div className="space-y-3">
                <StatItem
                  icon={Cpu}
                  label="Running"
                  value={briefing.agentActivity.runningCount}
                  variant={briefing.agentActivity.runningCount > 0 ? 'success' : 'default'}
                />
                <StatItem
                  icon={CheckCircle2}
                  label="Completed Today"
                  value={briefing.agentActivity.completedToday}
                  variant="success"
                />
                {briefing.agentActivity.errorCount > 0 && (
                  <StatItem
                    icon={AlertCircle}
                    label="Errors"
                    value={briefing.agentActivity.errorCount}
                    variant="error"
                  />
                )}
              </div>
            </div>
          </div>

          {/* GitHub Notifications */}
          {briefing.githubNotifications !== undefined && briefing.githubNotifications > 0 && (
            <div className="border-border bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <GitBranch className="text-muted-foreground h-4 w-4" />
                <span className="text-foreground text-sm font-medium">
                  {String(briefing.githubNotifications)} unread GitHub notification{briefing.githubNotifications > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {displaySuggestions.length > 0 && (
            <div>
              <h3 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="h-4 w-4" />
                Suggestions
              </h3>
              <div className="space-y-3">
                {displaySuggestions.map((suggestion, index) => (
                  <SuggestionCard key={`${suggestion.type}-${String(index)}`} suggestion={suggestion} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
