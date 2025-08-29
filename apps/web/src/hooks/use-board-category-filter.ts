import { useState, useMemo } from "react";
import type { BoardItemWithContent } from "@/src/types/board";
import type { Task, DeletedTask } from "@/src/types/task";

export interface UseBoardCategoryFilterProps {
  taskItems: BoardItemWithContent[];
}

export function useBoardCategoryFilter({
  taskItems,
}: UseBoardCategoryFilterProps) {
  // フィルター状態（デフォルトは「全て」）
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    (number | "all" | "uncategorized")[]
  >(["all"]);

  // フィルタリングされたタスクアイテム
  const filteredTaskItems = useMemo(() => {
    // 「全て」が選択されている場合はフィルタリングしない
    if (selectedCategoryIds.includes("all")) {
      return taskItems;
    }

    return taskItems.filter((item) => {
      const task = item.content as Task | DeletedTask;
      const taskBoardCategoryId = task.boardCategoryId;

      // 「未分類」が選択されていて、タスクがカテゴリー未設定の場合
      if (
        selectedCategoryIds.includes("uncategorized") &&
        !taskBoardCategoryId
      ) {
        return true;
      }

      // 特定のカテゴリーが選択されていて、タスクがそのカテゴリーの場合
      if (
        taskBoardCategoryId &&
        selectedCategoryIds.includes(taskBoardCategoryId)
      ) {
        return true;
      }

      return false;
    });
  }, [taskItems, selectedCategoryIds]);

  return {
    selectedCategoryIds,
    setSelectedCategoryIds,
    filteredTaskItems,
  };
}
