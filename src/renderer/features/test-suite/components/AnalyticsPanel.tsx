import { useLooseParams } from '@renderer/shared/hooks';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Grid,
  MetricCard,
  PageContent,
  ScrollArea,
  Skeleton,
  Stack,
} from '@ui';

import {
  useAnalyticsSummary,
  useAnalyticsTrend,
  useErrorPatterns,
  useFlakyTests,
  useSlowestTests,
  useTopFailures,
} from '../api/useTestSuiteAnalytics';
import { computeHealthScore } from '../lib/health-score';

import { AnalyticsDetailCards } from './AnalyticsDetailCards';
import { HealthScoreCard } from './HealthScoreCard';
import { TrendChart } from './TrendChart';

export function AnalyticsPanel() {
  const { projectId } = useLooseParams();
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(projectId);
  const { data: trend = [] } = useAnalyticsTrend(projectId);
  const { data: topFailures = [] } = useTopFailures(projectId);
  const { data: slowest = [] } = useSlowestTests(projectId);
  const { data: errorPatterns = [] } = useErrorPatterns(projectId);
  const { data: flakyTests = [] } = useFlakyTests(projectId);

  if (!projectId) return null;

  if (summaryLoading) {
    return (
      <PageContent>
        <Grid className="p-6" cols={4} gap="md">
          {['s1', 's2', 's3', 's4'].map((k) => (
            <Skeleton key={k} className="h-24" />
          ))}
        </Grid>
      </PageContent>
    );
  }

  if (!summary || summary.totalRuns === 0) {
    return (
      <PageContent>
        <EmptyState
          description="Run some tests first to see analytics here."
          title="No analytics data"
        />
      </PageContent>
    );
  }

  const health = computeHealthScore(summary);

  return (
    <PageContent>
      <ScrollArea className="h-full">
        <Stack className="p-6" gap="lg">
          <HealthScoreCard health={health} />

          <Grid cols={4} gap="md">
            <MetricCard label="Total Scripts" value={String(summary.totalScripts)} />
            <MetricCard label="Total Runs" value={String(summary.totalRuns)} />
            <MetricCard label="Pass Rate" value={`${Math.round(summary.passRate)}%`} />
            <MetricCard label="Avg Duration" value={`${summary.avgDurationMs}ms`} />
          </Grid>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pass / Fail Trend (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} />
            </CardContent>
          </Card>

          <AnalyticsDetailCards
            errorPatterns={errorPatterns}
            flakyTests={flakyTests}
            slowest={slowest}
            topFailures={topFailures}
          />
        </Stack>
      </ScrollArea>
    </PageContent>
  );
}
