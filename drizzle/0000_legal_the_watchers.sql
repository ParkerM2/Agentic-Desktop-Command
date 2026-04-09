CREATE TABLE `bus_events` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`payload` text,
	`source_command_id` text,
	`session_id` text,
	`project_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_channel` ON `bus_events` (`channel`);--> statement-breakpoint
CREATE INDEX `idx_events_session_id` ON `bus_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_events_source_command_id` ON `bus_events` (`source_command_id`);--> statement-breakpoint
CREATE INDEX `idx_events_created_at` ON `bus_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `commands` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`domain` text NOT NULL,
	`verb` text NOT NULL,
	`noun` text,
	`is_mutation` integer NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`source_name` text,
	`input` text,
	`output` text,
	`status` text NOT NULL,
	`error` text,
	`duration_ms` integer,
	`project_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_commands_domain` ON `commands` (`domain`);--> statement-breakpoint
CREATE INDEX `idx_commands_verb` ON `commands` (`verb`);--> statement-breakpoint
CREATE INDEX `idx_commands_source_type` ON `commands` (`source_type`);--> statement-breakpoint
CREATE INDEX `idx_commands_project_id` ON `commands` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_commands_created_at` ON `commands` (`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`phase` text,
	`status` text NOT NULL,
	`project_id` text,
	`task_slug` text,
	`model` text,
	`pid` integer,
	`worktree_path` text,
	`spawn_config` text,
	`token_usage` text,
	`tool_usage` text,
	`parent_id` text,
	`team_name` text,
	`wave` integer,
	`task_index` integer,
	`started_at` text NOT NULL,
	`ended_at` text,
	`exit_code` integer,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_status` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_type` ON `sessions` (`type`);--> statement-breakpoint
CREATE INDEX `idx_sessions_project_id` ON `sessions` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_task_slug` ON `sessions` (`task_slug`);--> statement-breakpoint
CREATE INDEX `idx_sessions_parent_id` ON `sessions` (`parent_id`);