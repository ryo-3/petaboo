"use client";

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import { useCreateTagging } from "@/src/hooks/use-taggings";

const TAG_ADD_SUCCESS_DELAY = 3000; // タグ追加成功時の待機時間（ミリ秒）
const MINIMUM_LOADING_TIME = 1000; // 追加中状態の最低表示時間（ミリ秒）

interface TagAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: { id: number; name: string; color?: string }[];
  selectedItemCount: number;
  itemType: "memo" | "task";
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
  onSuccess,
}: TagAddModalProps) {
  const [selectedTagIdsForAdd, setSelectedTagIdsForAdd] = useState<number[]>(
    [],
  );
  const [isAddingTags, setIsAddingTags] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const queryClient = useQueryClient();
  const addTagging = useCreateTagging();

  // タグ選択が変更された時に追加済状態をリセット
  useEffect(() => {
    if (isCompleted) {
      setIsCompleted(false);
    }
    setProcessedCount(0);
  }, [selectedTagIdsForAdd]); // selectedTagIdsForAddが変更された時のみ

  const handleAddTags = useCallback(async () => {
    if (selectedItems.length === 0 || selectedTagIdsForAdd.length === 0) return;

    setIsAddingTags(true);

    try {
      // 未処理のアイテムを取得
      const remainingItems = selectedItems.slice(processedCount);
      // 最大100件まで処理
      const itemsToProcess = remainingItems.slice(0, 100);
      const promises: Promise<unknown>[] = [];

      for (const tagId of selectedTagIdsForAdd) {
        for (const itemId of itemsToProcess) {
          const item = allItems.find(
            (i) => i.id.toString() === itemId || i.id === parseInt(itemId),
          );
          if (item) {
            promises.push(
              addTagging
                .mutateAsync({
                  tagId,
                  targetType: itemType,
                  targetOriginalId: item.originalId || item.id.toString(),
                })
                .catch(() => {
                  // エラーをサイレントに処理
                  return null;
                }),
            );
          }
        }
      }

      await Promise.allSettled(promises);

      // 処理済み件数を更新
      const newProcessedCount = processedCount + itemsToProcess.length;
      setProcessedCount(newProcessedCount);

      // 完了処理
      setIsAddingTags(false);

      if (newProcessedCount >= selectedItems.length) {
        // 全て完了した場合
        setIsCompleted(true);

        // 個別エディターのキャッシュを無効化
        selectedItems.forEach((itemId) => {
          const item = allItems.find(
            (i) => i.id.toString() === itemId || i.id === parseInt(itemId),
          );
          if (item) {
            const originalId = item.originalId || item.id.toString();
            queryClient.invalidateQueries({
              queryKey: [itemType, originalId],
            });
          }
        });

        // 全タグ付け情報のキャッシュも無効化（エディターが事前取得データを使用するため）
        queryClient.invalidateQueries({
          queryKey: ["taggings", "all"],
        });

        onSuccess();
      }
    } catch (error) {
      console.error("タグ追加中にエラーが発生しました:", error);
      setIsAddingTags(false);
      setIsCompleted(false);
    }
  }, [
    selectedItems,
    selectedTagIdsForAdd,
    allItems,
    itemType,
    addTagging,
    onSuccess,
    processedCount,
    queryClient,
  ]);

  const handleClose = useCallback(() => {
    // モーダルを閉じる時に状態をリセット
    setSelectedTagIdsForAdd([]);
    setIsAddingTags(false);
    setIsCompleted(false);
    setProcessedCount(0);

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
            選択中の{itemType === "memo" ? "メモ" : "タスク"}:{" "}
            {selectedItemCount}件
            {processedCount > 0 && (
              <span className="text-xs text-gray-500 ml-2">
                {processedCount}件処理済み
              </span>
            )}
          </span>
          <button
            onClick={handleAddTags}
            className="px-4 py-1.5 bg-Green text-white rounded disabled:opacity-50"
            disabled={
              selectedTagIdsForAdd.length === 0 || isAddingTags || isCompleted
            }
          >
            {isCompleted
              ? "追加完了"
              : isAddingTags
                ? "追加中..."
                : selectedItemCount - processedCount > 100
                  ? `100件追加`
                  : `${selectedItemCount - processedCount}件追加`}
          </button>
        </div>
      }
    />
  );
}
