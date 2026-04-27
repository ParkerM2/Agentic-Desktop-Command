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

import { AnalyticsDetailCards } from '../AnalyticsDetailCards';
import { HealthScoreCard } from '../HealthScoreCard';
import { TrendChart } from '../TrendChart';

import { useAnalyticsPanel } from './useAnalyticsPanel';

export function AnalyticsPanel() {
  const vm = useAnalyticsPanel();

  if (!vm.projectId) return null;

  if (vm.summaryLoading) {
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

  if (!vm.summary || vm.summary.totalRuns === 0) {
    return (
      <PageContent>
        <EmptyState
          description="Run some tests first to see analytics here."
          title="No analytics data"
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <ScrollArea className="h-full">
        <Stack className="p-6" gap="lg">
          {vm.health ? <HealthScoreCard health={vm.health} /> : null}

          <Grid cols={4} gap="md">
            <MetricCard label="Total Scripts" value={String(vm.summary.totalScripts)} />
            <MetricCard label="Total Runs" value={String(vm.summary.totalRuns)} />
            <MetricCard label="Pass Rate" value={`${Math.round(vm.summary.passRate)}%`} />
            <MetricCard label="Avg Duration" value={`${vm.summary.avgDurationMs}ms`} />
          </Grid>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pass / Fail Trend (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={vm.trend} />
            </CardContent>
          </Card>

          <AnalyticsDetailCards
            errorPatterns={vm.errorPatterns}
            flakyTests={vm.flakyTests}
            slowest={vm.slowest}
            topFailures={vm.topFailures}
          />
        </Stack>
      </ScrollArea>
    </PageContent>
  );
}
