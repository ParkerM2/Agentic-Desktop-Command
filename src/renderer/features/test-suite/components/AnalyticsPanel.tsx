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
  Text,
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

interface HealthScore {
  score: number;
  grade: string;
  color: string;
  breakdown: { passRate: number; stability: number; speed: number };
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function colorFromScore(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 80) return 'text-blue-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 60) return 'text-orange-500';
  return 'text-destructive';
}

function speedFromAvgSec(avgSec: number): number {
  if (avgSec <= 5) return 30;
  if (avgSec >= 30) return 0;
  return Math.round(30 * (1 - (avgSec - 5) / 25));
}

function computeHealthScore(summary: {
  passRate: number;
  avgDurationMs: number;
  flakyCount: number;
  totalScripts: number;
}): HealthScore {
  const passRate = Math.min(40, Math.round(summary.passRate * 0.4));
  const flakyRatio = summary.totalScripts > 0 ? summary.flakyCount / summary.totalScripts : 0;
  const stability = Math.max(0, Math.round(30 * (1 - flakyRatio)));
  const avgSec = summary.avgDurationMs / 1000;
  const speed = speedFromAvgSec(avgSec);
  const score = passRate + stability + speed;
  const grade = gradeFromScore(score);
  const color = colorFromScore(score);
  return { score, grade, color, breakdown: { passRate, stability, speed } };
}

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

  const health = computeHealthScore(summary);

  const severityVariant = (s: string) => {
    if (s === 'high') return 'destructive' as const;
    if (s === 'medium') return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <PageContent>
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          {/* Health score card */}
          <Card>
            <CardContent className="flex items-center gap-6 p-6">
              <div className={`text-6xl font-bold ${health.color}`}>{health.grade}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Text className="font-medium">Test Health Score</Text>
                  <Text className={`text-lg font-semibold ${health.color}`}>
                    {health.score}/100
                  </Text>
                </div>
                <div className="space-y-1">
                  <ScoreBar label="Pass Rate" max={40} value={health.breakdown.passRate} />
                  <ScoreBar label="Stability" max={30} value={health.breakdown.stability} />
                  <ScoreBar label="Speed" max={30} value={health.breakdown.speed} />
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <Text variant="muted">No failures recorded</Text>
                ) : (
                  <div className="space-y-2">
                    {topFailures.map((f) => (
                      <div key={f.scriptId} className="flex items-center justify-between text-sm">
                        <Text className="truncate">{f.scriptName}</Text>
                        <Text className="shrink-0" variant="muted">
                          {f.failureCount}/{f.totalRuns} ({f.failureRate}%)
                        </Text>
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
                  <Text variant="muted">No duration data</Text>
                ) : (
                  <div className="space-y-2">
                    {slowest.map((s) => (
                      <div key={s.scriptId} className="flex items-center justify-between text-sm">
                        <Text className="truncate">{s.scriptName}</Text>
                        <Text className="shrink-0" variant="muted">
                          avg {s.avgDurationMs}ms / max {s.maxDurationMs}ms
                        </Text>
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
                  <Text variant="muted">No flaky tests detected</Text>
                ) : (
                  <div className="space-y-2">
                    {flakyTests.map((f) => (
                      <div key={f.scriptId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                          <Text className="truncate">{f.scriptName}</Text>
                        </div>
                        <Text className="shrink-0" variant="muted">{f.flakeRate}% flake rate</Text>
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
                  <Text variant="muted">No error patterns found</Text>
                ) : (
                  <div className="space-y-3">
                    {errorPatterns.map((ep) => (
                      <div key={ep.pattern} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{ep.count}x</Badge>
                          <Text size="sm" variant="muted">
                            {ep.scriptIds.length} test{ep.scriptIds.length > 1 ? 's' : ''}
                          </Text>
                        </div>
                        <Text className="truncate font-mono" size="sm" variant="muted">{ep.pattern}</Text>
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

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Text className="w-16" size="sm" variant="muted">{label}</Text>
      <div className="h-1.5 flex-1 rounded-full bg-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <Text className="w-8 text-right" size="sm" variant="muted">
        {value}/{max}
      </Text>
    </div>
  );
}
