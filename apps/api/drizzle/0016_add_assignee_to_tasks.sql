-- team_tasks テーブルに担当者カラムを追加
ALTER TABLE team_tasks ADD COLUMN assignee_id TEXT;

-- team_deleted_tasks テーブルにも追加
ALTER TABLE team_deleted_tasks ADD COLUMN assignee_id TEXT;
