"use client";

import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import MemoScreen from "@/components/screens/memo-screen";
import TaskScreen from "@/components/screens/task-screen";
import RightPanel from "@/components/ui/layout/right-panel";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import type { Tagging, Tag } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useAllTaggings } from "@/src/hooks/use-all-data";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import { useState, useEffect } from "react";
import { useNavigation } from "@/src/contexts/navigation-context";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useCreatorInfo } from "@/src/hooks/use-creator-info";
import { toCreatorProps } from "@/src/types/creator";
import { useUnifiedItemOperations } from "@/src/hooks/use-unified-item-operations";
import {
  useMemoDeleteWithNextSelection,
  useTaskDeleteWithNextSelection,
} from "@/src/hooks/use-memo-delete-with-next-selection";
import { useMemos } from "@/src/hooks/use-memos";
import { useTasks } from "@/src/hooks/use-tasks";

interface BoardRightPanelProps {
  isOpen: boolean;
  boardId: number;
  selectedMemo?: Memo | DeletedMemo | null;
  selectedTask?: Task | DeletedTask | null;
  rightPanelMode: "editor" | "memo-list" | "task-list" | null;
  activeMemoTab?: "normal" | "deleted"; // 現在のメモタブ
  selectedItemsFromList: Set<number>;
  allMemos?: Memo[];
  allTasks?: Task[];
  allBoards?: Board[]; // 全ボード情報
  allTaggings?: Tagging[]; // 全タグ情報
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>; // 全ボードアイテム情報
  itemBoards?: Board[]; // 選択中のアイテムに紐づくボード（親で取得済み）
  // チーム機能関連
  teamMode?: boolean;
  teamId?: number | null;
  onClose: () => void;
  onSelectMemo?: (memo: Memo) => void;
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void;
  onAddSelectedItems: () => void;
  onToggleItemSelection: (itemId: number) => void;
  onMemoDeleteAndSelectNext?: (deletedMemo: Memo) => void;
  onTaskDeleteAndSelectNext?: (deletedTask: Task) => void;
  onDeletedMemoDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  onDeletedTaskDeleteAndSelectNext?: (deletedTask: DeletedTask) => void;
  onMemoRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  onTaskRestoreAndSelectNext?: (deletedTask: DeletedTask) => void;
  onAddMemoToBoard?: (memo: Memo) => void;
  onAddTaskToBoard?: (task: Task) => void;
}

