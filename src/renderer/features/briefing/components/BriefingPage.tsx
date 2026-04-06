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

import { Button, Card, CardContent, EmptyState, Heading, MetricCard, PageContent, PageHeader, PageLayout } from '@ui';

import { useDailyBriefing, useGenerateBriefing, useSuggestions } from '../api/useBriefing';

import { SuggestionCard } from './SuggestionCard';

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function LoadingState() {
  return (
    <div className="text-muted-foreground flex items-center justify-center py-12">
      Loading briefing...
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

  function renderContent() {
    if (briefingLoading) {
      return <LoadingState />;
    }

    if (!hasBriefing) {
      return (
        <EmptyState
          description="Generate your daily briefing to see a summary of your tasks and suggestions."
          icon={Sun}
          title="No briefing yet"
          action={
            <Button
              disabled={generateBriefing.isPending}
              onClick={handleGenerate}
            >
              <RefreshCw className={`h-4 w-4 ${generateBriefing.isPending ? 'animate-spin' : ''}`} />
              Generate Briefing
            </Button>
          }
        />
      );
    }

    return null;
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title
            description={hasBriefing ? `Generated at ${formatTime(briefing.generatedAt)}` : undefined}
          >
            Daily Briefing
          </PageHeader.Title>
          <PageHeader.Actions>
            <Button
              disabled={generateBriefing.isPending}
              variant="outline"
              onClick={handleGenerate}
            >
              <RefreshCw className={`h-4 w-4 ${generateBriefing.isPending ? 'animate-spin' : ''}`} />
              {generateBriefing.isPending ? 'Generating...' : 'Generate Now'}
            </Button>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>

      <PageContent>
        {renderContent()}

        {hasBriefing ? (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardContent className="p-6">
                <p className="text-foreground text-lg">{briefing.summary}</p>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Task Summary */}
              <Card>
                <CardContent className="p-4">
                  <Heading as="h3" className="mb-4 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Tasks
                  </Heading>
                  <div className="space-y-3">
                    <MetricCard
                      icon={Clock}
                      label="In Progress"
                      value={String(briefing.taskSummary.inProgress)}
                      variant="compact"
                    />
                    <MetricCard
                      icon={AlertCircle}
                      label="In Queue"
                      value={String(briefing.taskSummary.dueToday)}
                      variant="compact"
                    />
                    <MetricCard
                      icon={CheckCircle2}
                      label="Completed Yesterday"
                      value={String(briefing.taskSummary.completedYesterday)}
                      variant="compact"
                    />
                    {briefing.taskSummary.overdue > 0 ? (
                      <MetricCard
                        icon={AlertCircle}
                        label="Overdue"
                        value={String(briefing.taskSummary.overdue)}
                        variant="compact"
                      />
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* Agent Activity */}
              <Card>
                <CardContent className="p-4">
                  <Heading as="h3" className="mb-4 flex items-center gap-2 text-sm">
                    <Cpu className="h-4 w-4" />
                    Agent Activity
                  </Heading>
                  <div className="space-y-3">
                    <MetricCard
                      icon={Cpu}
                      label="Running"
                      value={String(briefing.agentActivity.runningCount)}
                      variant="compact"
                    />
                    <MetricCard
                      icon={CheckCircle2}
                      label="Completed Today"
                      value={String(briefing.agentActivity.completedToday)}
                      variant="compact"
                    />
                    {briefing.agentActivity.errorCount > 0 ? (
                      <MetricCard
                        icon={AlertCircle}
                        label="Errors"
                        value={String(briefing.agentActivity.errorCount)}
                        variant="compact"
                      />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* GitHub Notifications */}
            {briefing.githubNotifications !== undefined && briefing.githubNotifications > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="text-muted-foreground h-4 w-4" />
                    <span className="text-foreground text-sm font-medium">
                      {String(briefing.githubNotifications)} unread GitHub notification
                      {briefing.githubNotifications > 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Suggestions */}
            {displaySuggestions.length > 0 ? (
              <div>
                <Heading as="h3" className="mb-4 flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4" />
                  Suggestions
                </Heading>
                <div className="space-y-3">
                  {displaySuggestions.map((suggestion, index) => (
                    <SuggestionCard
                      key={`${suggestion.type}-${String(index)}`}
                      suggestion={suggestion}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </PageContent>
    </PageLayout>
  );
}
