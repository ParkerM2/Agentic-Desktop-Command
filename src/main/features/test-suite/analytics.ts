/**
 * Test Suite Analytics — Aggregation queries over testSuiteRuns
 *
 * Provides summary stats, trend data, failure analysis, flaky test
 * detection, and error pattern extraction for the test suite dashboard.
 */

import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';

import { testSuiteRuns, testSuiteScripts } from '../../db/schema';

import type { AdcDatabase } from '../../db';

// ── Exported Types ─────────────────────────────────────────────

export interface AnalyticsSummary {
  totalScripts: number;
  totalRuns: number;
  passRate: number;
  avgDurationMs: number;
  flakyCount: number;
}

export interface TrendPoint {
  date: string;
  passed: number;
  failed: number;
  flaky: number;
  total: number;
}

export interface TopFailure {
  scriptId: string;
  scriptName: string;
  failureCount: number;
  totalRuns: number;
  failureRate: number;
}

export interface SlowestTest {
  scriptId: string;
  scriptName: string;
  avgDurationMs: number;
  maxDurationMs: number;
  runCount: number;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  scriptIds: string[];
  lastSeen: string;
}

export interface FlakyTest {
  scriptId: string;
  scriptName: string;
  flakeRate: number;
  severity: 'high' | 'medium' | 'low';
  recentResults: Array<'passed' | 'failed'>;
}

// ── Error-Pattern Helpers ──────────────────────────────────────

function extractErrorLines(output: string | null): string[] {
  if (!output) return [];

  let parsed: { error?: string; outputLines?: string[] };
  try {
    parsed = JSON.parse(output) as { error?: string; outputLines?: string[] };
  } catch {
    return [];
  }

  const lines: string[] = [];
  if (parsed.error) lines.push(parsed.error);
  if (parsed.outputLines) {
    for (const line of parsed.outputLines) {
      if (/error/i.test(line)) lines.push(line);
    }
  }
  return lines;
}

function accumulatePattern(
  patternMap: Map<string, { count: number; scriptIds: Set<string>; lastSeen: string }>,
  raw: string,
  scriptId: string,
  startedAt: string,
): void {
  const normalized = raw.trim().replaceAll(/\s+/g, ' ').slice(0, 120);
  if (!normalized) return;

  const existing = patternMap.get(normalized);
  if (existing) {
    existing.count++;
    existing.scriptIds.add(scriptId);
    if (startedAt > existing.lastSeen) existing.lastSeen = startedAt;
  } else {
    patternMap.set(normalized, {
      count: 1,
      scriptIds: new Set([scriptId]),
      lastSeen: startedAt,
    });
  }
}

// ── Analytics Factory ──────────────────────────────────────────

export interface Analytics {
  summary: (projectId: string) => AnalyticsSummary;
  trend: (projectId: string, days?: number) => TrendPoint[];
  topFailures: (projectId: string, limit?: number) => TopFailure[];
  slowestTests: (projectId: string, limit?: number) => SlowestTest[];
  errorPatterns: (projectId: string, limit?: number) => ErrorPattern[];
  flakyTests: (projectId: string) => FlakyTest[];
  runHistory: (scriptId: string, limit?: number) => Array<{
    status: string;
    startedAt: string;
    durationMs: number;
  }>;
}

