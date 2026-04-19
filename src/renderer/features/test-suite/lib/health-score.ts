import { GRADE_THRESHOLDS, HEALTH_WEIGHTS, SPEED_THRESHOLDS } from './constants';

export interface HealthScore {
  score: number;
  grade: string;
  color: string;
  breakdown: { passRate: number; stability: number; speed: number };
}

export function computeHealthScore(summary: {
  passRate: number;
  avgDurationMs: number;
  flakyCount: number;
  totalScripts: number;
}): HealthScore {
  const passRate = Math.min(HEALTH_WEIGHTS.passRate, Math.round(summary.passRate * 0.4));
  const flakyRatio = summary.totalScripts > 0 ? summary.flakyCount / summary.totalScripts : 0;
  const stability = Math.max(0, Math.round(HEALTH_WEIGHTS.stability * (1 - flakyRatio)));
  const avgSec = summary.avgDurationMs / 1000;
  const speed = speedFromAvgSec(avgSec);
  const score = passRate + stability + speed;
  // GRADE_THRESHOLDS always has a { min: 0 } fallback entry so `find` never returns undefined.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const threshold = GRADE_THRESHOLDS.find((t) => score >= t.min)!;
  return {
    score,
    grade: threshold.grade,
    color: threshold.color,
    breakdown: { passRate, stability, speed },
  };
}

function speedFromAvgSec(avgSec: number): number {
  if (avgSec <= SPEED_THRESHOLDS.fast) return HEALTH_WEIGHTS.speed;
  if (avgSec >= SPEED_THRESHOLDS.medium) return 0;
  return Math.round(
    HEALTH_WEIGHTS.speed * (1 - (avgSec - SPEED_THRESHOLDS.fast) / SPEED_THRESHOLDS.curve),
  );
}
