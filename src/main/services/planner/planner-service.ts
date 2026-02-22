/**
 * Planner Service — Disk-persisted daily plans
 *
 * Each day is stored as a separate JSON file in dataDir/planner/<date>.json.
 * All methods are synchronous (following the service pattern).
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  DailyPlan,
  ScheduledTask,
  TimeBlock,
  WeeklyReview,
  WeeklyReviewSummary,
} from '@shared/types';

import type { ReinitializableService } from '@main/services/data-management';

import type { IpcRouter } from '../../ipc/router';

const PLANNER_DIR_NAME = 'planner';

export interface PlannerService extends ReinitializableService {
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
  // Adjust so Monday = 0 (Sunday becomes 6)
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
    // Count completed scheduled tasks as "completed goals" proxy
    totalGoalsCompleted += day.scheduledTasks.filter((t) => t.completed).length;
    totalTimeBlocks += day.timeBlocks.length;

    for (const block of day.timeBlocks) {
      const hours = calculateBlockHours(block.startTime, block.endTime);
      totalHoursPlanned += hours;
      categoryBreakdown[block.type] = (categoryBreakdown[block.type] ?? 0) + hours;
    }
  }

  // Round hours to 1 decimal place
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

export function createPlannerService(deps: { dataDir: string; router: IpcRouter }): PlannerService {
  let plannerDir = join(deps.dataDir, PLANNER_DIR_NAME);

  // In-memory cache for loaded plans (keyed by date)
  let plansCache = new Map<string, DailyPlan>();

  function getPlanFilePath(date: string): string {
    return join(plannerDir, `${date}.json`);
  }

  function ensurePlannerDir(): void {
    if (!existsSync(plannerDir)) {
      mkdirSync(plannerDir, { recursive: true });
    }
  }

  function loadPlan(date: string): DailyPlan {
    // Check cache first
    const cached = plansCache.get(date);
    if (cached) {
      return cached;
    }

    const filePath = getPlanFilePath(date);
    if (existsSync(filePath)) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const plan = JSON.parse(raw) as DailyPlan;
        plansCache.set(date, plan);
        return plan;
      } catch {
        const plan = makeEmptyPlan(date);
        plansCache.set(date, plan);
        return plan;
      }
    }
    const plan = makeEmptyPlan(date);
    plansCache.set(date, plan);
    return plan;
  }

  function savePlan(plan: DailyPlan): void {
    ensurePlannerDir();
    const filePath = getPlanFilePath(plan.date);
    writeFileSync(filePath, JSON.stringify(plan, null, 2), 'utf-8');
    plansCache.set(plan.date, plan);
  }

  function getWeeklyReviewFilePath(mondayStr: string): string {
    return join(plannerDir, `week-${mondayStr}.json`);
  }

  function loadWeeklyReflection(mondayStr: string): string | undefined {
    const filePath = getWeeklyReviewFilePath(mondayStr);
    if (existsSync(filePath)) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw) as { reflection?: string };
        return data.reflection;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  function saveWeeklyReflection(mondayStr: string, reflection: string): void {
    ensurePlannerDir();
    const filePath = getWeeklyReviewFilePath(mondayStr);
    writeFileSync(filePath, JSON.stringify({ reflection }, null, 2), 'utf-8');
  }

  function emitDayChanged(date: string): void {
    deps.router.emit('event:planner.dayChanged', { date });
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
      // Same as getWeek — regenerates summary from current data
      return this.getWeek(startDate);
    },

    updateWeeklyReflection(startDate, reflection) {
      const monday = getWeekMonday(startDate);
      saveWeeklyReflection(monday, reflection);
      deps.router.emit('event:planner.dayChanged', { date: monday });
      return this.getWeek(startDate);
    },

    reinitialize(dataDir: string): void {
      plannerDir = join(dataDir, PLANNER_DIR_NAME);
      plansCache = new Map(); // Clear cache to force reload from new path
    },

    clearState(): void {
      plansCache = new Map();
    },
  };
}
