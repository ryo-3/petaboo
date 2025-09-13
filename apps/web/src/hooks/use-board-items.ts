import { useMemo, useEffect } from "react";
import { BoardItemWithContent } from "@/src/types/board";
import { DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";

interface UseBoardItemsProps {
  boardId: number;
  boardWithItems: { items: BoardItemWithContent[] } | undefined;
  boardDeletedItems:
    | { memos?: DeletedMemo[]; tasks?: DeletedTask[] }
    | undefined;
  activeMemoTab: string;
  activeTaskTab: string;
  checkedNormalMemos: Set<string | number>;
  checkedDeletedMemos: Set<string | number>;
  setCheckedNormalMemos: React.Dispatch<
    React.SetStateAction<Set<string | number>>
  >;
  setCheckedDeletedMemos: React.Dispatch<
    React.SetStateAction<Set<string | number>>
  >;
  isMemoDeleting: boolean;
}

interface UseBoardItemsReturn {
  allMemoItems: BoardItemWithContent[];
  allTaskItems: BoardItemWithContent[];
  memoItems: BoardItemWithContent[];
  taskItems: BoardItemWithContent[];
  normalMemoCount: number;
  deletedMemoCount: number;
  todoCount: number;
  inProgressCount: number;
  completedCount: number;
  deletedCount: number;
}

/**
 * ボードアイテムの計算とフィルタリングを管理するカスタムフック
 */
export function useBoardItems({
  boardId,
  boardWithItems,
  boardDeletedItems,
  activeMemoTab,
  activeTaskTab,
  checkedNormalMemos,
  checkedDeletedMemos,
  setCheckedNormalMemos,
  setCheckedDeletedMemos,
  isMemoDeleting,
}: UseBoardItemsProps): UseBoardItemsReturn {
  // データ更新時のログ
  console.log(
    `🧮 useBoardItems: アイテム計算 - boardId=${boardId}, allItems数=${boardWithItems?.items?.length || 0}, activeMemoTab=${activeMemoTab}`,
  );

  // メモとタスクのアイテムを分離（読み込み中も空配列で処理）
  const allMemoItems = useMemo(() => {
    const memoItems =
      boardWithItems?.items?.filter(
        (item: BoardItemWithContent) => item.itemType === "memo",
      ) || [];
    console.log(
      `📝 allMemoItems計算結果: ${memoItems.length}個`,
      memoItems.map(
        (item) => `id=${item.content?.id}, title=${item.content?.title}`,
      ),
    );
    return memoItems;
  }, [boardWithItems]);

  const allTaskItems = useMemo(() => {
    const taskItems =
      boardWithItems?.items?.filter(
        (item: BoardItemWithContent) => item.itemType === "task",
      ) || [];
    console.log(`✅ allTaskItems計算結果: ${taskItems.length}個`);
    return taskItems;
  }, [boardWithItems]);

  // アクティブタブに応じてメモをフィルタリング
  const memoItems = useMemo(() => {
    if (activeMemoTab === "deleted") {
      return (boardDeletedItems?.memos || []).map(
        (memo: DeletedMemo, index: number) => ({
          id: memo.id,
          boardId: boardId,
          itemId: memo.originalId,
          itemType: "memo" as const,
          content: memo,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
          position: index,
        }),
      ) as BoardItemWithContent[];
    }
    return allMemoItems;
  }, [activeMemoTab, boardDeletedItems?.memos, boardId, allMemoItems]);

  // アクティブタブに応じてタスクをフィルタリング
  const taskItems = useMemo(() => {
    if (activeTaskTab === "deleted") {
      return (boardDeletedItems?.tasks || []).map(
        (task: DeletedTask, index: number) => ({
          id: task.id,
          boardId: boardId,
          itemId: task.originalId,
          itemType: "task" as const,
          content: task,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          position: index,
        }),
      ) as BoardItemWithContent[];
    }
    return allTaskItems.filter((item: BoardItemWithContent) => {
      const task = item.content as Task;
      return task.status === activeTaskTab;
    });
  }, [activeTaskTab, boardDeletedItems?.tasks, boardId, allTaskItems]);

  // チェック状態の自動クリーンアップ
  // 通常メモのクリーンアップ
  useEffect(() => {
    if (allMemoItems && activeMemoTab === "normal" && !isMemoDeleting) {
      const allMemoIds = new Set(
        allMemoItems.map((item: BoardItemWithContent) => item.itemId),
      );
      const newCheckedNormalMemos = new Set(
        Array.from(checkedNormalMemos).filter((id) => {
          for (const memoId of allMemoIds) {
            if (memoId === id) return true;
          }
          return false;
        }),
      );
      if (newCheckedNormalMemos.size !== checkedNormalMemos.size) {
        setCheckedNormalMemos(newCheckedNormalMemos);
      }
    }
  }, [
    allMemoItems,
    activeMemoTab,
    checkedNormalMemos,
    isMemoDeleting,
    setCheckedNormalMemos,
  ]);

  // 削除済みメモのクリーンアップ
  useEffect(() => {
    if (
      boardDeletedItems?.memos &&
      activeMemoTab === "deleted" &&
      !isMemoDeleting
    ) {
      const allDeletedMemoIds = new Set(
        boardDeletedItems.memos.map((memo: DeletedMemo) => memo.originalId),
      );
      const newCheckedDeletedMemos = new Set(
        Array.from(checkedDeletedMemos).filter((id) => {
          for (const memoId of allDeletedMemoIds) {
            if (memoId === id) return true;
          }
          return false;
        }),
      );
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos);
      }
    }
  }, [
    boardDeletedItems?.memos,
    activeMemoTab,
    checkedDeletedMemos,
    isMemoDeleting,
    setCheckedDeletedMemos,
  ]);

  // 各ステータスの件数を計算
  const todoCount = useMemo(
    () =>
      allTaskItems.filter(
        (item: BoardItemWithContent) =>
          (item.content as Task).status === "todo",
      ).length,
    [allTaskItems],
  );

  const inProgressCount = useMemo(
    () =>
      allTaskItems.filter(
        (item: BoardItemWithContent) =>
          (item.content as Task).status === "in_progress",
      ).length,
    [allTaskItems],
  );

  const completedCount = useMemo(
    () =>
      allTaskItems.filter(
        (item: BoardItemWithContent) =>
          (item.content as Task).status === "completed",
      ).length,
    [allTaskItems],
  );

  const deletedCount = boardDeletedItems?.tasks?.length || 0;
  const normalMemoCount = allMemoItems.length;
  const deletedMemoCount = boardDeletedItems?.memos?.length || 0;

  return {
    allMemoItems,
    allTaskItems,
    memoItems,
    taskItems,
    normalMemoCount,
    deletedMemoCount,
    todoCount,
    inProgressCount,
    completedCount,
    deletedCount,
  };
}
