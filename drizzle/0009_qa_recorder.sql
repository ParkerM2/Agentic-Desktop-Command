-- Migration: QA Recorder
-- Creates qa_scripts and qa_runs tables for the QA Recorder feature.

-- ── qa_scripts ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `qa_scripts` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text,
  `name` text NOT NULL,
  `base_url` text NOT NULL,
  `steps` text NOT NULL,
  `file_path` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_qa_scripts_project_id` ON `qa_scripts` (`project_id`);
--> statement-breakpoint

-- ── qa_runs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `qa_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `script_id` text NOT NULL,
  `project_id` text NOT NULL,
  `task_id` text,
  `session_id` text,
  `status` text NOT NULL,
  `triggered_by` text NOT NULL,
  `report` text,
  `started_at` text NOT NULL,
  `completed_at` text
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_qa_runs_script_id` ON `qa_runs` (`script_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_qa_runs_project_id` ON `qa_runs` (`project_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_qa_runs_status` ON `qa_runs` (`status`);
