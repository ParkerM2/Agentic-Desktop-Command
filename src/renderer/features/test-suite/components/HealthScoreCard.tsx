import { Card, CardContent, Flex, Progress, Stack, Text } from '@ui';

import { HEALTH_WEIGHTS } from '../lib/constants';

import type { HealthScore } from '../lib/health-score';

// ─── ScoreBar ────────────────────────────────────────────

interface ScoreBarProps {
  label: string;
  max: number;
  value: number;
}

function ScoreBar({ label, max, value }: ScoreBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <Flex align="center" gap="sm" wrap="nowrap">
      <Text className="w-16" size="sm" variant="muted">
        {label}
      </Text>
      <Progress value={pct} size="sm" className="flex-1" />
      <Text className="w-8 text-right" size="sm" variant="muted">
        {value}/{max}
      </Text>
    </Flex>
  );
}

// ─── HealthScoreCard ─────────────────────────────────────

interface HealthScoreCardProps {
  health: HealthScore;
}

export function HealthScoreCard({ health }: HealthScoreCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <Flex align="center" gap="lg" wrap="nowrap">
          <Text className={`text-6xl font-bold ${health.color}`}>{health.grade}</Text>
          <Stack className="flex-1" gap="sm">
            <Flex align="center" justify="between" wrap="nowrap">
              <Text className="font-medium">Test Health Score</Text>
              <Text className={`text-lg font-semibold ${health.color}`}>{health.score}/100</Text>
            </Flex>
            <Stack gap="none">
              <ScoreBar label="Pass Rate" max={HEALTH_WEIGHTS.passRate} value={health.breakdown.passRate} />
              <ScoreBar label="Stability" max={HEALTH_WEIGHTS.stability} value={health.breakdown.stability} />
              <ScoreBar label="Speed" max={HEALTH_WEIGHTS.speed} value={health.breakdown.speed} />
            </Stack>
          </Stack>
        </Flex>
      </CardContent>
    </Card>
  );
}
