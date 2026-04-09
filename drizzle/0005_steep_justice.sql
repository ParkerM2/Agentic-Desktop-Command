CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`api_key` text,
	`model` text,
	`config_dir` text,
	`oauth_token` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings_kv` (
	`key` text PRIMARY KEY NOT NULL,
	`settings` text NOT NULL,
	`updated_at` text NOT NULL
);
