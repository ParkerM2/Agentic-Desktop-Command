CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`trigger_at` text NOT NULL,
	`recurring` text,
	`linked_to` text,
	`dismissed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `changelog_entries` (
	`version` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`categories` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`category` text NOT NULL,
	`tags` text NOT NULL,
	`project_id` text,
	`votes` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ideas_project_id` ON `ideas` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_ideas_status` ON `ideas` (`status`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`target_date` text NOT NULL,
	`status` text NOT NULL,
	`tasks` text NOT NULL,
	`project_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_milestones_project_id` ON `milestones` (`project_id`);