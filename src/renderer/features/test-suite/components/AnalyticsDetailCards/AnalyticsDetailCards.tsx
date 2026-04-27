import { AlertTriangle, Clock, TrendingDown, XCircle } from 'lucide-react';

import type {
  ErrorPatternSchema,
  FlakyTestSchema,
  SlowestTestSchema,
  TopFailureSchema,
} from '@shared/ipc/test-suite';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Grid,
  Stack,
  Text,
} from '@ui';

import type { z } from 'zod';

type TopFailure = z.infer<typeof TopFailureSchema>;
type SlowestTest = z.infer<typeof SlowestTestSchema>;
type FlakyTest = z.infer<typeof FlakyTestSchema>;
type ErrorPattern = z.infer<typeof ErrorPatternSchema>;

// ─── Severity variant helper ─────────────────────────────

function severityVariant(s: string) {
  if (s === 'high') return 'destructive' as const;
  if (s === 'medium') return 'secondary' as const;
  return 'outline' as const;
}

// ─── Props ───────────────────────────────────────────────

interface AnalyticsDetailCardsProps {
  errorPatterns: ErrorPattern[];
  flakyTests: FlakyTest[];
  slowest: SlowestTest[];
  topFailures: TopFailure[];
}

// ─── Component ──────────────────────────────────────────

export function AnalyticsDetailCards({
  errorPatterns,
  flakyTests,
  slowest,
  topFailures,
}: AnalyticsDetailCardsProps) {
  return (
    <Grid cols={2} gap="md">
      {/* Top Failures */}
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
            <Stack gap="sm">
              {topFailures.map((f) => (
                <Flex key={f.scriptId} align="center" justify="between" wrap="nowrap">
                  <Text className="truncate">{f.scriptName}</Text>
                  <Text className="shrink-0" variant="muted">
                    {f.failureCount}/{f.totalRuns} ({f.failureRate}%)
                  </Text>
                </Flex>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Slowest Tests */}
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
            <Stack gap="sm">
              {slowest.map((s) => (
                <Flex key={s.scriptId} align="center" justify="between" wrap="nowrap">
                  <Text className="truncate">{s.scriptName}</Text>
                  <Text className="shrink-0" variant="muted">
                    avg {s.avgDurationMs}ms / max {s.maxDurationMs}ms
                  </Text>
                </Flex>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Flaky Tests */}
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
            <Stack gap="sm">
              {flakyTests.map((f) => (
                <Flex key={f.scriptId} align="center" justify="between" wrap="nowrap">
                  <Flex align="center" gap="sm" wrap="nowrap">
                    <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                    <Text className="truncate">{f.scriptName}</Text>
                  </Flex>
                  <Text className="shrink-0" variant="muted">
                    {f.flakeRate}% flake rate
                  </Text>
                </Flex>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Error Patterns */}
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
            <Stack gap="md">
              {errorPatterns.map((ep) => (
                <Stack key={ep.pattern} gap="none">
                  <Flex align="center" justify="between" wrap="nowrap">
                    <Badge variant="secondary">{ep.count}x</Badge>
                    <Text size="sm" variant="muted">
                      {ep.scriptIds.length} test{ep.scriptIds.length > 1 ? 's' : ''}
                    </Text>
                  </Flex>
                  <Text className="truncate font-mono" size="sm" variant="muted">
                    {ep.pattern}
                  </Text>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}
