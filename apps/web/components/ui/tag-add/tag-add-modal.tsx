"use client";

import { useState, useCallback, useEffect } from 'react';
import TagSelectionModal from '@/components/ui/modals/tag-selection-modal';
import { useCreateTagging } from '@/src/hooks/use-taggings';

const TAG_ADD_SUCCESS_DELAY = 3000; // タグ追加成功時の待機時間（ミリ秒）
const MINIMUM_LOADING_TIME = 1000; // 追加中状態の最低表示時間（ミリ秒）

interface TagAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: { id: number; name: string; color?: string }[];
  selectedItemCount: number;
  itemType: 'memo' | 'task';
  selectedItems: string[];
  allItems: any[]; // メモまたはタスクの配列
  onSuccess: () => void; // 選択をクリアするコールバック
}

export default function TagAddModal({
  isOpen,
  onClose,
  tags,
  selectedItemCount,
  itemType,
  selectedItems,
  allItems,
  onSuccess
}: TagAddModalProps) {
  const [selectedTagIdsForAdd, setSelectedTagIdsForAdd] = useState<number[]>([]);
  const [isAddingTags, setIsAddingTags] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const addTagging = useCreateTagging();

  // タグ選択が変更された時に追加済状態をリセット
  useEffect(() => {
    if (isCompleted) {
      setIsCompleted(false);
    }
  }, [selectedTagIdsForAdd]); // selectedTagIdsForAddが変更された時のみ

  const handleAddTags = useCallback(async () => {
    if (selectedItems.length === 0 || selectedTagIdsForAdd.length === 0) return;

    const startTime = Date.now();
    setIsAddingTags(true);

    try {
      const promises: Promise<unknown>[] = [];
      
      for (const tagId of selectedTagIdsForAdd) {
        for (const itemId of selectedItems) {
          const item = allItems.find(i => i.id.toString() === itemId || i.id === parseInt(itemId));
          if (item) {
            // console.log('🏷️ タグ付け試行:', {
            //   tagId,
            //   itemId,
            //   itemTitle: item.title || item.name || 'タイトルなし',
            //   targetType: itemType,
            //   targetOriginalId: item.originalId || item.id.toString(),
            // });
            promises.push(
              addTagging.mutateAsync({
                tagId,
                targetType: itemType,
                targetOriginalId: item.originalId || item.id.toString(),
              }).catch((error) => {
                // エラーメッセージから重複エラーかどうかを判定
                const errorMessage = error?.message || error?.toString() || '';
                // console.log('🚨 タグ付けエラー:', {
                //   tagId,
                //   itemId,
                //   itemTitle: item.title || item.name || 'タイトルなし',
                //   errorMessage,
                //   fullError: error
                // });
                if (errorMessage.includes('already exists') || 
                    errorMessage.includes('duplicate') || 
                    errorMessage.includes('重複') ||
                    errorMessage.includes('既に存在') ||
                    errorMessage.includes('already attached')) {
                  // 既に追加済みの場合はスルー（成功扱い）
                  // console.log('✅ 重複エラーをスルー:', { tagId, itemId });
                  return Promise.resolve();
                } else {
                  // その他のエラーは再スロー
                  console.error('❌ 予期しないエラー:', error);
                  throw error;
                }
              })
            );
          } else {
            // console.warn('⚠️ アイテムが見つかりません:', { 
            //   itemId, 
            //   allItemsCount: allItems.length,
            //   allItemIds: allItems.map(i => i.id.toString())
            // });
          }
        }
      }

      await Promise.allSettled(promises);
      
      // 最低表示時間を確保
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime);
      
      setTimeout(() => {
        // 追加完了状態に変更
        setIsCompleted(true);
        setIsAddingTags(false);
        
        // 選択クリアはモーダルが閉じられる時に実行するため、ここでは呼ばない
        // onSuccess();
        
        // タグ選択はリセットしない（ユーザーが手動で閉じるまで保持）
      }, remainingTime);
      
    } catch (error) {
      console.error('タグ追加中にエラーが発生しました:', error);
      alert('タグの追加に失敗しました。しばらくしてから再度お試しください。');
      setIsAddingTags(false);
      setIsCompleted(false);
    }
  }, [selectedItems, selectedTagIdsForAdd, allItems, itemType, addTagging, onSuccess]);

  const handleClose = useCallback(() => {
    // モーダルを閉じる時に状態をリセット
    setSelectedTagIdsForAdd([]);
    setIsAddingTags(false);
    setIsCompleted(false);
    
    // アイテムの選択はクリアしない（ユーザーが明示的に解除するまで保持）
    // onSuccess();
    
    onClose();
  }, [onClose]);

  return (
    <TagSelectionModal
      isOpen={isOpen}
      onClose={handleClose}
      tags={tags}
      selectedTagIds={selectedTagIdsForAdd}
      onSelectionChange={setSelectedTagIdsForAdd}
      title="タグを追加"
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            選択中の{itemType === 'memo' ? 'メモ' : 'タスク'}: {selectedItemCount}件
          </span>
          <button
            onClick={handleAddTags}
            className="px-4 py-1.5 bg-Green text-white rounded disabled:opacity-50"
            disabled={selectedTagIdsForAdd.length === 0 || isAddingTags || isCompleted}
          >
            {isCompleted ? '追加済' : isAddingTags ? '追加中...' : '追加する'}
          </button>
        </div>
      }
    />
  );
}