CREATE TABLE `radar_papers` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `radar_scans` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `radar_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL
);
