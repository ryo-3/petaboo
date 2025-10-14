CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`attached_to` text NOT NULL,
	`attached_id` integer NOT NULL,
	`original_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `team_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`attached_to` text NOT NULL,
	`attached_original_id` text NOT NULL,
	`original_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
