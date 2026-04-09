CREATE TABLE `session_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`slug` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_session_logs_session_id` ON `session_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_session_logs_slug` ON `session_logs` (`slug`);--> statement-breakpoint
CREATE TABLE `task_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`spec_id` text NOT NULL,
	`content` text NOT NULL,
	`version` text DEFAULT '1' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_task_plans_spec_id` ON `task_plans` (`spec_id`);--> statement-breakpoint
CREATE TABLE `task_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`spec_id` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_task_requirements_spec_id` ON `task_requirements` (`spec_id`);--> statement-breakpoint
CREATE TABLE `task_specs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_task_specs_project_id` ON `task_specs` (`project_id`);--> statement-breakpoint
CREATE TABLE `workflow_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`role` text NOT NULL,
	`session_id` text,
	`task_slug` text,
	`wave` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` text,
	`completed_at` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_agents_run_id` ON `workflow_agents` (`run_id`);