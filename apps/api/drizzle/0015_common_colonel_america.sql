CREATE TABLE `team_activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`action_type` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`target_title` text,
	`metadata` text,
	`created_at` integer NOT NULL
);
