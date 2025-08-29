"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import { useDeleteTaggingsByTag } from "@/src/hooks/use-taggings";

const TAG_REMOVE_SUCCESS_DELAY = 3000; // タグ削除成功時の待機時間（ミリ秒）
const MINIMUM_LOADING_TIME = 1000; // 削除中状態の最低表示時間（ミリ秒）

interface TagRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: { id: number; name: string; color?: string }[];
  selectedItemCount: number;
  itemType: "memo" | "task";
  selectedItems: string[];
  allItems: any[]; // メモまたはタスクの配列
  onSuccess: () => void; // 選択をクリアするコールバック
}

export default function TagRemoveModal({
  isOpen,
  onClose,
  tags,
  selectedItemCount,
  itemType,
  selectedItems,
  allItems,
  onSuccess,
}: TagRemoveModalProps) {
  const [selectedTagIdsForRemove, setSelectedTagIdsForRemove] = useState<
    number[]
  >([]);
  const [isRemovingTags, setIsRemovingTags] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const queryClient = useQueryClient();
  const deleteTaggingsByTag = useDeleteTaggingsByTag();

  // 選択されたアイテムに実際に付いているタグのみを表示用にフィルタリング
  const availableTagsForRemove = useMemo(() => {
    if (!allItems.length || !selectedItems.length) return [];

    const selectedItemObjects = allItems.filter(
      (item) =>
        selectedItems.includes(item.id.toString()) ||
        selectedItems.includes(item.id),
    );

    // 選択されたアイテムが持つタグIDを収集
    const tagIdsInSelectedItems = new Set<number>();
    selectedItemObjects.forEach((item) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: any) => {
          tagIdsInSelectedItems.add(typeof tag === "object" ? tag.id : tag);
        });
      }
    });

    // 実際に付いているタグのみを返す
    return tags.filter((tag) => tagIdsInSelectedItems.has(tag.id));
  }, [tags, selectedItems, allItems]);

  // タグ選択が変更された時に削除済状態をリセット
  useEffect(() => {
    if (isCompleted) {
      setIsCompleted(false);
    }
    setProcessedCount(0);
  }, [selectedTagIdsForRemove]);

  const handleRemoveTags = useCallback(async () => {
    if (selectedItems.length === 0 || selectedTagIdsForRemove.length === 0)
      return;

    setIsRemovingTags(true);

    try {
      // 未処理のアイテムを取得
      const remainingItems = selectedItems.slice(processedCount);
      // 最大100件まで処理
      const itemsToProcess = remainingItems.slice(0, 100);
      const promises: Promise<unknown>[] = [];

      for (const tagId of selectedTagIdsForRemove) {
        for (const itemId of itemsToProcess) {
          const item = allItems.find(
            (i) => i.id.toString() === itemId || i.id === parseInt(itemId),
          );
          if (item) {
            promises.push(
              deleteTaggingsByTag
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
      setIsRemovingTags(false);

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
            console.log("🔄 キャッシュ無効化 (削除):", {
              itemType,
              originalId,
            });
          }
        });

        // 全タグ付け情報のキャッシュも無効化（エディターが事前取得データを使用するため）
        queryClient.invalidateQueries({
          queryKey: ["taggings", "all"],
        });
        console.log("🔄 全タグ付けキャッシュ無効化 (削除): [taggings, all]");

        onSuccess();
      }
    } catch (error) {
      console.error("タグ削除中にエラーが発生しました:", error);
      setIsRemovingTags(false);
      setIsCompleted(false);
    }
  }, [
    selectedItems,
    selectedTagIdsForRemove,
    allItems,
    itemType,
    deleteTaggingsByTag,
    onSuccess,
    processedCount,
    queryClient,
  ]);

  const handleClose = useCallback(() => {
    // モーダルを閉じる時に状態をリセット
    setSelectedTagIdsForRemove([]);
    setIsRemovingTags(false);
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
      tags={availableTagsForRemove}
      selectedTagIds={selectedTagIdsForRemove}
      onSelectionChange={setSelectedTagIdsForRemove}
      title="タグを削除"
      footer={
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-sm text-gray-600">
              選択中の{itemType === "memo" ? "メモ" : "タスク"}:{" "}
              {selectedItemCount}件
              {processedCount > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  {processedCount}件処理済み
                </span>
              )}
            </span>
            {availableTagsForRemove.length === 0 && (
              <span className="text-xs text-gray-500 mt-1">
                選択したアイテムに付いているタグがありません
              </span>
            )}
          </div>
          <button
            onClick={handleRemoveTags}
            className="px-4 py-1.5 bg-red-500 text-white rounded disabled:opacity-50"
            disabled={
              selectedTagIdsForRemove.length === 0 ||
              isRemovingTags ||
              isCompleted ||
              availableTagsForRemove.length === 0
            }
          >
            {isCompleted
              ? "削除完了"
              : isRemovingTags
                ? "削除中..."
                : selectedItemCount - processedCount > 100
                  ? `100件から削除`
                  : `${selectedItemCount - processedCount}件から削除`}
          </button>
        </div>
      }
    />
  );
}