export function createAnalytics(db: AdcDatabase): Analytics {
  // ── Helper ─────────────────────────────────────────────────

  function getScriptIdsForProject(projectId: string): string[] {
    const rows = db
      .select({ id: testSuiteScripts.id })
      .from(testSuiteScripts)
      .where(eq(testSuiteScripts.projectId, projectId))
      .all();
    return rows.map((r) => r.id);
  }

  // ── Methods ────────────────────────────────────────────────

  function summary(projectId: string): AnalyticsSummary {
    const scriptIds = getScriptIdsForProject(projectId);
    if (scriptIds.length === 0) {
      return { totalScripts: 0, totalRuns: 0, passRate: 0, avgDurationMs: 0, flakyCount: 0 };
    }

    const rows = db
      .select({
        totalRuns: count(),
        passedRuns: sql<number>`sum(case when ${testSuiteRuns.status} = 'passed' then 1 else 0 end)`,
        avgDuration: sql<number>`avg(${testSuiteRuns.durationMs})`,
      })
      .from(testSuiteRuns)
      .where(inArray(testSuiteRuns.scriptId, scriptIds))
      .all();

    const { totalRuns, passedRuns, avgDuration: avgDurationMs } = rows[0];
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 10000) / 100 : 0;

    // Count flaky tests
    const flaky = flakyTests(projectId);

    return {
      totalScripts: scriptIds.length,
      totalRuns,
      passRate,
      avgDurationMs: Math.round(avgDurationMs),
      flakyCount: flaky.length,
    };
  }

  function trend(projectId: string, days = 30): TrendPoint[] {
    const scriptIds = getScriptIdsForProject(projectId);
    if (scriptIds.length === 0) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();

    const rows = db
      .select({
        date: sql<string>`date(${testSuiteRuns.startedAt})`.as('run_date'),
        passed: sql<number>`sum(case when ${testSuiteRuns.status} = 'passed' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${testSuiteRuns.status} = 'failed' then 1 else 0 end)`,
        total: count(),
      })
      .from(testSuiteRuns)
      .where(
        and(
          inArray(testSuiteRuns.scriptId, scriptIds),
          gte(testSuiteRuns.startedAt, cutoffIso),
        ),
      )
      .groupBy(sql`date(${testSuiteRuns.startedAt})`)
      .orderBy(sql`date(${testSuiteRuns.startedAt})`)
      .all();

    return rows.map((r) => ({
      date: r.date,
      passed: r.passed,
      failed: r.failed,
      flaky: 0, // Flaky detection requires per-script analysis; set to 0 in trend view
      total: r.total,
    }));
  }

  function topFailures(projectId: string, limit = 10): TopFailure[] {
    const scriptIds = getScriptIdsForProject(projectId);
    if (scriptIds.length === 0) return [];

    const rows = db
      .select({
        scriptId: testSuiteRuns.scriptId,
        scriptName: testSuiteScripts.name,
        failureCount: sql<number>`sum(case when ${testSuiteRuns.status} = 'failed' then 1 else 0 end)`,
        totalRuns: count(),
      })
      .from(testSuiteRuns)
      .innerJoin(testSuiteScripts, eq(testSuiteRuns.scriptId, testSuiteScripts.id))
      .where(inArray(testSuiteRuns.scriptId, scriptIds))
      .groupBy(testSuiteRuns.scriptId, testSuiteScripts.name)
      .orderBy(desc(sql`sum(case when ${testSuiteRuns.status} = 'failed' then 1 else 0 end)`))
      .limit(limit)
      .all();

    return rows
      .filter((r) => r.failureCount > 0)
      .map((r) => ({
        scriptId: r.scriptId,
        scriptName: r.scriptName,
        failureCount: r.failureCount,
        totalRuns: r.totalRuns,
        failureRate: r.totalRuns > 0
          ? Math.round((r.failureCount / r.totalRuns) * 10000) / 100
          : 0,
      }));
  }

  function slowestTests(projectId: string, limit = 10): SlowestTest[] {
    const scriptIds = getScriptIdsForProject(projectId);
    if (scriptIds.length === 0) return [];

    const rows = db
      .select({
        scriptId: testSuiteRuns.scriptId,
        scriptName: testSuiteScripts.name,
        avgDuration: sql<number>`avg(${testSuiteRuns.durationMs})`,
        maxDuration: sql<number>`max(${testSuiteRuns.durationMs})`,
        runCount: count(),
      })
      .from(testSuiteRuns)
      .innerJoin(testSuiteScripts, eq(testSuiteRuns.scriptId, testSuiteScripts.id))
      .where(
        and(
          inArray(testSuiteRuns.scriptId, scriptIds),
          sql`${testSuiteRuns.status} != 'running'`,
        ),
      )
      .groupBy(testSuiteRuns.scriptId, testSuiteScripts.name)
      .orderBy(desc(sql`avg(${testSuiteRuns.durationMs})`))
      .limit(limit)
      .all();

    return rows.map((r) => ({
      scriptId: r.scriptId,
      scriptName: r.scriptName,
      avgDurationMs: Math.round(r.avgDuration),
      maxDurationMs: r.maxDuration,
      runCount: r.runCount,
    }));
  }

  function errorPatterns(projectId: string, limit = 10): ErrorPattern[] {
    const scriptIds = getScriptIdsForProject(projectId);
    if (scriptIds.length === 0) return [];

    const failedRuns = db
      .select({
        scriptId: testSuiteRuns.scriptId,
        output: testSuiteRuns.output,
        startedAt: testSuiteRuns.startedAt,
      })
      .from(testSuiteRuns)
      .where(
        and(
          inArray(testSuiteRuns.scriptId, scriptIds),
          eq(testSuiteRuns.status, 'failed'),
        ),
      )
      .all();

    const patternMap = new Map<string, { count: number; scriptIds: Set<string>; lastSeen: string }>();

    for (const run of failedRuns) {
      const errorLines = extractErrorLines(run.output);
      for (const line of errorLines) {
        accumulatePattern(patternMap, line, run.scriptId, run.startedAt);
      }
    }

    return [...patternMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        scriptIds: [...data.scriptIds],
        lastSeen: data.lastSeen,
      }));
  }

  function flakyTests(projectId: string): FlakyTest[] {
    const scripts = db
      .select({ id: testSuiteScripts.id, name: testSuiteScripts.name })
      .from(testSuiteScripts)
      .where(eq(testSuiteScripts.projectId, projectId))
      .all();

    if (scripts.length === 0) return [];

    const results: FlakyTest[] = [];

    for (const script of scripts) {
      // Get last 10 completed runs (passed/failed only)
      const runs = db
        .select({ status: testSuiteRuns.status })
        .from(testSuiteRuns)
        .where(
          and(
            eq(testSuiteRuns.scriptId, script.id),
            inArray(testSuiteRuns.status, ['passed', 'failed']),
          ),
        )
        .orderBy(desc(testSuiteRuns.startedAt))
        .limit(10)
        .all();

      // Need at least 3 runs to detect flakiness
      if (runs.length < 3) continue;

      // Count status flips (pass->fail or fail->pass)
      let flips = 0;
      for (let i = 1; i < runs.length; i++) {
        if (runs[i].status !== runs[i - 1].status) flips++;
      }

      const flakeRate = flips / (runs.length - 1);

      // Skip if below threshold
      if (flakeRate < 0.2) continue;

      let severity: 'high' | 'medium' | 'low';
      if (flakeRate >= 0.6) severity = 'high';
      else if (flakeRate >= 0.4) severity = 'medium';
      else severity = 'low';

      results.push({
        scriptId: script.id,
        scriptName: script.name,
        flakeRate: Math.round(flakeRate * 1000) / 1000,
        severity,
        recentResults: runs.map((r) => r.status as 'passed' | 'failed'),
      });
    }

    return results;
  }

  function runHistory(scriptId: string, limit = 20) {
    return db
      .select({
        status: testSuiteRuns.status,
        startedAt: testSuiteRuns.startedAt,
        durationMs: testSuiteRuns.durationMs,
      })
      .from(testSuiteRuns)
      .where(eq(testSuiteRuns.scriptId, scriptId))
      .orderBy(desc(testSuiteRuns.startedAt))
      .limit(limit)
      .all();
  }

  return {
    summary,
    trend,
    topFailures,
    slowestTests,
    errorPatterns,
    flakyTests,
    runHistory,
  };
}
