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
import { useState } from "react";
import { useNavigation } from "@/src/contexts/navigation-context";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useCreatorInfo } from "@/src/hooks/use-creator-info";
import { toCreatorProps } from "@/src/types/creator";
import { useUnifiedItemOperations } from "@/src/hooks/use-unified-item-operations";

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
  allTaggings,
  allBoardItems,
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
  const { data: tags } = useTags();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

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

  // チーム機能用: 作成者情報を取得
  const { selectedTaskCreatorInfo, selectedMemoCreatorInfo } = useCreatorInfo(
    teamMode,
    teamId,
    selectedMemo,
    selectedTask,
  );

  // 現在のボードに既に追加されているアイテムのoriginalIDのリストを作成
  const currentBoardMemoIds =
    allBoardItems
      ?.filter((item) => item.boardId === boardId && item.itemType === "memo")
      .map((item) => item.originalId) || [];

  const currentBoardTaskIds =
    allBoardItems
      ?.filter((item) => item.boardId === boardId && item.itemType === "task")
      .map((item) => item.originalId) || [];

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
    return "deletedAt" in task && task.deletedAt !== undefined;
  };

  // 削除処理用のstate
  const [isRightMemoLidOpen, setIsRightMemoLidOpen] = useState(false);
  const [isDeletingMemo, setIsDeletingMemo] = useState(false);

  // 統一削除フックは削除（MemoScreen内で処理）

  // メモをボードに追加
  const handleAddMemosToBoard = async (memoIds: number[]) => {
    try {
      const token = await getToken();
      const promises = memoIds.map((memoId) => {
        return fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594"}/boards/${boardId}/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              itemType: "memo",
              itemId: memoId.toString(),
            }),
          },
        );
      });

      await Promise.all(promises);

      // キャッシュを無効化してボード一覧を再取得
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });
    } catch (error) {
      console.error("メモの追加に失敗しました:", error);
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
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });
    } catch (error) {
      console.error("タスクの追加に失敗しました:", error);
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
          setIsRightMemoLidOpen(false);
          setIsDeletingMemo(false);
          return;
        }
        // 統一削除フックによる削除（MemoScreen内で処理される）

        // 削除成功後に蓋を閉じる
        setTimeout(() => {
          setIsRightMemoLidOpen(false);
        }, 200);

        // 削除成功後に次のアイテムを選択（削除前のデータで次のアイテムを決定）
        try {
          onMemoDeleteAndSelectNext?.(selectedMemo as Memo);
        } catch (nextSelectError) {}

        // useDeleteMemoのonSuccessで自動的にキャッシュが無効化されるため、手動での無効化は不要
      } catch (error) {
        // エラー時は蓋を閉じる
        setIsRightMemoLidOpen(false);
      } finally {
        // 削除処理中フラグをリセット
        setIsDeletingMemo(false);
      }
    } else {
    }
  };

  return (
    <RightPanel isOpen={isOpen} onClose={onClose}>
      {selectedMemo && !selectedTask && rightPanelMode === null && (
        <>
          {activeMemoTab === "deleted" ? (
            <MemoEditor
              memo={selectedMemo}
              onClose={() => {
                // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
              onRestore={() => {
                const memo = selectedMemo as DeletedMemo;
                onMemoRestoreAndSelectNext?.(memo);
              }}
              onDelete={() => {
                if (onDeletedMemoDeleteAndSelectNext) {
                  onDeletedMemoDeleteAndSelectNext(selectedMemo as DeletedMemo);
                }
              }}
              onDeleteAndSelectNext={(deletedMemo: Memo | DeletedMemo) => {
                if (onDeletedMemoDeleteAndSelectNext) {
                  onDeletedMemoDeleteAndSelectNext(deletedMemo as DeletedMemo);
                }
              }}
              onRestoreAndSelectNext={onMemoRestoreAndSelectNext}
              initialBoardId={boardId}
              {...toCreatorProps(selectedMemoCreatorInfo)}
              preloadedTags={tags || []}
              preloadedBoards={allBoards || []}
              preloadedTaggings={allTaggings || []}
              preloadedBoardItems={allBoardItems}
            />
          ) : (
            <MemoEditor
              memo={selectedMemo}
              initialBoardId={boardId}
              {...toCreatorProps(selectedMemoCreatorInfo)}
              preloadedTags={tags || []}
              preloadedBoards={allBoards || []}
              preloadedTaggings={allTaggings || []}
              preloadedBoardItems={allBoardItems}
              onClose={() => {
                // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
              onSaveComplete={(savedMemo) => {
                // 保存後に選択状態を更新
                onSelectMemo?.(savedMemo);
              }}
              onDelete={handleMemoDelete}
              onDeleteAndSelectNext={onMemoDeleteAndSelectNext}
              isLidOpen={isRightMemoLidOpen}
            />
          )}
        </>
      )}

      {selectedTask && !selectedMemo && rightPanelMode === null && (
        <>
          {isDeletedTask(selectedTask) ? (
            <TaskEditor
              task={selectedTask}
              initialBoardId={boardId}
              isFromBoardDetail={true}
              {...toCreatorProps(selectedTaskCreatorInfo)}
              preloadedTags={tags || []}
              preloadedBoards={allBoards || []}
              preloadedTaggings={allTaggings || []}
              preloadedBoardItems={allBoardItems}
              onSelectTask={onSelectTask}
              onClose={() => {
                // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
              onRestore={() => {
                if (onTaskRestoreAndSelectNext) {
                  onTaskRestoreAndSelectNext(selectedTask);
                }
              }}
              onDelete={() => {
                if (onDeletedTaskDeleteAndSelectNext) {
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
              preloadedBoardItems={allBoardItems}
              onSelectTask={onSelectTask}
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
              onDeleteAndSelectNext={onTaskDeleteAndSelectNext}
            />
          )}
        </>
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
          onSelectDeletedMemo={(memo) => {
            if (memo) {
              // 型キャスト: DeletedMemo → Memo
              // NOTE: DeletedMemoはMemoのスーパーセット（deletedAtフィールドが追加されている）
              // 選択状態ではdeletedAtの有無を区別せず、Memo型として扱う
              onSelectMemo?.(memo as unknown as Memo);
            }
          }}
          onClose={onClose}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          hideBulkActionButtons={true}
          onAddToBoard={handleAddMemosToBoard}
          excludeItemIds={currentBoardMemoIds}
          initialSelectionMode="check"
          unifiedOperations={memoOperations}
          disableHeaderControls={true}
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
          excludeItemIds={currentBoardTaskIds}
          initialSelectionMode="check"
          unifiedOperations={taskOperations}
          disableHeaderControls={true}
        />
      )}
    </RightPanel>
  );
}
