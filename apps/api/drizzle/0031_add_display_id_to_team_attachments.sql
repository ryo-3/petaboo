-- team_attachments テーブルに display_id カラムを追加
-- 添付ファイル自身の識別ID（削除・復元追跡用）
ALTER TABLE `team_attachments` ADD COLUMN `display_id` TEXT NOT NULL DEFAULT '';

-- 既存データに対して、idベースのdisplayIdを生成
UPDATE `team_attachments` SET `display_id` = CAST(`id` AS TEXT) WHERE `display_id` = '';
