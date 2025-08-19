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
import { Save } from 'lucide-react';
import DeleteTagModal from './delete-tag-modal';

interface TagEditModalProps {
  tag: Tag;
  isOpen: boolean;
  onClose: () => void;
  onTagDeleted?: (tagId: number) => void;
  onTagUpdated?: (updatedTag: Tag) => void;
}

interface TagStats {
  id: number;
  name: string;
  usageCount: number;
  lastUsed: number | null;
  itemTypes: {
    memo: number;
    task: number;
    board: number;
  };
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      // 統計情報が取得できない場合はnullのまま（統計なしで削除確認可能）
      setTagStats(null);
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
      <div className="bg-white rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto relative">
        {/* 右上の×ボタン */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <svg className="size-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="p-4">
          {/* ヘッダー */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PenIcon className="size-5" />
              タグを編集
            </h2>
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
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">使用状況</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>メモ</span>
                <span className="font-medium text-gray-900">{tagStats?.itemTypes?.memo || 0}件</span>
              </div>
              <div className="flex justify-between">
                <span>タスク</span>
                <span className="font-medium text-gray-900">{tagStats?.itemTypes?.task || 0}件</span>
              </div>
            </div>
          </div>


          {/* アクションボタン */}
          <div className="flex justify-between">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isLoading}
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
                className="flex items-center gap-2 px-4 py-2 bg-Green text-white rounded-md text-sm font-medium hover:bg-Green/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 削除確認モーダル */}
      <DeleteTagModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        tag={tag}
        tagStats={tagStats ? {
          usageCount: tagStats.usageCount,
          memoCount: tagStats.itemTypes.memo,
          taskCount: tagStats.itemTypes.task,
          boardCount: tagStats.itemTypes.board
        } : null}
        onSuccess={() => {
          setIsDeleteModalOpen(false);
          onTagDeleted?.(tag.id);
          onClose();
        }}
      />
    </div>
  );
}