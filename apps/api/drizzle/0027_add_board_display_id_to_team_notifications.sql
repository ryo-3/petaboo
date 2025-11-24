-- team_notifications に board_display_id カラムを追加
ALTER TABLE team_notifications ADD COLUMN board_display_id TEXT;

-- 既存データがあれば board_original_id から値をコピー
UPDATE team_notifications SET board_display_id = board_original_id WHERE board_original_id IS NOT NULL;
