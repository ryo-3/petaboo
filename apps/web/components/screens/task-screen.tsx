"use client";

import DeletedTaskViewer, {
  DeletedTaskViewerRef,
} from "@/components/features/task/deleted-task-viewer";
import TaskEditor from "@/components/features/task/task-editor";
import { CSVImportModal } from "@/components/features/task/csv-import-modal";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete";
import { useTasksBulkRestore } from "@/components/features/task/use-task-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import SelectionMenuButton from "@/components/ui/buttons/selection-menu-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { useSortOptions } from "@/hooks/use-sort-options";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useBulkProcessNotifications } from "@/src/hooks/use-bulk-process-notifications";
import { useDeletedItemOperations } from "@/src/hooks/use-deleted-item-operations";
import { useDeletionLid } from "@/src/hooks/use-deletion-lid";
import { useItemDeselect } from "@/src/hooks/use-item-deselect";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import { useTabChange } from "@/src/hooks/use-tab-change";
import { useDeletedTasks, useTasks } from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useBoards } from "@/src/hooks/use-boards";
import ItemBoardsPrefetcher from "@/components/shared/item-boards-prefetcher";
import type { DeletedTask, Task } from "@/src/types/task";
import {
  getTaskDisplayOrder,
} from "@/src/utils/domUtils";
import { createToggleHandlerWithTabClear } from "@/src/utils/toggleUtils";
import { useRef, useState } from "react";

type TaskScreenMode = "list" | "view" | "create" | "edit";

interface TaskScreenProps {
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
  onSelectTask: (task: Task | null, fromFullList?: boolean) => void;
  onSelectDeletedTask: (
    task: DeletedTask | null,
    fromFullList?: boolean
  ) => void;
  onClose: () => void;
  onClearSelection?: () => void; // 選択状態だけクリアする関数
  rightPanelDisabled?: boolean; // 右パネル無効化（ボードから呼び出される場合）
  hideHeaderButtons?: boolean; // ヘッダーボタンを非表示（ボードから呼び出される場合）
  forceShowBoardName?: boolean; // ボード名表示を強制的に有効化（ボードから呼び出される場合）
  excludeBoardId?: number; // 指定されたボードに登録済みのタスクを除外（ボードから呼び出される場合）
  initialSelectionMode?: "select" | "check"; // 初期選択モード
}

