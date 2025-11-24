ALTER TABLE `deleted_memos` DROP COLUMN `original_id`;--> statement-breakpoint
ALTER TABLE `memos` DROP COLUMN `original_id`;--> statement-breakpoint
ALTER TABLE `deleted_tasks` DROP COLUMN `original_id`;--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `original_id`;