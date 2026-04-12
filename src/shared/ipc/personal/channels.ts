/**
 * Personal Domain — Channel Constants
 *
 * Unified channel constants for all personal domains:
 * notes, ideas, milestones, alerts, captures, changelog,
 * planner, briefing, fitness.
 *
 * Backwards-compatible aliases map old per-domain constants
 * to the new PERSONAL namespace.
 */

import { domain, events } from '../channel-builder';

// ─── Unified Personal Domain ─────────────────────────────────

export const PERSONAL = {
  NOTES: domain('personal.notes', {
    LIST: ['all'],
    CREATE: ['note'],
    UPDATE: ['note'],
    DELETE: ['note'],
    SEARCH: ['notes'],
  }),

  IDEAS: domain('personal.ideas', {
    LIST: ['all'],
    CREATE: ['idea'],
    UPDATE: ['idea'],
    DELETE: ['idea'],
    VOTE: ['idea'],
  }),

  MILESTONES: domain('personal.milestones', {
    LIST: ['all'],
    CREATE: ['milestone'],
    UPDATE: ['milestone'],
    DELETE: ['milestone'],
    ADD: ['task'],
    TOGGLE: ['task'],
  }),

  ALERTS: domain('personal.alerts', {
    LIST: ['all'],
    CREATE: ['alert'],
    DISMISS: ['alert'],
    DELETE: ['alert'],
  }),

  CHANGELOG: domain('personal.changelog', {
    LIST: ['entries'],
    ADD: ['entry'],
    GENERATE: ['entry'],
  }),

  PLANNER: domain('personal.planner', {
    GET: ['day', 'week'],
    UPDATE: ['day', 'weekly-reflection'],
    ADD: ['time-block'],
    MODIFY: ['time-block'],
    REMOVE: ['time-block'],
    GENERATE: ['weekly-review'],
  }),

  BRIEFING: domain('personal.briefing', {
    GET: ['daily', 'config', 'suggestions'],
    GENERATE: ['daily'],
    UPDATE: ['config'],
  }),

  FITNESS: domain('personal.fitness', {
    LOG: ['workout', 'measurement'],
    LIST: ['workouts', 'goals'],
    GET: ['measurements', 'stats'],
    SET: ['goal'],
    UPDATE: ['goal-progress'],
    DELETE: ['workout', 'goal'],
  }),
} as const;

// ─── Unified Personal Events ──────────────────────────────────

export const PERSONAL_EVENTS = {
  NOTES: events('personal.notes', {
    NOTE: ['changed'],
  }),

  IDEAS: events('personal.ideas', {
    IDEA: ['changed'],
  }),

  MILESTONES: events('personal.milestones', {
    MILESTONE: ['changed'],
  }),

  ALERTS: events('personal.alerts', {
    ALERT: ['triggered', 'changed'],
  }),

  PLANNER: events('personal.planner', {
    DAY: ['changed'],
  }),

  BRIEFING: events('personal.briefing', {
    BRIEFING: ['ready'],
  }),

  FITNESS: events('personal.fitness', {
    WORKOUT: ['changed'],
    MEASUREMENT: ['changed'],
    GOAL: ['changed'],
  }),
} as const;

// ─── Backwards-Compatible Aliases ────────────────────────────
// Old channel constants still resolve so existing handlers/callers
// don't need immediate updates.

export const {
  NOTES,
  IDEAS,
  MILESTONES,
  ALERTS,
  CHANGELOG,
  PLANNER,
  BRIEFING,
  FITNESS,
} = PERSONAL;

export const {
  NOTES: NOTES_EVENTS,
  IDEAS: IDEAS_EVENTS,
  MILESTONES: MILESTONES_EVENTS,
  ALERTS: ALERTS_EVENTS,
  PLANNER: PLANNER_EVENTS,
  BRIEFING: BRIEFING_EVENTS,
  FITNESS: FITNESS_EVENTS,
} = PERSONAL_EVENTS;
