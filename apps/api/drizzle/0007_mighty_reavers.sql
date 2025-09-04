PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_preferences` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`memo_column_count` integer DEFAULT 4 NOT NULL,
	`task_column_count` integer DEFAULT 2 NOT NULL,
	`memo_view_mode` text DEFAULT 'list' NOT NULL,
	`task_view_mode` text DEFAULT 'list' NOT NULL,
	`memo_hide_controls` integer DEFAULT false NOT NULL,
	`task_hide_controls` integer DEFAULT false NOT NULL,
	`hide_header` integer DEFAULT false NOT NULL,
	`created_at` real DEFAULT 1757000824078 NOT NULL,
	`updated_at` real DEFAULT 1757000824078 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user_preferences`("user_id", "memo_column_count", "task_column_count", "memo_view_mode", "task_view_mode", "memo_hide_controls", "task_hide_controls", "hide_header", "created_at", "updated_at") SELECT "user_id", "memo_column_count", "task_column_count", "memo_view_mode", "task_view_mode", "memo_hide_controls", "task_hide_controls", "hide_header", "created_at", "updated_at" FROM `user_preferences`;--> statement-breakpoint
DROP TABLE `user_preferences`;--> statement-breakpoint
ALTER TABLE `__new_user_preferences` RENAME TO `user_preferences`;--> statement-breakpoint
PRAGMA foreign_keys=ON;