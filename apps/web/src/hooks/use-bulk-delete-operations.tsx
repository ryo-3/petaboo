import { useCallback, useState, ReactNode } from "react";
import { useBulkDelete } from "@/components/ui/modals";
import { useDeleteMemo } from "@/src/hooks/use-memos";
import { useDeleteTask } from "@/src/hooks/use-tasks";
import { useRemoveItemFromBoard } from "@/src/hooks/use-boards";
import { useBulkAnimation } from "@/src/hooks/use-bulk-animation";
import { executeWithAnimation } from "@/src/utils/bulkAnimationUtils";
import { DeletionWarningMessage } from "@/components/ui/modals/deletion-warning-message";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

interface UseBulkDeleteOperationsProps {
  boardId: number;
  checkedMemos: Set<string | number>;
  checkedTasks: Set<string | number>;
  setCheckedMemos: (value: Set<string | number>) => void;
  setCheckedTasks: (value: Set<string | number>) => void;
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>;
  activeMemoTab: "normal" | "deleted";
  activeTaskTab: "todo" | "in_progress" | "completed" | "deleted";
  checkedNormalMemos: Set<string | number>;
  checkedDeletedMemos: Set<string | number>;
  checkedTodoTasks: Set<string | number>;
  checkedInProgressTasks: Set<string | number>;
  checkedCompletedTasks: Set<string | number>;
  checkedDeletedTasks: Set<string | number>;
  teamMode?: boolean;
  teamId?: number;
  boardMemos?: Array<{ id: number; originalId?: string }>;
  boardTasks?: Array<{ id: number; originalId?: string }>;
}

interface UseBulkDeleteOperationsReturn {
  isMemoDeleting: boolean;
  isMemoLidOpen: boolean;
  isTaskDeleting: boolean;
  isTaskLidOpen: boolean;
  deletingItemType: "memo" | "task" | null;
  bulkDelete: ReturnType<typeof useBulkDelete>;
  handleBulkDelete: (
    itemType: "memo" | "task",
    customMessage?: ReactNode,
  ) => Promise<void>;
  handleRemoveFromBoard: () => Promise<void>;
  setDeletingItemType: (type: "memo" | "task" | null) => void;
  setIsMemoDeleting: (value: boolean) => void;
  setIsMemoLidOpen: (value: boolean) => void;
  setIsTaskDeleting: (value: boolean) => void;
  setIsTaskLidOpen: (value: boolean) => void;
  bulkAnimation: ReturnType<typeof useBulkAnimation>;
  currentMemoDisplayCount: number;
  currentTaskDisplayCount: number;
  getModalStatusBreakdown: () => Array<{
    status: string;
    label: string;
    count: number;
    color: string;
  }>;
  getHasOtherTabItems: () => boolean;
}

/**
 * 一括削除操作を管理するカスタムフック
 * ボード詳細画面で使用される削除関連のロジックを集約
 */
