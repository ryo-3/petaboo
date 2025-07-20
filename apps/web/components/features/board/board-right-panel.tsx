'use client';

import MemoEditor from "@/components/features/memo/memo-editor";
import MemoStatusDisplay from "@/components/features/memo/memo-status-display";
import TaskEditor from "@/components/features/task/task-editor";
import TaskStatusDisplay from "@/components/features/task/task-status-display";
import RightPanel from "@/components/ui/layout/right-panel";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";

interface BoardRightPanelProps {
  isOpen: boolean;
  selectedMemo?: Memo | null;
  selectedTask?: Task | null;
  rightPanelMode: "editor" | "memo-list" | "task-list" | null;
  selectedItemsFromList: Set<number>;
  allMemos?: Memo[];
  allTasks?: Task[];
  onClose: () => void;
  onSelectMemo?: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  onAddSelectedItems: () => void;
  onToggleItemSelection: (itemId: number) => void;
}

export default function BoardRightPanel({
  isOpen,
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
}: BoardRightPanelProps) {
  return (
    <RightPanel isOpen={isOpen} onClose={onClose}>
      {selectedMemo && !selectedTask && rightPanelMode === null && (
        <>
          <MemoEditor
            key={`memo-${selectedMemo.id}`}
            memo={selectedMemo}
            onClose={() => {
              // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
            }}
            onSaveComplete={(savedMemo) => {
              // 保存後に選択状態を更新
              onSelectMemo?.(savedMemo);
            }}
          />
        </>
      )}

      {selectedTask && !selectedMemo && rightPanelMode === null && (
        <TaskEditor
          key={`task-${selectedTask.id}`}
          task={selectedTask}
          onClose={() => {
            // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
          }}
          onSaveComplete={(savedTask) => {
            // 保存後に選択状態を更新
            onSelectTask?.(savedTask);
          }}
        />
      )}

      {/* メモ一覧表示 */}
      {rightPanelMode === "memo-list" && (
        <div className="flex flex-col h-full bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 ml-2 mt-1 mb-1 pb-1">
            <h3 className="text-lg font-semibold">メモ一覧から追加</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={onAddSelectedItems}
                disabled={selectedItemsFromList.size === 0}
                className="px-3 py-1 bg-Green text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加 ({selectedItemsFromList.size})
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <MemoStatusDisplay
              memos={allMemos}
              viewMode="list"
              effectiveColumnCount={1}
              selectionMode="check"
              checkedMemos={selectedItemsFromList}
              onToggleCheck={onToggleItemSelection}
              onSelectMemo={(memo) => onToggleItemSelection(memo.id)}
              selectedMemoId={undefined}
              showEditDate={false}
            />
          </div>
        </div>
      )}

      {/* タスク一覧表示 */}
      {rightPanelMode === "task-list" && (
        <div className="flex flex-col h-full bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 ml-2 mt-1 mb-1 pb-1">
            <h3 className="text-lg font-semibold">タスク一覧から追加</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={onAddSelectedItems}
                disabled={selectedItemsFromList.size === 0}
                className="px-3 py-1 bg-DeepBlue text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加 ({selectedItemsFromList.size})
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TaskStatusDisplay
              activeTab="todo"
              tasks={allTasks}
              viewMode="list"
              effectiveColumnCount={1}
              selectionMode="check"
              checkedTasks={selectedItemsFromList}
              onToggleCheck={onToggleItemSelection}
              onSelectTask={(task) => onToggleItemSelection(task.id)}
              selectedTaskId={undefined}
              showEditDate={false}
            />
          </div>
        </div>
      )}
    </RightPanel>
  );
}