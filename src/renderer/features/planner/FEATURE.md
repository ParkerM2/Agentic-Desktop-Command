# Planner

Daily planner and weekly review feature with time-block editing, goals tracking, and AI-generated weekly summaries.

## Key Files

- **`store.ts`** — Zustand UI state: selected date, view mode (day/week), editing flag, calendar overlay toggle
- **`api/queryKeys.ts`** — React Query key factory for planner days and weekly reviews
- **`api/usePlanner.ts`** — Day CRUD hooks: `useDay`, `useUpdateDay`, `useAddTimeBlock`, `useUpdateTimeBlock`, `useRemoveTimeBlock`
- **`api/useWeeklyReview.ts`** — Weekly review hooks: `useWeeklyReview`, `useGenerateWeeklyReview`, `useUpdateWeeklyReflection`
- **`hooks/usePlannerEvents.ts`** — Bridges planner IPC events to React Query cache invalidation

## Components

- **`components/PlannerPage.tsx`** — Main daily planner layout with date navigation and day/week toggle
- **`components/WeeklyReviewPage.tsx`** — Weekly aggregation view with stats, reflection, and AI-generated review
- **`components/DayView.tsx`** — Full day view with time blocks and goals
- **`components/DayCompact.tsx`** — Compact day summary card for week overview
- **`components/WeekOverview.tsx`** — Seven-day week strip layout
- **`components/GoalsList.tsx`** — Daily goals checklist; **`components/TimeBlockEditor.tsx`** — Time block creation/editing
- **`components/CalendarOverlay.tsx`** — Mini calendar date picker overlay
- Weekly review helpers: **`WeeklyReflectionSection.tsx`**, **`StatCard.tsx`**, **`CategoryBar.tsx`**, **`weekly-review-utils.ts`**

## How It Connects

- IPC channels: `planner.*` for day CRUD and weekly review generation
- Weekly review generation delegates to Claude for AI-powered summaries
