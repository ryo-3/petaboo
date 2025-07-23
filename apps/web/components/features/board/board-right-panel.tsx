'use client';

import MemoEditor from "@/components/features/memo/memo-editor";
import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import MemoStatusDisplay from "@/components/features/memo/memo-status-display";
import TaskEditor from "@/components/features/task/task-editor";
import DeletedTaskViewer from "@/components/features/task/deleted-task-viewer";
import TaskStatusDisplay from "@/components/features/task/task-status-display";
import MemoScreen from "@/components/screens/memo-screen";
import TaskScreen from "@/components/screens/task-screen";
import RightPanel from "@/components/ui/layout/right-panel";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import { useState } from "react";
import { useDeleteNote } from "@/src/hooks/use-notes";
import { useQueryClient } from "@tanstack/react-query";

interface BoardRightPanelProps {
  isOpen: boolean;
  boardId: number;
  selectedMemo?: Memo | DeletedMemo | null;
  selectedTask?: Task | DeletedTask | null;
  rightPanelMode: "editor" | "memo-list" | "task-list" | null;
  selectedItemsFromList: Set<number>;
  allMemos?: Memo[];
  allTasks?: Task[];
  onClose: () => void;
  onSelectMemo?: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  onAddSelectedItems: () => void;
  onToggleItemSelection: (itemId: number) => void;
  onMemoDeleteAndSelectNext?: (deletedMemo: Memo) => void;
  onTaskDeleteAndSelectNext?: (deletedTask: Task) => void;
  onAddMemoToBoard?: (memo: Memo) => void;
  onAddTaskToBoard?: (task: Task) => void;
}

export default function BoardRightPanel({
  isOpen,
  boardId,
  selectedMemo,
  selectedTask,
  rightPanelMode,
  selectedItemsFromList,
  allMemos,
  allTasks,
  onClose,
  onSelectMemo,
  onSelectTask,
  onAddSelectedItems,
  onToggleItemSelection,
  onMemoDeleteAndSelectNext,
  onTaskDeleteAndSelectNext,
  onAddMemoToBoard,
  onAddTaskToBoard,
}: BoardRightPanelProps) {
  // 削除済みアイテムかどうかを判定するヘルパー関数
  const isDeletedMemo = (memo: Memo | DeletedMemo): memo is DeletedMemo => {
    const result = 'deletedAt' in memo && memo.deletedAt !== undefined;
    console.log('🗑️ isDeletedMemo check:', { memoId: memo.id, hasDeletedAt: 'deletedAt' in memo, deletedAt: 'deletedAt' in memo ? memo.deletedAt : undefined, result });
    return result;
  };
  
  const isDeletedTask = (task: Task | DeletedTask): task is DeletedTask => {
    const result = 'deletedAt' in task && task.deletedAt !== undefined;
    console.log('🗑️ isDeletedTask check:', { taskId: task.id, hasDeletedAt: 'deletedAt' in task, deletedAt: 'deletedAt' in task ? task.deletedAt : undefined, result });
    return result;
  };

  // 削除処理用のstate
  const [isRightMemoLidOpen, setIsRightMemoLidOpen] = useState(false);
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();

  // メモ削除ハンドラー（メモエディターの削除確認後に呼ばれる）
  const handleMemoDelete = async () => {
    if (selectedMemo && !isDeletedMemo(selectedMemo)) {
      setIsRightMemoLidOpen(true);
      try {
        
        await deleteNote.mutateAsync(selectedMemo.id);
        
        // キャッシュを無効化して最新データを取得
        queryClient.invalidateQueries({ queryKey: ["boards"] });
        queryClient.invalidateQueries({ queryKey: ["board-with-items", boardId] });
        queryClient.invalidateQueries({ queryKey: ["board-deleted-items", boardId] });
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["deleted-notes"] });
        
        // 削除成功後に次のアイテムを選択
        setTimeout(() => {
          onMemoDeleteAndSelectNext?.(selectedMemo as Memo);
          setIsRightMemoLidOpen(false);
        }, 200);
      } catch (error) {
        console.error('メモの削除に失敗しました:', error);
        setIsRightMemoLidOpen(false);
      }
    }
  };
  return (
    <RightPanel isOpen={isOpen} onClose={onClose}>
      {selectedMemo && !selectedTask && rightPanelMode === null && (
        <>
          {isDeletedMemo(selectedMemo) ? (
            <DeletedMemoViewer
              key={`deleted-memo-${selectedMemo.id}`}
              memo={selectedMemo}
              onClose={() => {
                // ビューア内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
            />
          ) : (
            <MemoEditor
              key={`memo-${selectedMemo.id}`}
              memo={selectedMemo}
              initialBoardId={boardId}
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
            <DeletedTaskViewer
              key={`deleted-task-${selectedTask.id}`}
              task={selectedTask}
              onClose={() => {
                // ビューア内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
            />
          ) : (
            <TaskEditor
              key={`task-${selectedTask.id}`}
              task={selectedTask}
              initialBoardId={boardId}
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
            if (onAddMemoToBoard) {
              onAddMemoToBoard(memo);
              onClose(); // 追加後に右パネルを閉じる
            }
          }}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          forceShowBoardName={true}
        />
      )}

      {/* タスク一覧表示 */}
      {rightPanelMode === "task-list" && (
        <TaskScreen
          onSelectTask={(task) => {
            if (onAddTaskToBoard) {
              onAddTaskToBoard(task);
              onClose(); // 追加後に右パネルを閉じる
            }
          }}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          forceShowBoardName={true}
        />
      )}
    </RightPanel>
  );
}