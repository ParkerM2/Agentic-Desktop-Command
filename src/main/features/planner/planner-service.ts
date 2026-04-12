/**
 * Planner Service — SQLite-backed daily plans via Drizzle ORM
 *
 * Each day is stored as a row in the `planner_entries` table (entry_type='daily').
 * Weekly reviews are stored as rows with entry_type='weekly'.
 * One-time migration from per-day JSON files on first access.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, eq } from 'drizzle-orm';

import { PLANNER_EVENTS } from '@shared/ipc/planner/channels';
import type {
  DailyPlan,
  ScheduledTask,
  TimeBlock,
  WeeklyReview,
  WeeklyReviewSummary,
} from '@shared/types';

import { plannerEntries } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('planner-service');

const PLANNER_DIR_NAME = 'planner';

export interface PlannerService {
  getDay: (date: string) => DailyPlan;
  updateDay: (
    date: string,
    updates: {
      goals?: string[];
      scheduledTasks?: ScheduledTask[];
      reflection?: string;
    },
  ) => DailyPlan;
  addTimeBlock: (date: string, block: Omit<TimeBlock, 'id'>) => TimeBlock;
  updateTimeBlock: (
    date: string,
    blockId: string,
    updates: Partial<Omit<TimeBlock, 'id'>>,
  ) => TimeBlock;
  removeTimeBlock: (date: string, blockId: string) => { success: boolean };
  getWeek: (startDate: string) => WeeklyReview;
  generateWeeklyReview: (startDate: string) => WeeklyReview;
  updateWeeklyReflection: (startDate: string, reflection: string) => WeeklyReview;
}

function makeEmptyPlan(date: string): DailyPlan {
  return {
    date,
    goals: [],
    scheduledTasks: [],
    timeBlocks: [],
  };
}

/**
 * Get Monday of the week containing the given date (ISO string YYYY-MM-DD)
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Get Sunday of the week containing the given date (ISO string YYYY-MM-DD)
 */
function getWeekSunday(dateStr: string): string {
  const monday = getWeekMonday(dateStr);
  const date = new Date(`${monday}T00:00:00`);
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
}

/**
 * Get array of 7 ISO dates for a week starting from Monday
 */
