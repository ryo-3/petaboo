-- Phase 6: originalId カラムの完全削除
-- チーム側テーブルから original_id 関連カラムをすべて削除

-- ⚠️ 警告: この操作は不可逆です！
-- 実行前に必ず本番データのバックアップを取得してください

-- team_tasks
ALTER TABLE team_tasks DROP COLUMN original_id;

-- team_deleted_tasks
ALTER TABLE team_deleted_tasks DROP COLUMN original_id;

-- team_memos
ALTER TABLE team_memos DROP COLUMN original_id;

-- team_deleted_memos
ALTER TABLE team_deleted_memos DROP COLUMN original_id;

-- team_board_items
ALTER TABLE team_board_items DROP COLUMN original_id;

-- team_notifications
ALTER TABLE team_notifications DROP COLUMN target_original_id;
ALTER TABLE team_notifications DROP COLUMN board_original_id;

-- team_taggings
ALTER TABLE team_taggings DROP COLUMN target_original_id;

-- team_comments
ALTER TABLE team_comments DROP COLUMN target_original_id;

-- 確認用クエリ（実行後にカラムが存在しないことを確認）
-- PRAGMA table_info(team_tasks);
-- PRAGMA table_info(team_memos);
-- PRAGMA table_info(team_board_items);
-- PRAGMA table_info(team_notifications);
-- PRAGMA table_info(team_taggings);
-- PRAGMA table_info(team_comments);
