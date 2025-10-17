CREATE TABLE `team_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`source_type` text,
	`source_id` integer,
	`target_type` text,
	`target_original_id` text,
	`actor_user_id` text,
	`message` text,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer
);