function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const monday = new Date(`${mondayStr}T00:00:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Calculate hours from time block (HH:MM format)
 */
function calculateBlockHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return Math.max(0, endMinutes - startMinutes) / 60;
}

/**
 * Generate summary statistics from daily plans
 */
function generateSummary(days: DailyPlan[]): WeeklyReviewSummary {
  let totalGoalsSet = 0;
  let totalGoalsCompleted = 0;
  let totalTimeBlocks = 0;
  let totalHoursPlanned = 0;
  const categoryBreakdown: Record<string, number> = {
    focus: 0,
    meeting: 0,
    break: 0,
    other: 0,
  };

  for (const day of days) {
    totalGoalsSet += day.goals.length;
    totalGoalsCompleted += day.scheduledTasks.filter((t) => t.completed).length;
    totalTimeBlocks += day.timeBlocks.length;

    for (const block of day.timeBlocks) {
      const hours = calculateBlockHours(block.startTime, block.endTime);
      totalHoursPlanned += hours;
      categoryBreakdown[block.type] = (categoryBreakdown[block.type] ?? 0) + hours;
    }
  }

  totalHoursPlanned = Math.round(totalHoursPlanned * 10) / 10;
  for (const key of Object.keys(categoryBreakdown)) {
    categoryBreakdown[key] = Math.round(categoryBreakdown[key] * 10) / 10;
  }

  return {
    totalGoalsSet,
    totalGoalsCompleted,
    totalTimeBlocks,
    totalHoursPlanned,
    categoryBreakdown,
  };
}

/** Convert a daily planner_entries row to a DailyPlan. */
function rowToPlan(row: typeof plannerEntries.$inferSelect): DailyPlan {
  // goals/scheduledTasks/timeBlocks are nullable in the unified table (daily rows always set them)
  const goals = row.goals ?? [];
  const scheduledTasks = (row.scheduledTasks as unknown as ScheduledTask[] | null) ?? [];
  const timeBlocks = (row.timeBlocks as unknown as TimeBlock[] | null) ?? [];
  return {
    date: row.date ?? '',
    goals,
    scheduledTasks,
    timeBlocks,
    reflection: row.reflection ?? undefined,
  };
}

/**
 * Migrate existing JSON files from `{dataDir}/planner/` into planner_entries table.
 * Runs once — skips if rows already exist.
 */
export function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const plannerDir = join(dataDir, PLANNER_DIR_NAME);
  if (!existsSync(plannerDir)) return;

  // Check if we already have data
  const existing = db
    .select()
    .from(plannerEntries)
    .where(eq(plannerEntries.entryType, 'daily'))
    .limit(1)
    .all();
  if (existing.length > 0) return;

  try {
    const files = readdirSync(plannerDir);
    let dailyCount = 0;
    let weeklyCount = 0;

    for (const file of files) {
      const filePath = join(plannerDir, file);

      // Daily plan files: YYYY-MM-DD.json
      if (/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) {
        try {
          const raw = readFileSync(filePath, 'utf-8');
          const plan = JSON.parse(raw) as DailyPlan;
          db.insert(plannerEntries)
            .values({
              id: plan.date,
              entryType: 'daily',
              date: plan.date,
              goals: plan.goals,
              scheduledTasks: plan.scheduledTasks as unknown as string[],
              timeBlocks: plan.timeBlocks as unknown as Array<{
                id: string;
                startTime: string;
                endTime: string;
                type: string;
                label?: string;
              }>,
              reflection: plan.reflection ?? null,
              updatedAt: new Date().toISOString(),
            })
            .run();
          dailyCount++;
        } catch (err) {
          logger.error(`Failed to migrate daily plan ${file}:`, err);
        }
      }

      // Weekly review files: week-YYYY-MM-DD.json
      if (/^week-\d{4}-\d{2}-\d{2}\.json$/.test(file)) {
        try {
          const raw = readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw) as { reflection?: string };
          const mondayStr = file.replace('week-', '').replace('.json', '');
          const sunday = getWeekSunday(mondayStr);
          db.insert(plannerEntries)
            .values({
              id: mondayStr,
              entryType: 'weekly',
              weekStartDate: mondayStr,
              weekEndDate: sunday,
              days: [],
              reflection: data.reflection ?? null,
              updatedAt: new Date().toISOString(),
            })
            .run();
          weeklyCount++;
        } catch (err) {
          logger.error(`Failed to migrate weekly review ${file}:`, err);
        }
      }
    }

    if (dailyCount > 0 || weeklyCount > 0) {
      logger.info(
        `Migrated ${String(dailyCount)} daily plans and ${String(weeklyCount)} weekly reviews from JSON to SQLite`,
      );
    }
  } catch (err) {
    logger.error('Failed to migrate planner data from JSON:', err);
  }
}

export function createPlannerService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): PlannerService {
  const { db, router, dataDir } = deps;

  // Run one-time migration
  migrateFromJson(db, dataDir);

  function loadPlan(date: string): DailyPlan {
    const row = db
      .select()
      .from(plannerEntries)
      .where(and(eq(plannerEntries.entryType, 'daily'), eq(plannerEntries.date, date)))
      .get();
    if (row) {
      return rowToPlan(row);
    }
    return makeEmptyPlan(date);
  }

  function savePlan(plan: DailyPlan): void {
    db.insert(plannerEntries)
      .values({
        id: plan.date,
        entryType: 'daily',
        date: plan.date,
        goals: plan.goals,
        scheduledTasks: plan.scheduledTasks as unknown as string[],
        timeBlocks: plan.timeBlocks as unknown as Array<{
          id: string;
          startTime: string;
          endTime: string;
          type: string;
          label?: string;
        }>,
        reflection: plan.reflection ?? null,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: plannerEntries.id,
        set: {
          goals: plan.goals,
          scheduledTasks: plan.scheduledTasks as unknown as string[],
          timeBlocks: plan.timeBlocks as unknown as Array<{
            id: string;
            startTime: string;
            endTime: string;
            type: string;
            label?: string;
          }>,
          reflection: plan.reflection ?? null,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  function loadWeeklyReflection(mondayStr: string): string | undefined {
    const row = db
      .select()
      .from(plannerEntries)
      .where(
        and(
          eq(plannerEntries.entryType, 'weekly'),
          eq(plannerEntries.weekStartDate, mondayStr),
        ),
      )
      .get();
    return row?.reflection ?? undefined;
  }

  function saveWeeklyReflection(mondayStr: string, reflection: string): void {
    const sunday = getWeekSunday(mondayStr);
    db.insert(plannerEntries)
      .values({
        id: mondayStr,
        entryType: 'weekly',
        weekStartDate: mondayStr,
        weekEndDate: sunday,
        days: [],
        reflection,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: plannerEntries.id,
        set: {
          reflection,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  function emitDayChanged(date: string): void {
    router.emit(PLANNER_EVENTS.DAY.CHANGED, { date });
  }

  return {
    getDay(date) {
      return loadPlan(date);
    },

    updateDay(date, updates) {
      const plan = loadPlan(date);

      if (updates.goals !== undefined) {
        plan.goals = updates.goals;
      }
      if (updates.scheduledTasks !== undefined) {
        plan.scheduledTasks = updates.scheduledTasks;
      }
      if (updates.reflection !== undefined) {
        plan.reflection = updates.reflection;
      }

      savePlan(plan);
      emitDayChanged(date);
      return plan;
    },

    addTimeBlock(date, block) {
      const plan = loadPlan(date);
      const newBlock: TimeBlock = {
        ...block,
        id: randomUUID(),
      };
      plan.timeBlocks.push(newBlock);
      savePlan(plan);
      emitDayChanged(date);
      return newBlock;
    },

    updateTimeBlock(date, blockId, updates) {
      const plan = loadPlan(date);
      const index = plan.timeBlocks.findIndex((b) => b.id === blockId);
      if (index === -1) {
        throw new Error(`Time block not found: ${blockId}`);
      }
      const existing = plan.timeBlocks[index];
      const updated: TimeBlock = { ...existing, ...updates };
      plan.timeBlocks[index] = updated;
      savePlan(plan);
      emitDayChanged(date);
      return updated;
    },

    removeTimeBlock(date, blockId) {
      const plan = loadPlan(date);
      const index = plan.timeBlocks.findIndex((b) => b.id === blockId);
      if (index === -1) {
        throw new Error(`Time block not found: ${blockId}`);
      }
      plan.timeBlocks.splice(index, 1);
      savePlan(plan);
      emitDayChanged(date);
      return { success: true };
    },

    getWeek(startDate) {
      const monday = getWeekMonday(startDate);
      const sunday = getWeekSunday(startDate);
      const weekDates = getWeekDates(monday);
      const days = weekDates.map((date) => loadPlan(date));
      const summary = generateSummary(days);
      const reflection = loadWeeklyReflection(monday);

      return {
        weekStartDate: monday,
        weekEndDate: sunday,
        days,
        summary,
        reflection,
      };
    },

    generateWeeklyReview(startDate) {
      return this.getWeek(startDate);
    },

    updateWeeklyReflection(startDate, reflection) {
      const monday = getWeekMonday(startDate);
      saveWeeklyReflection(monday, reflection);
      router.emit(PLANNER_EVENTS.DAY.CHANGED, { date: monday });
      return this.getWeek(startDate);
    },
  };
}
