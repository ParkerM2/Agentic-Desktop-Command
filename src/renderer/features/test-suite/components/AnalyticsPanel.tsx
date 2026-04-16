import { AlertTriangle, Clock, TrendingDown, XCircle } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  MetricCard,
  PageContent,
  ScrollArea,
  Skeleton,
} from '@ui';

import {
  useAnalyticsSummary,
  useAnalyticsTrend,
  useErrorPatterns,
  useFlakyTests,
  useSlowestTests,
  useTopFailures,
} from '../api/useTestSuiteAnalytics';

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
        <div className="grid grid-cols-4 gap-4 p-6">
          {['s1', 's2', 's3', 's4'].map((k) => (
            <Skeleton key={k} className="h-24" />
          ))}
        </div>
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

  const severityVariant = (s: string) => {
    if (s === 'high') return 'destructive' as const;
    if (s === 'medium') return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <PageContent>
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Total Scripts" value={String(summary.totalScripts)} />
            <MetricCard label="Total Runs" value={String(summary.totalRuns)} />
            <MetricCard label="Pass Rate" value={`${Math.round(summary.passRate)}%`} />
            <MetricCard label="Avg Duration" value={`${summary.avgDurationMs}ms`} />
          </div>

          {/* Trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pass / Fail Trend (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top failures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" /> Top Failures
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topFailures.length === 0 ? (
                  <p className="text-sm text-text-muted">No failures recorded</p>
                ) : (
                  <div className="space-y-2">
                    {topFailures.map((f) => (
                      <div key={f.scriptId} className="flex items-center justify-between text-sm">
                        <span className="truncate">{f.scriptName}</span>
                        <span className="shrink-0 text-text-muted">
                          {f.failureCount}/{f.totalRuns} ({f.failureRate}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Slowest tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-yellow-500" /> Slowest Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slowest.length === 0 ? (
                  <p className="text-sm text-text-muted">No duration data</p>
                ) : (
                  <div className="space-y-2">
                    {slowest.map((s) => (
                      <div key={s.scriptId} className="flex items-center justify-between text-sm">
                        <span className="truncate">{s.scriptName}</span>
                        <span className="shrink-0 text-text-muted">
                          avg {s.avgDurationMs}ms / max {s.maxDurationMs}ms
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flaky tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Flaky Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flakyTests.length === 0 ? (
                  <p className="text-sm text-text-muted">No flaky tests detected</p>
                ) : (
                  <div className="space-y-2">
                    {flakyTests.map((f) => (
                      <div key={f.scriptId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                          <span className="truncate">{f.scriptName}</span>
                        </div>
                        <span className="shrink-0 text-text-muted">{f.flakeRate}% flake rate</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-destructive" /> Error Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {errorPatterns.length === 0 ? (
                  <p className="text-sm text-text-muted">No error patterns found</p>
                ) : (
                  <div className="space-y-3">
                    {errorPatterns.map((ep) => (
                      <div key={ep.pattern} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{ep.count}x</Badge>
                          <span className="text-xs text-text-muted">
                            {ep.scriptIds.length} test{ep.scriptIds.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="truncate font-mono text-xs text-text-muted">{ep.pattern}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </PageContent>
  );
}
