-- 個人用テーブルに display_id カラムを追加（Phase 4.5）
ALTER TABLE `memos` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `deleted_memos` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `deleted_tasks` ADD `display_id` text;--> statement-breakpoint

-- 既存データに display_id = original_id を設定
UPDATE `memos` SET `display_id` = `original_id` WHERE `display_id` IS NULL;--> statement-breakpoint
UPDATE `deleted_memos` SET `display_id` = `original_id` WHERE `display_id` IS NULL;--> statement-breakpoint
UPDATE `tasks` SET `display_id` = `original_id` WHERE `display_id` IS NULL;--> statement-breakpoint
UPDATE `deleted_tasks` SET `display_id` = `original_id` WHERE `display_id` IS NULL;