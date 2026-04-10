-- Migration: JSON Store Elimination
-- Adds command_history and assistant_watches tables.
-- voice-config and hub-sync-queue are stored as settings_kv rows (no schema change needed).

CREATE TABLE IF NOT EXISTS `command_history` (
  `id` text PRIMARY KEY NOT NULL,
  `input` text NOT NULL,
  `response_summary` text NOT NULL,
  `timestamp` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_command_history_timestamp` ON `command_history` (`timestamp`);

CREATE TABLE IF NOT EXISTS `assistant_watches` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `target_id` text NOT NULL,
  `condition` text NOT NULL,
  `action` text NOT NULL,
  `follow_up` text,
  `created_at` text NOT NULL,
  `triggered` integer NOT NULL DEFAULT 0,
  `expires_at` text
);

CREATE INDEX IF NOT EXISTS `idx_assistant_watches_triggered` ON `assistant_watches` (`triggered`);
