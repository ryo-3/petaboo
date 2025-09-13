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
import { useNavigation } from "@/contexts/navigation-context";
import { useDeleteMemo } from "@/src/hooks/use-memos";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";

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
  onSelectTask?: (task: Task) => void;
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

  // 現在のボードに既に追加されているアイテムIDのリストを作成
  const currentBoardMemoIds =
    allBoardItems
      ?.filter((item) => item.boardId === boardId && item.itemType === "memo")
      .map((item) => parseInt(item.itemId, 10)) || [];

  const currentBoardTaskIds =
    allBoardItems
      ?.filter((item) => item.boardId === boardId && item.itemType === "task")
      .map((item) => parseInt(item.itemId, 10)) || [];

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
  const deleteNote = useDeleteMemo({
    teamMode,
    teamId: teamId || undefined,
  });

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
    console.log(
      `🎯 右パネル削除ハンドラー開始: selectedMemo=${selectedMemo?.id}, isDeletingMemo=${isDeletingMemo}`,
    );
    if (selectedMemo && !isDeletedMemo(selectedMemo) && !isDeletingMemo) {
      console.log(
        `🔄 削除処理開始: memo.id=${selectedMemo.id}, teamMode=${teamMode}, teamId=${teamId}`,
      );
      // 削除処理中フラグを設定
      setIsDeletingMemo(true);

      try {
        const memoId =
          typeof selectedMemo.id === "number"
            ? selectedMemo.id
            : parseInt(selectedMemo.id, 10);
        if (isNaN(memoId)) {
          console.log(`❌ 無効なメモID: ${selectedMemo.id}`);
          setIsRightMemoLidOpen(false);
          setIsDeletingMemo(false);
          return;
        }
        console.log(`📤 deleteNote.mutateAsync呼び出し: memoId=${memoId}`);
        await deleteNote.mutateAsync(memoId);
        console.log(`✅ deleteNote.mutateAsync完了: memoId=${memoId}`);

        // 削除成功後に蓋を閉じる
        setTimeout(() => {
          setIsRightMemoLidOpen(false);
        }, 200);

        // 削除成功後に次のアイテムを選択（削除前のデータで次のアイテムを決定）
        console.log(`⏭️ 次のアイテム選択: onMemoDeleteAndSelectNext`);
        try {
          onMemoDeleteAndSelectNext?.(selectedMemo as Memo);
          console.log(`✅ 次のアイテム選択完了`);
        } catch (nextSelectError) {
          console.log(`❌ 次のアイテム選択エラー:`, nextSelectError);
        }

        // useDeleteMemoのonSuccessで自動的にキャッシュが無効化されるため、手動での無効化は不要
      } catch (error) {
        console.log(`❌ メモ削除エラー:`, error);
        // エラー時は蓋を閉じる
        setIsRightMemoLidOpen(false);
      } finally {
        console.log(`🏁 削除処理終了: memoId=${selectedMemo.id}`);
        // 削除処理中フラグをリセット
        setIsDeletingMemo(false);
      }
    } else {
      console.log(
        `⚠️ 削除条件未満: selectedMemo=${!!selectedMemo}, isDeletedMemo=${selectedMemo ? isDeletedMemo(selectedMemo) : "N/A"}, isDeletingMemo=${isDeletingMemo}`,
      );
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
              onRestore={
                onMemoRestoreAndSelectNext
                  ? () => {
                      onMemoRestoreAndSelectNext(selectedMemo as DeletedMemo);
                    }
                  : undefined
              }
              onDelete={() => {
                if (onDeletedMemoDeleteAndSelectNext) {
                  onDeletedMemoDeleteAndSelectNext(selectedMemo as DeletedMemo);
                }
              }}
              initialBoardId={boardId}
              teamMode={teamMode}
              teamId={teamId || undefined}
              preloadedTags={tags || []}
              preloadedBoards={allBoards || []}
              preloadedTaggings={allTaggings || []}
              preloadedBoardItems={allBoardItems}
            />
          ) : (
            <MemoEditor
              memo={selectedMemo}
              initialBoardId={boardId}
              teamMode={teamMode}
              teamId={teamId || undefined}
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
              onDelete={() => {
                // メモエディターの削除処理
                if (selectedMemo) {
                  // 1. 蓋を開く
                  setIsRightMemoLidOpen(true);
                  setTimeout(() => {
                    // 2. 削除実行
                    handleMemoDelete();
                  }, 200);
                }
              }}
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
              teamMode={teamMode}
              teamId={teamId || undefined}
              preloadedTags={tags || []}
              preloadedBoards={allBoards || []}
              preloadedTaggings={allTaggings || []}
              preloadedBoardItems={allBoardItems}
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
              teamMode={teamMode}
              teamId={teamId || undefined}
              preloadedTags={tags || []}
              preloadedBoards={allBoards || []}
              preloadedTaggings={allTaggings || []}
              preloadedBoardItems={allBoardItems}
              onClose={() => {
                // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
              onSaveComplete={(savedTask, isNewTask) => {
                if (!isNewTask) {
                  // 編集の場合は保存後に選択状態を更新
                  onSelectTask?.(savedTask);
                }
                // 新規作成の場合はTaskEditor内でのフォームリセットに任せる
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
          onSelectDeletedMemo={() => {}}
          onClose={onClose}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          hideBulkActionButtons={true}
          onAddToBoard={handleAddMemosToBoard}
          excludeItemIds={currentBoardMemoIds}
          excludeBoardIdFromFilter={boardId}
          initialSelectionMode="check"
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
          excludeBoardIdFromFilter={boardId}
          initialSelectionMode="check"
        />
      )}
    </RightPanel>
  );
}
