-- board_items テーブルの original_id を display_id にリネーム
ALTER TABLE `board_items` RENAME COLUMN `original_id` TO `display_id`;--> statement-breakpoint

-- deleted_boards テーブルの original_id カラムを削除して display_id を追加
-- SQLite は直接 RENAME COLUMN をサポートしないため、以下の手順で対応
-- 1. 新しいカラムを追加
ALTER TABLE `deleted_boards` ADD `display_id` text NOT NULL DEFAULT '';--> statement-breakpoint

-- 2. データを移行（original_id を文字列化して display_id にコピー）
UPDATE `deleted_boards` SET `display_id` = CAST(`original_id` AS TEXT);--> statement-breakpoint

-- 3. 古いカラムを削除
ALTER TABLE `deleted_boards` DROP COLUMN `original_id`;
