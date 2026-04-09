CREATE TABLE `email_config` (
	`key` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`error` text,
	`retries` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`last_attempt` text
);
--> statement-breakpoint
CREATE TABLE `hub_config` (
	`key` text PRIMARY KEY NOT NULL,
	`hub_url` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_connected` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_tokens` (
	`provider` text PRIMARY KEY NOT NULL,
	`encrypted` text NOT NULL,
	`use_safe_storage` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress_tasks` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`jira_key` text,
	`pr_url` text,
	`branch` text,
	`last_session_id` text,
	`last_agent_name` text,
	`completed_at` text,
	`archived_at` text,
	`team_name` text,
	`session_history` text,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_progress_tasks_status` ON `progress_tasks` (`status`);--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`run_id` text PRIMARY KEY NOT NULL,
	`feature_name` text NOT NULL,
	`state` text NOT NULL,
	`config` text,
	`resolved_agents` text,
	`error` text,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_state` ON `workflow_runs` (`state`);