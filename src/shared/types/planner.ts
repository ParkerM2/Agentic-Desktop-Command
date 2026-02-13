/**
 * Daily Planner types
 */

export interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  type: 'focus' | 'meeting' | 'break' | 'other';
  color?: string;
}

export interface ScheduledTask {
  taskId: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  completed: boolean;
}

export interface DailyPlan {
  date: string;
  goals: string[];
  scheduledTasks: ScheduledTask[];
  timeBlocks: TimeBlock[];
  reflection?: string;
}

/**
 * Weekly review aggregation
 */
export interface WeeklyReviewSummary {
  totalGoalsSet: number;
  totalGoalsCompleted: number;
  totalTimeBlocks: number;
  totalHoursPlanned: number;
  categoryBreakdown: Record<string, number>; // hours by time block type
}

export interface WeeklyReview {
  weekStartDate: string; // ISO date (Monday)
  weekEndDate: string; // ISO date (Sunday)
  days: DailyPlan[];
  summary: WeeklyReviewSummary;
  reflection?: string;
}
