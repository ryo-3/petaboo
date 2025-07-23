'use client';

import MemoEditor from "@/components/features/memo/memo-editor";
import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import TaskEditor from "@/components/features/task/task-editor";
import DeletedTaskViewer from "@/components/features/task/deleted-task-viewer";
import MemoScreen from "@/components/screens/memo-screen";
import TaskScreen from "@/components/screens/task-screen";
import RightPanel from "@/components/ui/layout/right-panel";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import { useState } from "react";
import { useDeleteMemo } from "@/src/hooks/use-memos";
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
  onClose,
  onSelectMemo,
  onSelectTask,
  onMemoDeleteAndSelectNext,
  onTaskDeleteAndSelectNext,
  onMemoRestoreAndSelectNext,
  onTaskRestoreAndSelectNext,
  onAddMemoToBoard,
  onAddTaskToBoard,
}: BoardRightPanelProps) {
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
        queryClient.invalidateQueries({ queryKey: ["memos"] });
        queryClient.invalidateQueries({ queryKey: ["deleted-memos"] });
        
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
              onRestoreAndSelectNext={onMemoRestoreAndSelectNext}
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
              onRestoreAndSelectNext={onTaskRestoreAndSelectNext}
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
            if (onAddMemoToBoard && memo) {
              onAddMemoToBoard(memo);
              onClose(); // 追加後に右パネルを閉じる
            }
          }}
          onSelectDeletedMemo={() => {}}
          onClose={onClose}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          forceShowBoardName={true}
        />
      )}

      {/* タスク一覧表示 */}
      {rightPanelMode === "task-list" && (
        <TaskScreen
          onSelectTask={(task) => {
            if (onAddTaskToBoard && task) {
              onAddTaskToBoard(task);
              onClose(); // 追加後に右パネルを閉じる
            }
          }}
          onSelectDeletedTask={() => {}}
          onClose={onClose}
          rightPanelDisabled={true}
          hideHeaderButtons={true}
          forceShowBoardName={true}
        />
      )}
    </RightPanel>
  );
}