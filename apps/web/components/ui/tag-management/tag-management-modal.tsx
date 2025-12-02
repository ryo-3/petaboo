"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import {
  useCreateTagging,
  useDeleteTaggingsByTag,
} from "@/src/hooks/use-taggings";

const TAG_SUCCESS_DELAY = 3000; // タグ操作成功時の待機時間（ミリ秒）
const MINIMUM_LOADING_TIME = 1000; // 処理中状態の最低表示時間（ミリ秒）

type TagManagementMode = "add" | "remove";

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: { id: number; name: string; color?: string }[];
  selectedItemCount: number;
  itemType: "memo" | "task";
  selectedItems: string[];
  allItems: any[]; // メモまたはタスクの配列
  allTaggings: any[]; // 全タグ付け情報
  onSuccess: () => void; // 選択をクリアするコールバック
}

export default function TagManagementModal({
  isOpen,
  onClose,
  tags,
  selectedItemCount,
  itemType,
  selectedItems,
  allItems,
  allTaggings,
  onSuccess,
}: TagManagementModalProps) {
  const [mode, setMode] = useState<TagManagementMode>("add");
  const [selectedTagIdsForOperation, setSelectedTagIdsForOperation] = useState<
    number[]
  >([]);
  const [isProcessingTags, setIsProcessingTags] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const queryClient = useQueryClient();
  const addTagging = useCreateTagging();
  const deleteTaggingsByTag = useDeleteTaggingsByTag();

  // 選択されたアイテムに実際に付いているタグのみを表示用にフィルタリング（削除モード時）
  const availableTagsForRemove = useMemo(() => {
    if (mode === "add" || !allItems.length || !selectedItems.length)
      return tags;

    const selectedItemObjects = allItems.filter(
      (item) =>
        selectedItems.includes(item.id.toString()) ||
        selectedItems.includes(item.id),
    );

    // 選択されたアイテムが持つタグIDを収集（item.tagsから直接取得）
    const tagIdsInSelectedItems = new Set<number>();
    selectedItemObjects.forEach((item) => {
      // item.tagsがある場合はそれを使用（個別エディターと同じ方式）
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: any) => {
          const tagId = typeof tag === "object" ? tag.id : tag;
          tagIdsInSelectedItems.add(tagId);
        });
      }
      // fallback: allTaggingsから検索
      else if (allTaggings && allTaggings.length > 0) {
        const displayId = item.displayId || "";
        const identifiers = [
          displayId,
          (item as any).displayId as string | undefined,
        ].filter((id): id is string => !!id);
        const itemTaggings = allTaggings.filter(
          (tagging) =>
            tagging.targetType === itemType &&
            identifiers.some((id) => tagging.targetDisplayId === id),
        );

        itemTaggings.forEach((tagging) => {
          tagIdsInSelectedItems.add(tagging.tagId);
        });
      }
    });

    // 実際に付いているタグのみを返す
    const availableTags = tags.filter((tag) =>
      tagIdsInSelectedItems.has(tag.id),
    );

    return availableTags;
  }, [mode, tags, selectedItems, allItems, allTaggings, itemType]);

  // 表示するタグリスト
  const displayTags = mode === "remove" ? availableTagsForRemove : tags;

  // モードが変更された時に選択をリセット
  useEffect(() => {
    setSelectedTagIdsForOperation([]);
    setIsCompleted(false);
    setProcessedCount(0);
  }, [mode]);

  // タグ選択が変更された時に完了状態をリセット
  useEffect(() => {
    if (isCompleted) {
      setIsCompleted(false);
    }
    setProcessedCount(0);
  }, [selectedTagIdsForOperation]);

  const handleProcessTags = useCallback(async () => {
    if (selectedItems.length === 0 || selectedTagIdsForOperation.length === 0)
      return;

    setIsProcessingTags(true);

    try {
      // 未処理のアイテムを取得
      const remainingItems = selectedItems.slice(processedCount);
      // テスト用に最初は10件まで処理
      const itemsToProcess = remainingItems.slice(0, 10);

      const promises: Promise<unknown>[] = [];

      for (const tagId of selectedTagIdsForOperation) {
        for (const itemId of itemsToProcess) {
          const item = allItems.find(
            (i) => i.id.toString() === itemId || i.id === parseInt(itemId),
          );
          if (item) {
            const targetId = item.displayId || "";

            if (mode === "add") {
              promises.push(
                addTagging
                  .mutateAsync({
                    tagId,
                    targetType: itemType,
                    targetDisplayId: targetId,
                  })
                  .catch((error) => {
                    return null;
                  }),
              );
            } else {
              promises.push(
                deleteTaggingsByTag
                  .mutateAsync({
                    tagId,
                    targetType: itemType,
                    targetDisplayId: targetId,
                  })
                  .then((result) => {
                    return result;
                  })
                  .catch((error) => {
                    return { error: true, tagId, targetId };
                  }),
              );
            }
          }
        }
      }

      const results = await Promise.allSettled(promises);

      // 処理済み件数を更新
      const newProcessedCount = processedCount + itemsToProcess.length;
      setProcessedCount(newProcessedCount);

      // 完了処理
      setIsProcessingTags(false);

      if (newProcessedCount >= selectedItems.length) {
        // 全て完了した場合
        setIsCompleted(true);

        // 個別エディターのキャッシュを無効化
        selectedItems.forEach((itemId) => {
          const item = allItems.find(
            (i) => i.id.toString() === itemId || i.id === parseInt(itemId),
          );
          if (item) {
            const displayId = item.displayId || "";
            queryClient.invalidateQueries({
              queryKey: [itemType, displayId],
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
      console.error("タグ操作中にエラーが発生しました:", error);
      setIsProcessingTags(false);
      setIsCompleted(false);
    }
  }, [
    selectedItems,
    selectedTagIdsForOperation,
    allItems,
    itemType,
    mode,
    addTagging,
    deleteTaggingsByTag,
    onSuccess,
    processedCount,
    queryClient,
  ]);

  const handleClose = useCallback(() => {
    // モーダルを閉じる時に状態をリセット
    setSelectedTagIdsForOperation([]);
    setIsProcessingTags(false);
    setIsCompleted(false);
    setProcessedCount(0);
    setMode("add"); // デフォルトモードに戻す

    onClose();
  }, [onClose]);

  return (
    <TagSelectionModal
      isOpen={isOpen}
      onClose={handleClose}
      tags={displayTags}
      selectedTagIds={selectedTagIdsForOperation}
      onSelectionChange={setSelectedTagIdsForOperation}
      title="タグ管理"
      footer={
        <div className="flex flex-col gap-3">
          {/* モード切り替えボタン */}
          <div className="flex rounded-md bg-gray-100 p-0.5">
            <button
              onClick={() => setMode("add")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors duration-200 flex items-center justify-center gap-2 ${
                mode === "add"
                  ? "bg-Green text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>タグを付ける</span>
            </button>
            <button
              onClick={() => setMode("remove")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors duration-200 flex items-center justify-center gap-2 ${
                mode === "remove"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>タグを外す</span>
            </button>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  選択中の{itemType === "memo" ? "メモ" : "タスク"}:{" "}
                  {selectedItemCount}件
                  {processedCount > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      {processedCount}件処理済み
                    </span>
                  )}
                </span>
                {mode === "remove" && availableTagsForRemove.length === 0 && (
                  <span className="text-xs text-gray-500">
                    選択したアイテムに付いているタグがありません
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleProcessTags}
              className={`px-4 py-1.5 text-white rounded disabled:opacity-50 ${
                mode === "add" ? "bg-Green" : "bg-red-500"
              }`}
              disabled={
                selectedTagIdsForOperation.length === 0 ||
                isProcessingTags ||
                isCompleted ||
                (mode === "remove" && availableTagsForRemove.length === 0)
              }
            >
              {isCompleted
                ? mode === "add"
                  ? "追加完了"
                  : "削除完了"
                : isProcessingTags
                  ? mode === "add"
                    ? "追加中..."
                    : "削除中..."
                  : selectedItemCount - processedCount > 100
                    ? `100件${mode === "add" ? "に追加" : "から削除"}`
                    : `${selectedItemCount - processedCount}件${mode === "add" ? "に追加" : "から削除"}`}
            </button>
          </div>
        </div>
      }
    />
  );
}
