CREATE TABLE `body_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`weight` integer,
	`body_fat` integer,
	`muscle_mass` integer,
	`bone_mass` integer,
	`water_percentage` integer,
	`visceral_fat` integer,
	`source` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_measurements_date` ON `body_measurements` (`date`);--> statement-breakpoint
CREATE TABLE `briefing_config` (
	`key` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `briefings` (
	`date` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`generated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_plans` (
	`date` text PRIMARY KEY NOT NULL,
	`goals` text NOT NULL,
	`scheduled_tasks` text NOT NULL,
	`time_blocks` text NOT NULL,
	`reflection` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fitness_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`target` integer NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`deadline` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_config` (
	`key` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`title` text,
	`message` text,
	`url` text,
	`read` integer DEFAULT false NOT NULL,
	`timestamp` text NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_source` ON `notifications` (`source`);--> statement-breakpoint
CREATE INDEX `idx_notifications_timestamp` ON `notifications` (`timestamp`);--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`week_start_date` text PRIMARY KEY NOT NULL,
	`week_end_date` text NOT NULL,
	`days` text NOT NULL,
	`summary` text,
	`reflection` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`duration` integer,
	`exercises` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workouts_date` ON `workouts` (`date`);