export function useBulkDeleteOperations({
  boardId,
  checkedMemos,
  checkedTasks,
  setCheckedMemos,
  setCheckedTasks,
  deleteButtonRef,
  activeMemoTab,
  activeTaskTab,
  checkedNormalMemos,
  checkedDeletedMemos,
  checkedTodoTasks,
  checkedInProgressTasks,
  checkedCompletedTasks,
  checkedDeletedTasks,
  teamMode = false,
  teamId,
  boardMemos = [],
  boardTasks = [],
}: UseBulkDeleteOperationsProps): UseBulkDeleteOperationsReturn {
  const [isMemoDeleting, setIsMemoDeleting] = useState(false);
  const [isMemoLidOpen, setIsMemoLidOpen] = useState(false);
  const [isTaskDeleting, setIsTaskDeleting] = useState(false);
  const [isTaskLidOpen, setIsTaskLidOpen] = useState(false);
  const [deletingItemType, setDeletingItemType] = useState<
    "memo" | "task" | null
  >(null);

  // アニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: new Set(
      Array.from(checkedMemos).filter(
        (id) => typeof id === "number",
      ) as number[],
    ),
    checkedDeletedItems: new Set(
      Array.from(checkedTasks).filter(
        (id) => typeof id === "number",
      ) as number[],
    ),
  });

  // 削除関連のフック
  const queryClient = useQueryClient();
  const bulkDelete = useBulkDelete();
  const deleteMemoMutation = useDeleteMemo({
    teamMode,
    teamId,
  });
  const deleteTaskMutation = useDeleteTask({
    teamMode,
    teamId,
  });
  const removeItemFromBoard = useRemoveItemFromBoard();

  // メモの削除確認メッセージ生成
  const createMemoDeleteMessage = useCallback(() => {
    const currentTabCount = checkedMemos.size;

    // 他のタブにも選択アイテムがあるかチェック
    const hasOtherTabItems =
      activeMemoTab === "deleted"
        ? checkedNormalMemos.size > 0
        : checkedDeletedMemos.size > 0;

    const statusBreakdown =
      activeMemoTab === "deleted"
        ? [
            {
              status: "deleted",
              label: "削除済み",
              count: currentTabCount,
              color: "bg-red-600",
            },
          ]
        : [
            {
              status: "normal",
              label: "通常",
              count: currentTabCount,
              color: "bg-gray-500",
            },
          ];

    return (
      <DeletionWarningMessage
        hasOtherTabItems={hasOtherTabItems}
        isLimited={false}
        statusBreakdown={statusBreakdown}
        showStatusBreakdown={true}
        isPermanentDelete={activeMemoTab === "deleted"}
      />
    );
  }, [
    checkedMemos.size,
    activeMemoTab,
    checkedNormalMemos.size,
    checkedDeletedMemos.size,
  ]);

  // タスクの削除確認メッセージ生成
  const createTaskDeleteMessage = useCallback(() => {
    const currentTabCount = checkedTasks.size;

    // 他のタブにも選択アイテムがあるかチェック
    const hasOtherTabItems =
      activeTaskTab === "deleted"
        ? checkedTodoTasks.size > 0 ||
          checkedInProgressTasks.size > 0 ||
          checkedCompletedTasks.size > 0
        : checkedDeletedTasks.size > 0 ||
          (activeTaskTab !== "todo" && checkedTodoTasks.size > 0) ||
          (activeTaskTab !== "in_progress" &&
            checkedInProgressTasks.size > 0) ||
          (activeTaskTab !== "completed" && checkedCompletedTasks.size > 0);

    const statusBreakdown =
      activeTaskTab === "deleted"
        ? [
            {
              status: "deleted",
              label: "削除済み",
              count: currentTabCount,
              color: "bg-red-600",
            },
          ]
        : activeTaskTab === "todo"
          ? [
              {
                status: "todo",
                label: "未着手",
                count: currentTabCount,
                color: "bg-zinc-400",
              },
            ]
          : activeTaskTab === "in_progress"
            ? [
                {
                  status: "in_progress",
                  label: "進行中",
                  count: currentTabCount,
                  color: "bg-Blue",
                },
              ]
            : [
                {
                  status: "completed",
                  label: "完了",
                  count: currentTabCount,
                  color: "bg-Green",
                },
              ];

    return (
      <DeletionWarningMessage
        hasOtherTabItems={hasOtherTabItems}
        isLimited={false}
        statusBreakdown={statusBreakdown}
        showStatusBreakdown={true}
        isPermanentDelete={activeTaskTab === "deleted"}
      />
    );
  }, [
    checkedTasks.size,
    activeTaskTab,
    checkedTodoTasks.size,
    checkedInProgressTasks.size,
    checkedCompletedTasks.size,
    checkedDeletedTasks.size,
  ]);

  // アニメーション付き削除実行関数
  const executeDeleteWithAnimation = useCallback(
    async (ids: number[], itemType: "memo" | "task") => {
      const onStateUpdate = () => {
        // ボード詳細では特別な状態更新は不要
      };

      const onCheckStateUpdate = (processedIds: number[]) => {
        if (itemType === "memo") {
          const newCheckedMemos = new Set(checkedMemos);
          processedIds.forEach((id) => newCheckedMemos.delete(id));
          setCheckedMemos(newCheckedMemos);
        } else {
          const newCheckedTasks = new Set(checkedTasks);
          processedIds.forEach((id) => newCheckedTasks.delete(id));
          setCheckedTasks(newCheckedTasks);
        }
      };

      const onApiCall = async (id: number) => {
        if (itemType === "memo") {
          await deleteMemoMutation.mutateAsync(id);
        } else {
          await deleteTaskMutation.mutateAsync(id);
        }
      };

      await executeWithAnimation({
        ids,
        isPartial: false,
        buttonRef: deleteButtonRef,
        dataAttribute: itemType === "memo" ? "data-memo-id" : "data-task-id",
        onStateUpdate,
        onCheckStateUpdate,
        onApiCall,
        initializeAnimation: bulkAnimation.initializeAnimation,
        startCountdown: bulkAnimation.startCountdown,
        finalizeAnimation: bulkAnimation.finalizeAnimation,
        setIsProcessing:
          itemType === "memo" ? setIsMemoDeleting : setIsTaskDeleting,
        setIsLidOpen: itemType === "memo" ? setIsMemoLidOpen : setIsTaskLidOpen,
      });
    },
    [
      checkedMemos,
      checkedTasks,
      setCheckedMemos,
      setCheckedTasks,
      deleteMemoMutation,
      deleteTaskMutation,
      deleteButtonRef,
      bulkAnimation,
    ],
  );

  // 一括削除ハンドラー
  const handleBulkDelete = useCallback(
    async (itemType: "memo" | "task", customMessage?: ReactNode) => {
      const targetIds =
        itemType === "memo"
          ? Array.from(checkedMemos)
          : Array.from(checkedTasks);
      if (targetIds.length === 0) return;

      setDeletingItemType(itemType);
      if (itemType === "memo") {
        setIsMemoDeleting(true);
        setIsMemoLidOpen(true);
      } else {
        setIsTaskDeleting(true);
        setIsTaskLidOpen(true);
      }

      // カスタムメッセージが提供されていない場合は、自動生成されたメッセージを使用
      const message =
        customMessage ||
        (itemType === "memo"
          ? createMemoDeleteMessage()
          : createTaskDeleteMessage());

      await bulkDelete.confirmBulkDelete(
        targetIds as number[],
        1,
        async (ids: (string | number)[]) => {
          // アニメーション付き削除処理
          await executeDeleteWithAnimation(ids as number[], itemType);
        },
        message,
      );
    },
    [
      checkedMemos,
      checkedTasks,
      bulkDelete,
      executeDeleteWithAnimation,
      createMemoDeleteMessage,
      createTaskDeleteMessage,
    ],
  );

  // ボードから削除の処理（アニメーション付き）
  const handleRemoveFromBoard = useCallback(async () => {
    console.log("🎯 [handleRemoveFromBoard] 呼び出し開始:", {
      deletingItemType,
      checkedMemos: Array.from(checkedMemos),
      checkedTasks: Array.from(checkedTasks),
    });

    const targetIds =
      deletingItemType === "memo"
        ? Array.from(checkedMemos)
        : Array.from(checkedTasks);
    const ids = targetIds.map((id) => Number(id)).filter((id) => !isNaN(id));

    console.log("🎯 [handleRemoveFromBoard] ID変換結果:", {
      targetIds,
      ids,
      idsLength: ids.length,
    });

    if (ids.length === 0) {
      console.log("⚠️ [handleRemoveFromBoard] IDが空のため終了");
      bulkDelete.handleCancel();
      setDeletingItemType(null);
      return;
    }

    try {
      console.log("🚀 [handleRemoveFromBoard] API呼び出し開始");

      // ボード詳細画面ではアニメーションなしで即座に削除処理
      // （DOM要素にdata-memo-id属性がないため）
      for (const id of ids) {
        // IDからoriginalIdを取得
        let originalId: string;
        if (deletingItemType === "memo") {
          const memo = boardMemos.find((m) => m.id === id);
          originalId = memo?.originalId || id.toString();
        } else {
          const task = boardTasks.find((t) => t.id === id);
          originalId = task?.originalId || id.toString();
        }

        console.log("📤 [handleRemoveFromBoard] API呼び出し:", {
          id,
          originalId,
          itemType: deletingItemType,
        });

        await removeItemFromBoard.mutateAsync({
          boardId,
          itemId: originalId,
          itemType: deletingItemType!,
          teamId,
        });
      }

      console.log("✅ [handleRemoveFromBoard] 全API呼び出し完了");

      // チェック状態をクリア
      if (deletingItemType === "memo") {
        setCheckedMemos(new Set());
      } else {
        setCheckedTasks(new Set());
      }

      // キャッシュを無効化してDOMを更新
      queryClient.invalidateQueries({
        queryKey: ["boards", boardId, "items"],
      });
      if (teamMode && teamId) {
        queryClient.invalidateQueries({
          queryKey: ["team-boards", teamId.toString(), boardId, "items"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });

      console.log("🎉 [handleRemoveFromBoard] 処理完了");
    } catch (error) {
      console.error("❌ [handleRemoveFromBoard] エラー:", error);
    } finally {
      console.log(
        "🧹 [handleRemoveFromBoard] finally: モーダルとチェック状態をクリア",
      );

      // チェック状態を確実にクリア（エラー時も実行）
      if (deletingItemType === "memo") {
        setCheckedMemos(new Set());
      } else if (deletingItemType === "task") {
        setCheckedTasks(new Set());
      }

      // エラー発生時も確実にモーダルを閉じる
      bulkDelete.handleCancel();
      setDeletingItemType(null);

      console.log("✅ [handleRemoveFromBoard] finally: 完了");
    }
  }, [
    deletingItemType,
    checkedMemos,
    checkedTasks,
    boardId,
    bulkDelete,
    setCheckedMemos,
    setCheckedTasks,
    removeItemFromBoard,
    teamId,
    teamMode,
    queryClient,
    boardMemos,
    boardTasks,
  ]);

  // ディスプレイカウントの計算（メモ一覧と同じロジック）
  const currentMemoDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : checkedMemos.size;

  const currentTaskDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : checkedTasks.size;

  // モーダル表示用のステータス内訳を取得
  const getModalStatusBreakdown = useCallback(() => {
    if (!deletingItemType) return [];

    if (deletingItemType === "memo") {
      const currentTabCount = checkedMemos.size;
      return activeMemoTab === "deleted"
        ? [
            {
              status: "deleted",
              label: "削除済み",
              count: currentTabCount,
              color: "bg-red-600",
            },
          ]
        : [
            {
              status: "normal",
              label: "通常",
              count: currentTabCount,
              color: "bg-gray-500",
            },
          ];
    } else {
      const currentTabCount = checkedTasks.size;
      return activeTaskTab === "deleted"
        ? [
            {
              status: "deleted",
              label: "削除済み",
              count: currentTabCount,
              color: "bg-red-600",
            },
          ]
        : activeTaskTab === "todo"
          ? [
              {
                status: "todo",
                label: "未着手",
                count: currentTabCount,
                color: "bg-zinc-400",
              },
            ]
          : activeTaskTab === "in_progress"
            ? [
                {
                  status: "in_progress",
                  label: "進行中",
                  count: currentTabCount,
                  color: "bg-Blue",
                },
              ]
            : [
                {
                  status: "completed",
                  label: "完了",
                  count: currentTabCount,
                  color: "bg-Green",
                },
              ];
    }
  }, [
    deletingItemType,
    checkedMemos.size,
    checkedTasks.size,
    activeMemoTab,
    activeTaskTab,
  ]);

  // 他のタブに選択アイテムがあるかチェック
  const getHasOtherTabItems = useCallback(() => {
    if (!deletingItemType) return false;

    if (deletingItemType === "memo") {
      return activeMemoTab === "deleted"
        ? checkedNormalMemos.size > 0
        : checkedDeletedMemos.size > 0;
    } else {
      return activeTaskTab === "deleted"
        ? checkedTodoTasks.size > 0 ||
            checkedInProgressTasks.size > 0 ||
            checkedCompletedTasks.size > 0
        : checkedDeletedTasks.size > 0 ||
            (activeTaskTab !== "todo" && checkedTodoTasks.size > 0) ||
            (activeTaskTab !== "in_progress" &&
              checkedInProgressTasks.size > 0) ||
            (activeTaskTab !== "completed" && checkedCompletedTasks.size > 0);
    }
  }, [
    deletingItemType,
    activeMemoTab,
    activeTaskTab,
    checkedNormalMemos.size,
    checkedDeletedMemos.size,
    checkedTodoTasks.size,
    checkedInProgressTasks.size,
    checkedCompletedTasks.size,
    checkedDeletedTasks.size,
  ]);

  return {
    isMemoDeleting,
    isMemoLidOpen,
    isTaskDeleting,
    isTaskLidOpen,
    deletingItemType,
    bulkDelete,
    handleBulkDelete,
    handleRemoveFromBoard,
    setDeletingItemType,
    setIsMemoDeleting,
    setIsMemoLidOpen,
    setIsTaskDeleting,
    setIsTaskLidOpen,
    bulkAnimation,
    currentMemoDisplayCount,
    currentTaskDisplayCount,
    getModalStatusBreakdown,
    getHasOtherTabItems,
  };
}
