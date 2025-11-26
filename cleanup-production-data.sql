-- 本番環境データクリーンアップSQL
-- 作成日: 2025-11-27
-- 目的: タスク・メモ・画像などのコンテンツデータを削除し、チーム・ボード構造のみ残す

-- ============================================
-- 削除対象テーブル（個人側）
-- ============================================

DELETE FROM taggings;
DELETE FROM attachments;
DELETE FROM board_items;
DELETE FROM deleted_memos;
DELETE FROM deleted_tasks;
DELETE FROM memos;
DELETE FROM tasks;
DELETE FROM tags;
DELETE FROM categories;

-- ============================================
-- 削除対象テーブル（チーム側）
-- ============================================

DELETE FROM team_taggings;
DELETE FROM team_notifications;
DELETE FROM team_attachments;
DELETE FROM team_board_items;
DELETE FROM team_deleted_memos;
DELETE FROM team_deleted_tasks;
DELETE FROM team_memos;
DELETE FROM team_tasks;
DELETE FROM team_tags;
DELETE FROM team_categories;
DELETE FROM team_comments;

-- ============================================
-- 保持されるテーブル（削除しない）
-- ============================================
-- teams
-- team_members
-- boards
-- team_boards

-- ============================================
-- 完了
-- ============================================
