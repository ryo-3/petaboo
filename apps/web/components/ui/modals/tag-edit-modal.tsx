"use client";

import React, { useState, useEffect } from 'react';
import type { Tag } from '@/src/types/tag';
import { useUpdateTag, useDeleteTag } from '@/src/hooks/use-tags';
import { tagsApi } from '@/src/lib/api-client';
import { useAuth } from '@clerk/nextjs';
import { TAG_COLORS } from '@/src/constants/colors';
import PenIcon from '@/components/icons/pen-icon';
import TrashIcon from '@/components/icons/trash-icon';
import CheckIcon from '@/components/icons/check-icon';

interface TagEditModalProps {
  tag: Tag;
  isOpen: boolean;
  onClose: () => void;
  onTagDeleted?: (tagId: number) => void;
  onTagUpdated?: (updatedTag: Tag) => void;
}

interface TagStats {
  memoCount: number;
  taskCount: number;
  boardCount: number;
  totalCount: number;
}

export default function TagEditModal({
  tag,
  isOpen,
  onClose,
  onTagDeleted,
  onTagUpdated
}: TagEditModalProps) {
  const [editedName, setEditedName] = useState(tag.name);
  const [editedColor, setEditedColor] = useState(tag.color || TAG_COLORS.background);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagStats, setTagStats] = useState<TagStats | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  
  const { getToken } = useAuth();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  // タグ統計情報を取得
  useEffect(() => {
    if (isOpen && tag.id) {
      fetchTagStats();
      fetchAllTags();
    }
  }, [isOpen, tag.id]);

  // モーダルが開かれたときに初期値をリセット
  useEffect(() => {
    if (isOpen) {
      setEditedName(tag.name);
      setEditedColor(tag.color || TAG_COLORS.background);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, tag]);

  const fetchTagStats = async () => {
    try {
      const token = await getToken();
      const response = await tagsApi.getTagStats(tag.id, token || undefined);
      if (response.ok) {
        const stats = await response.json();
        setTagStats(stats);
      }
    } catch (error) {
      console.error('タグ統計の取得に失敗:', error);
    }
  };

  const fetchAllTags = async () => {
    try {
      const token = await getToken();
      const response = await tagsApi.getTags(token || undefined);
      if (response.ok) {
        const tags = await response.json();
        setAllTags(tags);
      }
    } catch (error) {
      console.error('タグ一覧の取得に失敗:', error);
    }
  };

  // 重複チェック
  const isDuplicateName = editedName.trim() !== '' && 
    editedName.toLowerCase() !== tag.name.toLowerCase() &&
    allTags.some(t => t.id !== tag.id && t.name.toLowerCase() === editedName.trim().toLowerCase());

  // 変更があるかチェック
  const hasChanges = editedName.trim() !== tag.name || editedColor !== (tag.color || TAG_COLORS.background);
  
  // 保存可能かチェック
  const canSave = editedName.trim() !== '' && !isDuplicateName && hasChanges;

  const handleSave = async () => {
    if (!canSave || isLoading) return;

    try {
      setIsLoading(true);
      const updatedTag = await updateTagMutation.mutateAsync({
        id: tag.id,
        data: {
          name: editedName.trim(),
          color: editedColor
        }
      });
      
      onTagUpdated?.(updatedTag);
      onClose();
    } catch (error) {
      console.error('タグの更新に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      await deleteTagMutation.mutateAsync(tag.id);
      
      onTagDeleted?.(tag.id);
      onClose();
    } catch (error) {
      console.error('タグの削除に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSave) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PenIcon className="size-5" />
              タグを編集
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="size-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 現在のタグ表示 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現在のタグ
            </label>
            <div 
              className="inline-flex items-center px-3 py-1 rounded-full text-sm"
              style={{ 
                backgroundColor: tag.color || TAG_COLORS.background,
                color: TAG_COLORS.text 
              }}
            >
              {tag.name}
            </div>
          </div>

          {/* タグ名編集 */}
          <div className="mb-4">
            <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 mb-2">
              タグ名
            </label>
            <input
              id="tag-name"
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              placeholder="タグ名を入力"
              autoFocus
            />
            {isDuplicateName && (
              <p className="mt-1 text-xs text-red-500">
                同じ名前のタグが既に存在します
              </p>
            )}
          </div>

          {/* 色選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              色
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'デフォルト', color: TAG_COLORS.background },
                { name: 'ブルー', color: '#dbeafe' },
                { name: 'グリーン', color: '#dcfce7' },
                { name: 'イエロー', color: '#fef3c7' },
                { name: 'レッド', color: '#fee2e2' },
                { name: 'パープル', color: '#f3e8ff' },
                { name: 'ピンク', color: '#fce7f3' },
                { name: 'グレー', color: '#f3f4f6' }
              ].map(({ name, color }) => (
                <button
                  key={name}
                  onClick={() => setEditedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    editedColor === color ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={name}
                />
              ))}
            </div>
            
            {/* プレビュー */}
            <div className="mt-3">
              <span className="text-sm text-gray-600">プレビュー: </span>
              <div 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm"
                style={{ 
                  backgroundColor: editedColor,
                  color: TAG_COLORS.text 
                }}
              >
                {editedName.trim() || 'タグ名'}
              </div>
            </div>
          </div>

          {/* 使用統計 */}
          {tagStats && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">使用状況</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>メモ: {tagStats.memoCount}件</div>
                <div>タスク: {tagStats.taskCount}件</div>
                <div>ボード: {tagStats.boardCount}件</div>
                <div className="font-medium">合計: {tagStats.totalCount}件</div>
              </div>
            </div>
          )}

          {/* 削除確認 */}
          {showDeleteConfirm && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                本当に削除しますか？
              </h3>
              <p className="text-sm text-red-700 mb-3">
                このタグを削除すると、関連付けられた全てのメモ・タスク・ボードからタグが削除されます。
                {tagStats && tagStats.totalCount > 0 && (
                  <span className="font-medium"> ({tagStats.totalCount}件に影響)</span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? '削除中...' : '削除する'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-between">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading || showDeleteConfirm}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium disabled:opacity-50"
            >
              <TrashIcon className="size-4" />
              削除
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="size-4" />
                {isLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}