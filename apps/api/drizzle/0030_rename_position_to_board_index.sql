-- チームボードアイテムのpositionカラムをboardIndexにリネーム
ALTER TABLE team_board_items RENAME COLUMN position TO board_index;

-- 個人ボードアイテムのpositionカラムをboardIndexにリネーム
ALTER TABLE board_items RENAME COLUMN position TO board_index;
