/**
 * Plan Tracker Types
 *
 * TypeScript types for the docs/tracker.json plan tracking file.
 */

/** Status values for tracked plans */
export type TrackerPlanStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'IMPLEMENTED'
  | 'ARCHIVED'
  | 'TRACKING';

/** A single plan entry in tracker.json */
export interface TrackerPlan {
  title: string;
  status: TrackerPlanStatus;
  planFile: string | null;
  created: string;
  statusChangedAt: string;
  branch: string | null;
  pr: number | null;
  tags: string[];
}

/** The tracker.json v2 file structure */
export interface TrackerFile {
  version: number;
  lastUpdated: string;
  plans: Record<string, TrackerPlan>;
}
