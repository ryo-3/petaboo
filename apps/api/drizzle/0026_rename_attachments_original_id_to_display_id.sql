-- attachments テーブルの original_id を display_id にリネーム
ALTER TABLE `attachments` RENAME COLUMN `original_id` TO `display_id`;
