ALTER TABLE `memos` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `team_memos` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `team_tasks` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_memos_deleted_at` ON `memos`(`deleted_at`) WHERE `deleted_at` IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tasks_deleted_at` ON `tasks`(`deleted_at`) WHERE `deleted_at` IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_team_memos_deleted_at` ON `team_memos`(`deleted_at`) WHERE `deleted_at` IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_team_tasks_deleted_at` ON `team_tasks`(`deleted_at`) WHERE `deleted_at` IS NOT NULL;