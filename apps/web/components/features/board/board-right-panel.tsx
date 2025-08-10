'use client';

import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import MemoScreen from "@/components/screens/memo-screen";
import TaskScreen from "@/components/screens/task-screen";
import RightPanel from "@/components/ui/layout/right-panel";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import type { Tagging } from "@/src/types/tag";
import { useState } from "react";
import { useNavigation } from "@/contexts/navigation-context";
import { useDeleteMemo } from "@/src/hooks/use-memos";

interface BoardRightPanelProps {
  isOpen: boolean;
  boardId: number;
  selectedMemo?: Memo | DeletedMemo | null;
  selectedTask?: Task | DeletedTask | null;
  rightPanelMode: "editor" | "memo-list" | "task-list" | null;
  selectedItemsFromList: Set<number>;
  allMemos?: Memo[];
  allTasks?: Task[];
  allTaggings?: Tagging[];  // 全タグ情報
  allBoardItems?: Array<{boardId: number; boardName: string; itemType: 'memo' | 'task'; itemId: string; originalId: string; addedAt: number}>;  // 全ボードアイテム情報
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
  allTaggings,
  allBoardItems,
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
  
  // 削除済みアイテムかどうかを判定するヘルパー関数
  const isDeletedMemo = (memo: Memo | DeletedMemo): memo is DeletedMemo => {
    return 'deletedAt' in memo && memo.deletedAt !== undefined;
  };
  
  const isDeletedTask = (task: Task | DeletedTask): task is DeletedTask => {
    return 'deletedAt' in task && task.deletedAt !== undefined;
  };

  // 削除処理用のstate
  const [isRightMemoLidOpen, setIsRightMemoLidOpen] = useState(false);
  const deleteNote = useDeleteMemo();

  // メモ削除ハンドラー（メモエディターの削除確認後に呼ばれる）
  const handleMemoDelete = async () => {
    if (selectedMemo && !isDeletedMemo(selectedMemo)) {
      // 削除処理中はエディターを開いたままにする
      try {
        
        const memoId = typeof selectedMemo.id === 'number' ? selectedMemo.id : parseInt(selectedMemo.id, 10);
        if (isNaN(memoId)) {
          setIsRightMemoLidOpen(false);
          return;
        }
        await deleteNote.mutateAsync(memoId);
        
        // 削除成功後に蓋を閉じる
        setTimeout(() => {
          setIsRightMemoLidOpen(false);
        }, 200);
        
        // 削除成功後に次のアイテムを選択（削除前のデータで次のアイテムを決定）
        onMemoDeleteAndSelectNext?.(selectedMemo as Memo);
        
        // useDeleteMemoのonSuccessで自動的にキャッシュが無効化されるため、手動での無効化は不要
      } catch {
        // エラー時は蓋を閉じる
        setIsRightMemoLidOpen(false);
      }
    }
  };
  
  return (
    <RightPanel isOpen={isOpen} onClose={onClose}>
      {selectedMemo && !selectedTask && rightPanelMode === null && (
        <>
          {isDeletedMemo(selectedMemo) ? (
            <MemoEditor
              key={`deleted-memo-${selectedMemo.id}`}
              memo={selectedMemo}
              onClose={() => {
                // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
              onRestore={() => {
                if (onMemoRestoreAndSelectNext) {
                  onMemoRestoreAndSelectNext(selectedMemo);
                }
              }}
              onDelete={() => {
                if (onDeletedMemoDeleteAndSelectNext) {
                  onDeletedMemoDeleteAndSelectNext(selectedMemo);
                }
              }}
              initialBoardId={boardId}
              preloadedTaggings={allTaggings}
              preloadedBoardItems={allBoardItems}
            />
          ) : (
            <MemoEditor
              key={`memo-${selectedMemo.id}`}
              memo={selectedMemo}
              initialBoardId={boardId}
              preloadedTaggings={allTaggings}
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
              key={`deleted-task-${selectedTask.id}`}
              task={selectedTask}
              initialBoardId={boardId}
              preloadedTaggings={allTaggings}
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
              key={`task-${selectedTask.id}`}
              task={selectedTask}
              initialBoardId={boardId}
              preloadedTaggings={allTaggings}
              preloadedBoardItems={allBoardItems}
              onClose={() => {
                // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
              onSaveComplete={(savedTask) => {
                // 保存後に選択状態を更新
                onSelectTask?.(savedTask);
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
          forceShowBoardName={true}
          excludeBoardId={boardId}
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
          forceShowBoardName={true}
          excludeBoardId={boardId}
          initialSelectionMode="check"
        />
      )}
    </RightPanel>
  );
}