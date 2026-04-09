/**
 * Task Spec Parser — Interfaces and helpers for on-disk task JSON structures.
 */

import type { ExecutionPhase, TaskStatus } from '@shared/types';

/* ------------------------------------------------------------------ */
/*  On-disk JSON structures                                           */
/* ------------------------------------------------------------------ */

export interface RequirementsJson {
  task_description?: string;
  workflow_type?: string;
}

export interface PlanPhase {
  name?: string;
  title?: string;
  description?: string;
  completed?: boolean;
  started?: boolean;
  files?: string[];
}

export interface ImplementationPlanJson {
  feature?: string;
  description?: string;
  status?: TaskStatus;
  xstateState?: TaskStatus;
  created_at?: string;
  updated_at?: string;
  phases?: PlanPhase[];
  executionPhase?: ExecutionPhase;
  completedPhases?: ExecutionPhase[];
  planStatus?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

export function getPhaseStatus(ph: PlanPhase): 'completed' | 'in_progress' | 'pending' {
  if (ph.completed === true) return 'completed';
  if (ph.started === true) return 'in_progress';
  return 'pending';
}
