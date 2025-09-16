import { useMemo, useEffect, useRef } from "react";
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
  const prevDeleteStateRef = useRef(isMemoDeleting);
  // メモとタスクのアイテムを分離（読み込み中も空配列で処理）
  const allMemoItems = useMemo(() => {
    const memoItems =
      boardWithItems?.items?.filter(
        (item: BoardItemWithContent) => item.itemType === "memo",
      ) || [];
    return memoItems;
  }, [boardWithItems]);

  const allTaskItems = useMemo(() => {
    const taskItems =
      boardWithItems?.items?.filter(
        (item: BoardItemWithContent) => item.itemType === "task",
      ) || [];
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

  // チェック状態の自動クリーンアップ（削除操作完了後のみ実行）
  useEffect(() => {
    const prevDeleteState = prevDeleteStateRef.current;
    prevDeleteStateRef.current = isMemoDeleting;

    // 削除操作が true → false に変化した時のみクリーンアップを実行
    if (
      prevDeleteState === true &&
      isMemoDeleting === false &&
      allMemoItems &&
      activeMemoTab === "normal"
    ) {
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
      // チェック済みアイテムが実際に減った場合のみ更新
      if (newCheckedNormalMemos.size !== checkedNormalMemos.size) {
        setCheckedNormalMemos(newCheckedNormalMemos);
      }
    }
  }, [
    isMemoDeleting,
    allMemoItems,
    activeMemoTab,
    checkedNormalMemos,
    setCheckedNormalMemos,
  ]);

  // 削除済みメモのクリーンアップ（復元操作完了後のみ実行）
  useEffect(() => {
    const prevDeleteState = prevDeleteStateRef.current;

    // 復元操作が true → false に変化した時のみクリーンアップを実行
    if (
      prevDeleteState === true &&
      isMemoDeleting === false &&
      boardDeletedItems?.memos &&
      activeMemoTab === "deleted"
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
      // チェック済みアイテムが実際に減った場合のみ更新
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos);
      }
    }
  }, [
    isMemoDeleting,
    boardDeletedItems?.memos,
    activeMemoTab,
    checkedDeletedMemos,
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

  // デバッグ: 削除済みアイテム状態を監視（開発時のみ簡略版）
  // console.log("🔍 useBoardItems: 削除済みアイテム状態", {
  //   boardId,
  //   deletedMemoCount,
  //   deletedTaskCount: deletedCount,
  //   boardDeletedItemsExists: !!boardDeletedItems,
  //   memosLength: boardDeletedItems?.memos?.length,
  //   tasksLength: boardDeletedItems?.tasks?.length,
  //   timestamp: new Date().toISOString(),
  // });

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
