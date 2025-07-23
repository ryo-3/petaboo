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

  // メモ削除ハンドラー
  const handleMemoDelete = () => {
    if (selectedMemo && !isDeletedMemo(selectedMemo)) {
      setIsRightMemoLidOpen(true);
      setTimeout(() => {
        onMemoDeleteAndSelectNext?.(selectedMemo as Memo);
        setIsRightMemoLidOpen(false);
      }, 200);
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
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-gray-200 ml-2 mt-1 mb-1 pb-1">
            <h3 className="text-lg font-semibold">メモ一覧から追加</h3>
          </div>
          <div className="flex-1">
            <MemoScreen
              onSelectMemo={(memo) => {
                if (onAddMemoToBoard) {
                  onAddMemoToBoard(memo);
                  onClose(); // 追加後に右パネルを閉じる
                }
              }}
              rightPanelDisabled={true}
            />
          </div>
        </div>
      )}

      {/* タスク一覧表示 */}
      {rightPanelMode === "task-list" && (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-gray-200 ml-2 mt-1 mb-1 pb-1">
            <h3 className="text-lg font-semibold">タスク一覧から追加</h3>
          </div>
          <div className="flex-1">
            <TaskScreen
              onSelectTask={(task) => {
                if (onAddTaskToBoard) {
                  onAddTaskToBoard(task);
                  onClose(); // 追加後に右パネルを閉じる
                }
              }}
              rightPanelDisabled={true}
            />
          </div>
        </div>
      )}
    </RightPanel>
  );
}