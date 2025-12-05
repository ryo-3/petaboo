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
  checkingCount: number;
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

  // デバッグログ: boardWithItemsの生データ
  console.log("🔍 [useBoardItems] 生データ", {
    boardId,
    hasItems: !!boardWithItems?.items,
    itemsLength: boardWithItems?.items?.length || 0,
    rawItems: boardWithItems?.items?.slice(0, 5).map((item) => ({
      itemType: item.itemType,
      itemId: item.itemId,
      hasContent: !!item.content,
      contentType: item.content ? typeof item.content : "undefined",
    })),
  });

  // メモとタスクのアイテムを分離（読み込み中も空配列で処理）
  const allMemoItems = useMemo(() => {
    const memoItems =
      boardWithItems?.items?.filter(
        (item: BoardItemWithContent) => item.itemType === "memo",
      ) || [];

    // デバッグログ: メモ一覧
    console.log("📝 [useBoardItems] メモ一覧", {
      boardId,
      totalItems: boardWithItems?.items?.length || 0,
      memoCount: memoItems.length,
      memoList: memoItems.map((item) => ({
        id: item.content?.id,
        itemId: item.itemId,
        title: (item.content as { title?: string })?.title?.slice(0, 20),
      })),
    });

    return memoItems;
  }, [boardWithItems, boardId]);

  const allTaskItems = useMemo(() => {
    const taskItems =
      boardWithItems?.items?.filter(
        (item: BoardItemWithContent) => item.itemType === "task",
      ) || [];

    // デバッグログ: タスク一覧
    console.log("📋 [useBoardItems] タスク一覧", {
      boardId,
      totalItems: boardWithItems?.items?.length || 0,
      taskCount: taskItems.length,
      taskList: taskItems.map((item) => ({
        id: item.content?.id,
        itemId: item.itemId,
        title: (item.content as { title?: string })?.title?.slice(0, 20),
        status: (item.content as Task)?.status,
      })),
    });

    return taskItems;
  }, [boardWithItems, boardId]);

  // アクティブタブに応じてメモをフィルタリング
  const memoItems = useMemo(() => {
    if (activeMemoTab === "deleted") {
      return (boardDeletedItems?.memos || []).map(
        (memo: DeletedMemo, index: number) => ({
          id: memo.id,
          boardId: boardId,
          itemId: memo.displayId,
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
          itemId: task.displayId,
          itemType: "task" as const,
          content: task,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          position: index,
        }),
      ) as BoardItemWithContent[];
    }
    const filtered = allTaskItems.filter((item: BoardItemWithContent) => {
      const task = item.content as Task;
      return task?.status === activeTaskTab;
    });

    // PETABOO-55 デバッグ: タスク一覧が空の場合にログ出力
    if (filtered.length === 0 && allTaskItems.length > 0) {
      console.warn("🔴 PETABOO-55: タスク一覧が空になっています", {
        boardId,
        activeTaskTab,
        allTaskItemsCount: allTaskItems.length,
        allTaskStatuses: allTaskItems.map((item) => ({
          id: item.content?.id,
          status: (item.content as Task)?.status,
          hasContent: !!item.content,
          contentKeys: item.content ? Object.keys(item.content) : [],
        })),
        timestamp: new Date().toISOString(),
      });
    }

    return filtered;
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
        boardDeletedItems.memos.map((memo: DeletedMemo) => memo.displayId),
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

  const checkingCount = useMemo(
    () =>
      allTaskItems.filter(
        (item: BoardItemWithContent) =>
          (item.content as Task).status === "checking",
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
    checkingCount,
    completedCount,
    deletedCount,
  };
}