function TaskScreen({
  selectedTask,
  selectedDeletedTask,
  onSelectTask,
  onSelectDeletedTask,
  onClose,
  onClearSelection,
  hideHeaderButtons = false,
  forceShowBoardName = false,
  excludeBoardId,
  initialSelectionMode = "select",
}: TaskScreenProps) {
  // 一括処理中断通知の監視
  useBulkProcessNotifications();

  // データ取得
  const { data: tasks, isLoading: taskLoading, error: taskError } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();
  const { preferences } = useUserPreferences(1);
  const { data: boards } = useBoards();


  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    initialSelectionMode
  );

  // 並び替え管理
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sortOptions, setSortOptions, getVisibleSortOptions } =
    useSortOptions("task");

  // 編集日表示管理
  const [showEditDate, setShowEditDate] = useState(false);

  // ボード名表示管理
  const [showBoardName, setShowBoardName] = useState(forceShowBoardName);

  // ボードフィルター管理
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>(
    excludeBoardId ? [excludeBoardId] : []
  );
  const [boardFilterMode, setBoardFilterMode] = useState<'include' | 'exclude'>(
    excludeBoardId ? 'exclude' : 'include'
  );
  

  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // 復元ボタンの参照
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // 削除済みタスクビューアーの参照
  const deletedTaskViewerRef = useRef<DeletedTaskViewerRef>(null);

  // 削除完了時に蓋を閉じる処理
  useDeletionLid(() => setIsRightLidOpen(false));

  // アニメーション状態
  const [isDeleting, setIsDeleting] = useState(false);
  // 蓋アニメーション状態
  const [isLidOpen, setIsLidOpen] = useState(false);
  const [, setIsRightLidOpen] = useState(false);

  // 復元の状態
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreLidOpen, setIsRestoreLidOpen] = useState(false);

  // CSVインポートモーダルの状態
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  // 共通screen状態管理
  const {
    screenMode: taskScreenMode,
    setScreenMode: setTaskScreenMode,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    columnCount,
    setColumnCount,
    checkedItems: checkedTasks,
    setCheckedItems: setCheckedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    setCheckedDeletedItems: setCheckedDeletedTasks,
    effectiveColumnCount,
  } = useScreenState(
    { type: "task", defaultActiveTab: "todo", defaultColumnCount: 2 },
    "list" as TaskScreenMode,
    selectedTask,
    selectedDeletedTask,
    preferences || undefined
  );

  // 一括削除ボタンの表示制御
  const { showDeleteButton } = useBulkDeleteButton({
    activeTab,
    deletedTabName: "deleted",
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    isDeleting,
    isRestoring: isRestoreLidOpen,
  });

  // 全選択機能
  const { isAllSelected, handleSelectAll } = useSelectAll({
    activeTab,
    deletedTabName: "deleted",
    items: tasks || null,
    deletedItems: deletedTasks || null,
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    setCheckedItems: setCheckedTasks,
    setCheckedDeletedItems: setCheckedDeletedTasks,
    filterFn: (task, tab) => task.status === tab,
    currentMode: "task",
  });

  // 選択解除処理
  const handleItemDeselect = useItemDeselect(
    selectedTask,
    selectedDeletedTask,
    () => onClearSelection?.(),
    (mode: string) => setTaskScreenMode(mode as TaskScreenMode)
  );

  // 型キャストの統一化
  const activeTabTyped = activeTab as
    | "todo"
    | "in_progress"
    | "completed"
    | "deleted";

  // 一括削除関連
  const { handleBulkDelete, DeleteModal, currentDisplayCount } =
    useTasksBulkDelete({
      activeTab: activeTabTyped,
      checkedTasks,
      checkedDeletedTasks,
      setCheckedTasks,
      setCheckedDeletedTasks,
      tasks,
      deletedTasks,
      onTaskDelete: handleItemDeselect,
      // onDeletedTaskDelete: handleItemDeselect, // 削除済みタスクはReact Query自動更新で処理
      deleteButtonRef,
      setIsDeleting,
      setIsLidOpen,
      viewMode,
    });

  // 一括復元関連
  const {
    handleBulkRestore,
    RestoreModal,
    currentDisplayCount: currentRestoreDisplayCount,
  } = useTasksBulkRestore({
    activeTab: activeTab as "normal" | "deleted",
    checkedDeletedTasks,
    setCheckedDeletedTasks,
    deletedTasks,
    onDeletedTaskRestore: handleItemDeselect,
    restoreButtonRef,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
  });

  // 削除済みタスク操作の共通ロジック
  const { selectNextDeletedItem: selectNextDeletedTask, handleRestoreAndSelectNext: handleDeletedTaskRestoreAndSelectNext } = 
    useDeletedItemOperations({
      deletedItems: deletedTasks || null,
      onSelectDeletedItem: onSelectDeletedTask,
      setScreenMode: (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
      editorSelector: "[data-task-editor]",
      restoreOptions: { isRestore: true, onSelectWithFromFlag: true },
    });

  // 通常タスクでの次のタスク選択ハンドラー（実際の画面表示順序に基づく）
  const handleTaskDeleteAndSelectNext = (
    deletedTask: Task,
    preDeleteDisplayOrder?: number[]
  ) => {

    if (!tasks) return;

    // 削除されたタスクが現在のタブと異なるステータスの場合は右パネルを閉じるだけ
    if (deletedTask.status !== activeTab) {
      setTaskScreenMode("list");
      onClearSelection?.(); // 選択状態のみクリア
      return;
    }

    // 削除されたタスクを除外してフィルター
    const filteredTasks = tasks.filter(
      (t) => t.status === activeTab && t.id !== deletedTask.id
    );

    // 削除前のDOM順序を使用、なければ現在の順序
    const displayOrder = preDeleteDisplayOrder || getTaskDisplayOrder();

    // DOMベースで次のタスクを直接選択
    const deletedTaskIndex = displayOrder.indexOf(deletedTask.id);

    let nextTaskId = null;

    if (deletedTaskIndex !== -1) {
      // DOM順序で削除されたタスクの次のタスクを探す
      for (let i = deletedTaskIndex + 1; i < displayOrder.length; i++) {
        const candidateId = displayOrder[i];
        if (filteredTasks.some((t) => t.id === candidateId)) {
          nextTaskId = candidateId;
          break;
        }
      }

      // 次がない場合は前のタスクを探す
      if (!nextTaskId) {
        for (let i = deletedTaskIndex - 1; i >= 0; i--) {
          const candidateId = displayOrder[i];
          if (filteredTasks.some((t) => t.id === candidateId)) {
            nextTaskId = candidateId;
            break;
          }
        }
      }
    }


    if (nextTaskId) {
      const nextTask = filteredTasks.find((t) => t.id === nextTaskId);

      if (nextTask) {
        // DOM監視
        setTimeout(() => {
          document.querySelector("[data-task-editor]");

        }, 100);

        onSelectTask(nextTask, true);
        setTaskScreenMode("view");
      } else {
        setTaskScreenMode("list");
        onClearSelection?.(); // ホームに戻らずに選択状態だけクリア
      }
    } else {
      setTaskScreenMode("list");
      onClearSelection?.(); // ホームに戻らずに選択状態だけクリア
    }
  };

  // 選択ハンドラーパターン
  const {
    handleSelectItem: handleSelectTaskBase,
    handleSelectDeletedItem: handleSelectDeletedTask,
    handleCreateNew,
    handleRightPanelClose,
    handleTabChange,
  } = useSelectionHandlers<Task, DeletedTask>({
    setScreenMode: (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
    onSelectItem: onSelectTask,
    onSelectDeletedItem: onSelectDeletedTask,
    onClearSelection,
    onClose: onClose,
  });

  // タスク選択ハンドラー
  const handleSelectTask = (task: Task) => {
    handleSelectTaskBase(task);
  };

  return (
    <div className="flex h-full bg-white">
      {/* タスク一覧のボード情報をプリフェッチ（ちらつき防止） */}
      <ItemBoardsPrefetcher type="task" items={tasks} />
      
      {/* 左側：一覧表示エリア */}
      <div
        className={`${taskScreenMode === "list" ? "w-full" : "w-[44%]"} ${taskScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-3 pl-5 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="task"
          activeTab={activeTabTyped}
          onTabChange={handleTabChange(
            useTabChange({
              setActiveTab,
              setScreenMode: (mode: string) => {
                setTaskScreenMode(mode as TaskScreenMode);
                onClearSelection?.(); // 選択状態もクリア
              },
            })
          )}
          onCreateNew={handleCreateNew}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={taskScreenMode === "list" ? "hidden" : "view"}
          selectionMode={selectionMode}
          onSelectionModeChange={(mode) => {
            setSelectionMode(mode);
            // checkモードからselectモードに切り替える時、選択状態をクリア
            if (mode === "select") {
              setCheckedTasks(new Set());
              setCheckedDeletedTasks(new Set());
            }
          }}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          sortOptions={getVisibleSortOptions(activeTab)}
          onSortChange={setSortOptions}
          showEditDate={showEditDate}
          onShowEditDateChange={setShowEditDate}
          showBoardName={showBoardName}
          onShowBoardNameChange={setShowBoardName}
          boards={boards || []}
          selectedBoardIds={selectedBoardIds}
          onBoardFilterChange={setSelectedBoardIds}
          filterMode={boardFilterMode}
          onFilterModeChange={setBoardFilterMode}
          normalCount={0} // タスクでは使わない
          deletedTasksCount={deletedTasks?.length || 0}
          todoCount={
            tasks?.filter((task) => task.status === "todo").length || 0
          }
          inProgressCount={
            tasks?.filter((task) => task.status === "in_progress").length || 0
          }
          completedCount={
            tasks?.filter((task) => task.status === "completed").length || 0
          }
          hideAddButton={hideHeaderButtons}
          onCsvImport={() => setIsCsvImportModalOpen(true)}
        />

        <DesktopLower
          currentMode="task"
          activeTab={activeTabTyped}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={taskLoading}
          error={taskError}
          selectionMode={selectionMode}
          sortOptions={getVisibleSortOptions(activeTab)}
          showEditDate={showEditDate}
          showBoardName={showBoardName}
          selectedBoardIds={selectedBoardIds}
          boardFilterMode={boardFilterMode}
          tasks={tasks || []}
          deletedTasks={deletedTasks || []}
          selectedTask={selectedTask}
          selectedDeletedTask={selectedDeletedTask}
          checkedTasks={checkedTasks}
          checkedDeletedTasks={checkedDeletedTasks}
          onToggleCheckTask={createToggleHandlerWithTabClear(
            checkedTasks,
            setCheckedTasks,
            [setCheckedDeletedTasks]
          )}
          onToggleCheckDeletedTask={createToggleHandlerWithTabClear(
            checkedDeletedTasks,
            setCheckedDeletedTasks,
            [setCheckedTasks]
          )}
          onSelectTask={handleSelectTask}
          onSelectDeletedTask={handleSelectDeletedTask}
        />

        {/* 一括操作ボタン */}
        <BulkActionButtons
          showDeleteButton={showDeleteButton}
          deleteButtonCount={currentDisplayCount}
          onDelete={() => {
            console.log('🗑️ 削除ボタンが押されました（タスク）')
            console.log('🚫 復元ボタンを非表示にします（タスク）')
            handleBulkDelete()
          }}
          deleteButtonRef={deleteButtonRef}
          isDeleting={isLidOpen}
          deleteVariant={activeTab === "deleted" ? "danger" : undefined}
          showRestoreButton={
            activeTab === "deleted" &&
            !isDeleting &&
            (checkedDeletedTasks.size > 0 ||
              (isRestoring && currentRestoreDisplayCount > 0))
          }
          restoreCount={checkedDeletedTasks.size}
          onRestore={() => {
            console.log('🔄 復元ボタンが押されました（タスク）')
            // 復元ボタンを押した瞬間に削除ボタンを非表示にする
            console.log('🚫 削除ボタンを非表示にします（タスク）')
            setIsRestoreLidOpen(true)
            handleBulkRestore()
          }}
          restoreButtonRef={restoreButtonRef}
          isRestoring={isRestoreLidOpen}
          animatedRestoreCount={currentRestoreDisplayCount}
          useAnimatedRestoreCount={true}
          // アニメーション付きカウンター（タスク側で実装済み）
          animatedDeleteCount={currentDisplayCount}
          useAnimatedDeleteCount={true}
        />
        
        {/* 選択メニューボタン（通常タブでアイテム選択時） */}
        <SelectionMenuButton
          count={checkedTasks.size}
          onBoardLink={() => {
            console.log('ボードに追加（タスク）:', checkedTasks);
          }}
          onExport={() => {
            console.log('エクスポート（タスク）:', checkedTasks);
          }}
          onPin={() => {
            console.log('ピン止め（タスク）:', checkedTasks);
          }}
          onTagging={() => {
            console.log('タグ付け（タスク）:', checkedTasks);
          }}
          onTabMove={() => {
            console.log('タブ移動（タスク）:', checkedTasks);
          }}
          isVisible={
            activeTab !== "deleted" &&
            checkedTasks.size > 0 &&
            !isDeleting
          }
        />
      </div>

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={taskScreenMode !== "list"}
        onClose={handleRightPanelClose}
      >
        {taskScreenMode === "create" && (
          <TaskEditor task={null} onClose={() => setTaskScreenMode("list")} />
        )}
        {taskScreenMode === "view" && selectedTask && (
          <TaskEditor
            task={selectedTask}
            onClose={() => setTaskScreenMode("list")}
            onSelectTask={onSelectTask}
            onClosePanel={() => setTaskScreenMode("list")}
            onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
          />
        )}
        {taskScreenMode === "view" && selectedDeletedTask && (
          <>
            <DeletedTaskViewer
              ref={deletedTaskViewerRef}
              task={selectedDeletedTask}
              onClose={() => setTaskScreenMode("list")}
              onDeleteAndSelectNext={selectNextDeletedTask}
              onRestoreAndSelectNext={handleDeletedTaskRestoreAndSelectNext}
              isLidOpen={isLidOpen}
              onDeleteClick={() => {
                // 削除済タスクの削除処理
                if (selectedDeletedTask) {
                  // 1. 蓋を開く
                  setIsLidOpen(true);
                  setTimeout(() => {
                    // 2. 削除確認モーダルを表示
                    deletedTaskViewerRef.current?.showDeleteConfirmation();
                  }, 200);
                }
              }}
            />
          </>
        )}
        {taskScreenMode === "edit" && selectedTask && (
          <TaskEditor
            task={selectedTask}
            onClose={() => setTaskScreenMode("view")}
            onSelectTask={onSelectTask}
            onClosePanel={() => setTaskScreenMode("list")}
            onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
          />
        )}
      </RightPanel>

      {/* 一括削除確認モーダル */}
      <DeleteModal />

      {/* 一括復元確認モーダル */}
      <RestoreModal />
      
      {/* CSVインポートモーダル */}
      <CSVImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
      />
    </div>
  );
}

export default TaskScreen;