export default function BoardRightPanel({
  isOpen,
  boardId,
  selectedMemo,
  selectedTask,
  rightPanelMode,
  activeMemoTab = "normal",
  allBoards,
  allTaggings: propsAllTaggings,
  allBoardItems,
  itemBoards,
  teamMode = false,
  teamId = null,
  onClose,
  onSelectMemo,
  onSelectTask,
  onMemoDeleteAndSelectNext,
  onTaskDeleteAndSelectNext,
  onDeletedMemoDeleteAndSelectNext,
  onDeletedTaskDeleteAndSelectNext,
  onMemoRestoreAndSelectNext,
  onTaskRestoreAndSelectNext,
  onAddMemoToBoard, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddTaskToBoard, // eslint-disable-line @typescript-eslint/no-unused-vars
}: BoardRightPanelProps) {
  const { handleMainSelectMemo, handleMainSelectTask } = useNavigation();
  const { data: personalTags } = useTags();
  const { data: teamTags } = useTeamTags(teamId || 0);
  const tags = teamMode && teamId ? teamTags : personalTags;

  // タグ付けデータを直接取得（propsではなくReact Queryから最新データを取得）
  const { data: personalTaggings } = useAllTaggings();
  const { data: teamTaggings } = useAllTeamTaggings(teamId || 0);
  const allTaggings = teamMode && teamId ? teamTaggings : personalTaggings;

  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // メモ一覧データを取得（削除処理用）
  const { data: allMemosData } = useMemos({
    teamMode: teamMode || false,
    teamId: teamMode ? teamId || undefined : undefined,
  });
  const allMemos = allMemosData || [];

  const { data: allTasksData } = useTasks({
    teamMode: teamMode || false,
    teamId: teamMode ? teamId || undefined : undefined,
  });
  const allTasks = allTasksData || [];

  // 統一操作フック
  const memoOperations = useUnifiedItemOperations({
    itemType: "memo",
    context: teamMode ? "team" : "board-detail",
    teamId: teamId || undefined,
    boardId,
  });

  const taskOperations = useUnifiedItemOperations({
    itemType: "task",
    context: teamMode ? "team" : "board-detail",
    teamId: teamId || undefined,
    boardId,
  });

  // 削除処理用のstate
  const [isRightMemoLidOpen, setIsRightMemoLidOpen] = useState(false);

  // メモ用共通削除フック（DOM削除確認のみ、API削除は別途行う）
  const {
    handleDeleteWithNextSelection: handleMemoDeleteWithNextSelection,
    checkDomDeletionAndSelectNext: checkMemoDomDeletionAndSelectNext,
  } = useMemoDeleteWithNextSelection({
    memos: allMemos,
    onSelectMemo: (memo: Memo | null) => {
      if (memo) {
        onSelectMemo?.(memo);
      } else {
        onClose();
      }
    },
    onDeselectAndStayOnMemoList: onClose,
    handleRightEditorDelete: () => {
      // 何もしない（削除処理は外部で実行済み）
    },
  });

  // タスク用共通削除フック（DOM削除確認のみ、API削除は別途行う）
  const {
    handleDeleteWithNextSelection: handleTaskDeleteWithNextSelection,
    checkDomDeletionAndSelectNext: checkTaskDomDeletionAndSelectNext,
  } = useTaskDeleteWithNextSelection({
    tasks: allTasks,
    onSelectTask: (task: Task | null) => {
      if (task) {
        onSelectTask?.(task);
      } else {
        onClose();
      }
    },
    onDeselectAndStayOnTaskList: onClose,
    handleRightEditorDelete: () => {
      // 何もしない（削除処理は外部で実行済み）
    },
    setIsRightLidOpen: setIsRightMemoLidOpen,
  });

  // DOM削除確認（メモ・タスク一覧が変更されたときにチェック）
  useEffect(() => {
    checkMemoDomDeletionAndSelectNext();
  }, [allMemos, checkMemoDomDeletionAndSelectNext]);

  useEffect(() => {
    checkTaskDomDeletionAndSelectNext();
  }, [allTasks, checkTaskDomDeletionAndSelectNext]);

  // チーム機能用: 作成者情報を取得
  const { selectedTaskCreatorInfo, selectedMemoCreatorInfo } = useCreatorInfo(
    teamMode,
    teamId,
    selectedMemo,
    selectedTask,
  );

  // 現在のボードに既に追加されているアイテムのoriginalIDのリストを作成
  const currentBoardMemoOriginalIds =
    allBoardItems
      ?.filter((item) => item.boardId === boardId && item.itemType === "memo")
      .map((item) => item.originalId) || [];

  const currentBoardTaskOriginalIds =
    allBoardItems
      ?.filter((item) => item.boardId === boardId && item.itemType === "task")
      .map((item) => item.originalId) || [];

  const [isDeletingMemo, setIsDeletingMemo] = useState(false);

  // 削除済みアイテムかどうかを判定するヘルパー関数
  const isDeletedMemo = (memo: Memo | DeletedMemo): memo is DeletedMemo => {
    // より確実な判定：deletedAtプロパティが存在し、値があるかチェック
    return (
      "deletedAt" in memo &&
      memo.deletedAt !== undefined &&
      memo.deletedAt !== null &&
      typeof memo.deletedAt === "number" &&
      memo.deletedAt > 0
    );
  };

  const isDeletedTask = (task: Task | DeletedTask): task is DeletedTask => {
    // より確実な判定：deletedAtプロパティが存在し、値があるかチェック
    return (
      "deletedAt" in task &&
      task.deletedAt !== undefined &&
      task.deletedAt !== null &&
      typeof task.deletedAt === "number" &&
      task.deletedAt > 0
    );
  };

  // 統一削除フックは削除（MemoScreen内で処理）

  // メモをボードに追加
  const handleAddMemosToBoard = async (memoIds: number[]) => {
    try {
      const token = await getToken();

      const promises = memoIds.map((memoId) => {
        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594"}/boards/${boardId}/items`;
        const body = {
          itemType: "memo",
          itemId: memoId.toString(),
        };

        return fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(body),
        });
      });

      const results = await Promise.all(promises);

      // キャッシュを無効化してボード一覧を再取得
      await queryClient.invalidateQueries({
        queryKey: ["boards", boardId, "items"],
      });
      // チームモードの場合はteamIdを含めてキャッシュ無効化
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: ["boards", "all-items", teamId],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ["boards", "all-items"],
        });
      }

      // 右パネルを閉じて再度開くことで、最新の除外リストを反映
      onClose();
    } catch (error) {
      console.error(
        "❌❌❌ [BoardRightPanel] handleAddMemosToBoard失敗:",
        error,
      );
    }
  };

  // タスクをボードに追加
  const handleAddTasksToBoard = async (taskIds: number[]) => {
    try {
      const token = await getToken();
      const promises = taskIds.map((taskId) => {
        return fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594"}/boards/${boardId}/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              itemType: "task",
              itemId: taskId.toString(),
            }),
          },
        );
      });

      await Promise.all(promises);

      // キャッシュを無効化してボード一覧を再取得
      await queryClient.invalidateQueries({
        queryKey: ["boards", boardId, "items"],
      });
      // チームモードの場合はteamIdを含めてキャッシュ無効化
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: ["boards", "all-items", teamId],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ["boards", "all-items"],
        });
      }

      // 右パネルを閉じて再度開くことで、最新の除外リストを反映
      onClose();
    } catch (error) {
      console.error("エラー:", error);
    }
  };

  // メモ削除ハンドラー（メモエディターの削除確認後に呼ばれる）
  const handleMemoDelete = async () => {
    if (selectedMemo && !isDeletedMemo(selectedMemo) && !isDeletingMemo) {
      // 削除処理中フラグを設定
      setIsDeletingMemo(true);

      try {
        const memoId =
          typeof selectedMemo.id === "number"
            ? selectedMemo.id
            : parseInt(selectedMemo.id, 10);
        if (isNaN(memoId)) {
          console.error(`無効なメモID: ${selectedMemo.id}`);
          setIsRightMemoLidOpen(false);
          setIsDeletingMemo(false);
          return;
        }
        // 統一削除フックによる削除（MemoScreen内で処理される）

        // 削除成功後に蓋を閉じる
        setTimeout(() => {
          setIsRightMemoLidOpen(false);
        }, 200);

        // 共通削除フックを使用した次選択処理
        try {
          handleMemoDeleteWithNextSelection(selectedMemo as Memo);
        } catch (nextSelectError) {}

        // useDeleteMemoのonSuccessで自動的にキャッシュが無効化されるため、手動での無効化は不要
      } catch (error) {
        // エラー時は蓋を閉じる
        setIsRightMemoLidOpen(false);
      } finally {
        // 削除処理中フラグをリセット
        setIsDeletingMemo(false);
      }
    }
  };

  return (
    <RightPanel
      isOpen={isOpen}
      onClose={onClose}
      compactPadding={
        rightPanelMode === "memo-list" || rightPanelMode === "task-list"
      }
      disableAnimation={teamMode}
    >
      {selectedMemo && !selectedTask && rightPanelMode === null && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0">
            {activeMemoTab === "deleted" ? (
              <MemoEditor
                memo={selectedMemo}
                onClose={() => {
                  // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
                }}
                onRestore={async () => {
                  if (
                    selectedMemo &&
                    selectedMemo.originalId &&
                    onMemoRestoreAndSelectNext
                  ) {
                    try {
                      await memoOperations.restoreItem.mutateAsync(
                        selectedMemo.originalId,
                      );
                      onMemoRestoreAndSelectNext(selectedMemo as DeletedMemo);
                    } catch (error) {
                      console.error("エラー:", error);
                    }
                  }
                }}
                onDelete={() => {
                  if (onDeletedMemoDeleteAndSelectNext) {
                    onDeletedMemoDeleteAndSelectNext(
                      selectedMemo as DeletedMemo,
                    );
                  }
                }}
                onDeleteAndSelectNext={(deletedMemo: Memo | DeletedMemo) => {
                  if (onDeletedMemoDeleteAndSelectNext) {
                    onDeletedMemoDeleteAndSelectNext(
                      deletedMemo as DeletedMemo,
                    );
                  }
                }}
                initialBoardId={boardId}
                {...toCreatorProps(selectedMemoCreatorInfo)}
                preloadedTags={tags || []}
                preloadedBoards={allBoards || []}
                preloadedTaggings={allTaggings || []}
                preloadedItemBoards={itemBoards}
              />
            ) : (
              <MemoEditor
                memo={selectedMemo}
                initialBoardId={boardId}
                {...toCreatorProps(selectedMemoCreatorInfo)}
                preloadedTags={tags || []}
                preloadedBoards={allBoards || []}
                preloadedTaggings={allTaggings || []}
                preloadedItemBoards={itemBoards}
                onClose={() => {
                  // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
                }}
                onSaveComplete={(savedMemo) => {
                  // 保存後に選択状態を更新
                  onSelectMemo?.(savedMemo);
                }}
                onRestore={async () => {
                  if (
                    selectedMemo &&
                    selectedMemo.originalId &&
                    onMemoRestoreAndSelectNext
                  ) {
                    try {
                      await memoOperations.restoreItem.mutateAsync(
                        selectedMemo.originalId,
                      );
                      onMemoRestoreAndSelectNext(selectedMemo as DeletedMemo);
                    } catch (error) {
                      console.error("エラー:", error);
                    }
                  }
                }}
                onDelete={async () => {
                  // ボード詳細でのメモ削除処理（削除ボタン表示用）
                }}
                onDeleteAndSelectNext={async (deletedMemo: Memo) => {
                  // API削除開始（楽観的更新でアイテムが即座に消える）
                  const deletePromise = memoOperations.deleteItem.mutateAsync(
                    deletedMemo.id,
                  );

                  // 共通削除フックによる処理（DOM削除確認済み）
                  handleMemoDeleteWithNextSelection(deletedMemo);

                  // API完了を待つ
                  await deletePromise;
                }}
                isLidOpen={isRightMemoLidOpen}
              />
            )}
          </div>
        </div>
      )}

      {selectedTask && !selectedMemo && rightPanelMode === null && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0">
            {isDeletedTask(selectedTask) ? (
              <TaskEditor
                task={selectedTask}
                initialBoardId={boardId}
                isFromBoardDetail={true}
                {...toCreatorProps(selectedTaskCreatorInfo)}
                preloadedTags={tags || []}
                preloadedBoards={allBoards || []}
                preloadedTaggings={allTaggings || []}
                preloadedItemBoards={itemBoards}
                onSelectTask={onSelectTask}
                unifiedOperations={taskOperations}
                onClose={() => {
                  // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
                }}
                onRestore={async () => {
                  if (
                    selectedTask &&
                    selectedTask.originalId &&
                    onTaskRestoreAndSelectNext
                  ) {
                    try {
                      await taskOperations.restoreItem.mutateAsync(
                        selectedTask.originalId,
                      );
                      onTaskRestoreAndSelectNext(selectedTask as DeletedTask);
                    } catch (error) {
                      console.error("エラー:", error);
                    }
                  }
                }}
                onDelete={async () => {
                  if (selectedTask && onDeletedTaskDeleteAndSelectNext) {
                    // 削除済みタスクの完全削除処理（usePermanentDeleteTaskが必要）
                    onDeletedTaskDeleteAndSelectNext(selectedTask);
                  }
                }}
              />
            ) : (
              <TaskEditor
                task={selectedTask}
                initialBoardId={boardId}
                isFromBoardDetail={true}
                {...toCreatorProps(selectedTaskCreatorInfo)}
                preloadedTags={tags || []}
                preloadedBoards={allBoards || []}
                preloadedTaggings={allTaggings || []}
                preloadedItemBoards={itemBoards}
                onSelectTask={onSelectTask}
                unifiedOperations={taskOperations}
                onClose={() => {
                  // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
                }}
                onSaveComplete={(savedTask, isNewTask, isContinuousMode) => {
                  if (!isNewTask) {
                    // 編集の場合は保存後に選択状態を更新
                    onSelectTask?.(savedTask);
                  } else if (!isContinuousMode) {
                    // 新規作成で連続作成モードOFFの場合は作成されたタスクを選択
                    onSelectTask?.(savedTask);
                  }
                  // 連続作成モードONの場合はTaskEditor内でのフォームリセットに任せる
                }}
                onDelete={async () => {
                  // ボード詳細でのタスク削除処理（削除ボタン表示用）
                }}
                onDeleteAndSelectNext={async (deletedTask: Task) => {
                  // API削除開始（楽観的更新でアイテムが即座に消える）
                  const deletePromise = taskOperations.deleteItem.mutateAsync(
                    deletedTask.id,
                  );

                  // 共通削除フックによる処理（DOM削除確認済み）
                  handleTaskDeleteWithNextSelection(deletedTask);

                  // API完了を待つ
                  await deletePromise;
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* メモ一覧表示 */}
      {rightPanelMode === "memo-list" && (
        <MemoScreen
          onSelectMemo={(memo) => {
            if (memo && handleMainSelectMemo) {
              // 選択解除されてアイテムが選択された場合は、メモ画面に移動
              handleMainSelectMemo(memo);
            }
          }}
          onSelectDeletedMemo={() => {}}
          onClose={onClose}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          hideBulkActionButtons={true}
          onAddToBoard={handleAddMemosToBoard}
          excludeItemIds={currentBoardMemoOriginalIds}
          initialSelectionMode="check"
          unifiedOperations={memoOperations}
        />
      )}

      {/* タスク一覧表示 */}
      {rightPanelMode === "task-list" && (
        <TaskScreen
          onSelectTask={(task) => {
            if (task && handleMainSelectTask) {
              // 選択解除されてアイテムが選択された場合は、タスク画面に移動
              handleMainSelectTask(task);
            }
          }}
          onSelectDeletedTask={() => {}}
          onClose={onClose}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          hideBulkActionButtons={true}
          onAddToBoard={handleAddTasksToBoard}
          excludeItemIds={currentBoardTaskOriginalIds}
          initialSelectionMode="check"
          unifiedOperations={taskOperations}
        />
      )}
    </RightPanel>
  );
}
