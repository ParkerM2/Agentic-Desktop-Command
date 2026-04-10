-- Migration: Table Consolidation
-- Consolidates 3 sets of redundant tables:
--   1. email_config + hub_config + notification_config + briefing_config → settings_kv (category column)
--   2. daily_plans + weekly_reviews → planner_entries (entry_type discriminator)
--   3. task_specs + task_requirements + task_plans → task_artifacts (kind discriminator)
--
-- Data is copied BEFORE source tables are dropped.

-- ── 1. settings_kv: add category column ──────────────────────────────

ALTER TABLE `settings_kv` ADD COLUMN `category` text NOT NULL DEFAULT 'settings';
--> statement-breakpoint

-- Migrate email_config rows into settings_kv
INSERT INTO `settings_kv` (`key`, `category`, `settings`, `updated_at`)
SELECT `key`, 'email', `config`, `updated_at`
FROM `email_config`;
--> statement-breakpoint

-- Migrate hub_config rows into settings_kv (serialize structured columns to JSON)
INSERT INTO `settings_kv` (`key`, `category`, `settings`, `updated_at`)
SELECT
  `key`,
  'hub',
  json_object(
    'hubUrl', `hub_url`,
    'encryptedApiKey', `encrypted_api_key`,
    'enabled', `enabled`,
    'lastConnected', `last_connected`
  ),
  `updated_at`
FROM `hub_config`;
--> statement-breakpoint

-- Migrate notification_config rows into settings_kv
INSERT INTO `settings_kv` (`key`, `category`, `settings`, `updated_at`)
SELECT `key`, 'notification', `config`, `updated_at`
FROM `notification_config`;
--> statement-breakpoint

-- Migrate briefing_config rows into settings_kv
INSERT INTO `settings_kv` (`key`, `category`, `settings`, `updated_at`)
SELECT `key`, 'briefing', `config`, `updated_at`
FROM `briefing_config`;
--> statement-breakpoint

-- Drop old config tables
DROP TABLE IF EXISTS `email_config`;
--> statement-breakpoint
DROP TABLE IF EXISTS `hub_config`;
--> statement-breakpoint
DROP TABLE IF EXISTS `notification_config`;
--> statement-breakpoint
DROP TABLE IF EXISTS `briefing_config`;
--> statement-breakpoint

-- Index to efficiently filter settings_kv by category
CREATE INDEX IF NOT EXISTS `idx_settings_kv_category` ON `settings_kv` (`category`);
--> statement-breakpoint

-- ── 2. planner_entries: unified daily_plans + weekly_reviews ─────────

CREATE TABLE IF NOT EXISTS `planner_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `entry_type` text NOT NULL CHECK (`entry_type` IN ('daily', 'weekly')),
  -- daily_plans columns
  `date` text,
  `goals` text,
  `scheduled_tasks` text,
  `time_blocks` text,
  `reflection` text,
  -- weekly_reviews columns
  `week_start_date` text,
  `week_end_date` text,
  `days` text,
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_planner_entries_entry_type` ON `planner_entries` (`entry_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_planner_entries_date` ON `planner_entries` (`date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_planner_entries_week_start_date` ON `planner_entries` (`week_start_date`);
--> statement-breakpoint

-- Copy daily_plans rows into planner_entries
INSERT INTO `planner_entries` (`id`, `entry_type`, `date`, `goals`, `scheduled_tasks`, `time_blocks`, `reflection`, `updated_at`)
SELECT
  `date`,
  'daily',
  `date`,
  `goals`,
  `scheduled_tasks`,
  `time_blocks`,
  `reflection`,
  `updated_at`
FROM `daily_plans`;
--> statement-breakpoint

-- Copy weekly_reviews rows into planner_entries
INSERT INTO `planner_entries` (`id`, `entry_type`, `week_start_date`, `week_end_date`, `days`, `reflection`, `updated_at`)
SELECT
  `week_start_date`,
  'weekly',
  `week_start_date`,
  `week_end_date`,
  `days`,
  `reflection`,
  `updated_at`
FROM `weekly_reviews`;
--> statement-breakpoint

-- Drop old planner tables
DROP TABLE IF EXISTS `daily_plans`;
--> statement-breakpoint
DROP TABLE IF EXISTS `weekly_reviews`;
--> statement-breakpoint

-- ── 3. task_artifacts: unified task_specs + task_requirements + task_plans ─

CREATE TABLE IF NOT EXISTS `task_artifacts` (
  `id` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL CHECK (`kind` IN ('spec', 'requirement', 'plan')),
  -- task_specs columns
  `project_id` text,
  `slug` text,
  `title` text,
  `content` text,
  -- task_requirements columns
  `spec_id` text,
  `description` text,
  `status` text,
  -- task_plans columns
  `version` text,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_task_artifacts_kind` ON `task_artifacts` (`kind`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_task_artifacts_project_id` ON `task_artifacts` (`project_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_task_artifacts_spec_id` ON `task_artifacts` (`spec_id`);
--> statement-breakpoint

-- Copy task_specs rows into task_artifacts
INSERT INTO `task_artifacts` (`id`, `kind`, `project_id`, `slug`, `title`, `content`, `created_at`, `updated_at`)
SELECT `id`, 'spec', `project_id`, `slug`, `title`, `content`, `created_at`, `updated_at`
FROM `task_specs`;
--> statement-breakpoint

-- Copy task_requirements rows into task_artifacts
INSERT INTO `task_artifacts` (`id`, `kind`, `spec_id`, `description`, `status`, `created_at`)
SELECT `id`, 'requirement', `spec_id`, `description`, `status`, `created_at`
FROM `task_requirements`;
--> statement-breakpoint

-- Copy task_plans rows into task_artifacts
INSERT INTO `task_artifacts` (`id`, `kind`, `spec_id`, `content`, `version`, `created_at`)
SELECT `id`, 'plan', `spec_id`, `content`, `version`, `created_at`
FROM `task_plans`;
--> statement-breakpoint

-- Drop old task tables
DROP TABLE IF EXISTS `task_specs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `task_requirements`;
--> statement-breakpoint
DROP TABLE IF EXISTS `task_plans`;
