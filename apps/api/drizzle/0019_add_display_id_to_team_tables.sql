-- チーム側テーブルのみdisplay_idカラムを追加（個人側はスルー）

-- team_tasks
ALTER TABLE team_tasks ADD COLUMN display_id TEXT;
UPDATE team_tasks SET display_id = original_id; -- 一時的に値をコピー

-- team_memos
ALTER TABLE team_memos ADD COLUMN display_id TEXT;
UPDATE team_memos SET display_id = original_id;

-- team_deleted_tasks
ALTER TABLE team_deleted_tasks ADD COLUMN display_id TEXT;
UPDATE team_deleted_tasks SET display_id = original_id;

-- team_deleted_memos
ALTER TABLE team_deleted_memos ADD COLUMN display_id TEXT;
UPDATE team_deleted_memos SET display_id = original_id;

-- team_board_items
ALTER TABLE team_board_items ADD COLUMN display_id TEXT;
UPDATE team_board_items SET display_id = original_id;

-- team_notifications
ALTER TABLE team_notifications ADD COLUMN target_display_id TEXT;
UPDATE team_notifications SET target_display_id = target_original_id;

-- team_taggings
ALTER TABLE team_taggings ADD COLUMN target_display_id TEXT;
UPDATE team_taggings SET target_display_id = target_original_id;

-- インデックス追加（パフォーマンス対策）
CREATE INDEX idx_team_tasks_display_id ON team_tasks(team_id, display_id);
CREATE INDEX idx_team_memos_display_id ON team_memos(team_id, display_id);
CREATE INDEX idx_team_board_items_display_id ON team_board_items(display_id);

-- ⚠️ original_idカラムの削除は後で行う（Phase 6）
