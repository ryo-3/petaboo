"use client";

import DeletedTaskViewer, { DeletedTaskViewerRef } from "@/components/features/task/deleted-task-viewer";
import TaskEditor from "@/components/features/task/task-editor";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete";
import { useTasksBulkRestore } from "@/components/features/task/use-task-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import DeleteButton from "@/components/ui/buttons/delete-button";
import RestoreButton from "@/components/ui/buttons/restore-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { BulkDeleteConfirmation, BulkRestoreConfirmation } from "@/components/ui/modals";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useDeletedTasks, useTasks } from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedTask, Task } from "@/src/types/task";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  getNextDeletedItem,
  getTaskDisplayOrder,
  createDeletedNextSelectionHandler,
} from "@/src/utils/domUtils";
import {
  getDeleteButtonCount,
  shouldShowDeleteButton,
} from "@/src/utils/screenUtils";
import { createToggleHandler } from "@/src/utils/toggleUtils";
import { DELETE_BUTTON_POSITION } from "@/src/constants/ui";

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
}

function TaskScreen({
  selectedTask,
  selectedDeletedTask,
  onSelectTask,
  onSelectDeletedTask,
  onClose,
  onClearSelection,
}: TaskScreenProps) {
  // データ取得
  const { data: tasks, isLoading: taskLoading, error: taskError } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();
  const { preferences } = useUserPreferences(1);
  
  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<'select' | 'check'>('select');
  
  // 並び替え管理
  const [sortOptions, setSortOptions] = useState<Array<{
    id: "createdAt" | "updatedAt" | "priority";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>>([
    { id: "priority" as const, label: "優先度順", enabled: false, direction: "desc" as const },
    { id: "updatedAt" as const, label: "更新日順", enabled: false, direction: "desc" as const },
    { id: "createdAt" as const, label: "作成日順", enabled: false, direction: "desc" as const },
  ]);

  // 編集日表示管理
  const [showEditDate, setShowEditDate] = useState(true);
  
  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  
  // 削除済みタスクビューアーの参照
  const deletedTaskViewerRef = useRef<DeletedTaskViewerRef>(null);
  
  // 削除完了時に蓋を閉じる関数を設定
  useEffect(() => {
    (window as any).closeDeletingLid = () => {
      setIsRightLidOpen(false);
    };
    
    return () => {
      delete (window as any).closeDeletingLid;
    };
  }, []);
  
  // アニメーション状態
  const [isDeleting, setIsDeleting] = useState(false);
  // 削除ボタンの表示状態（アニメーション中も表示を維持）
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  // 蓋アニメーション状態
  const [isLidOpen, setIsLidOpen] = useState(false);
  const [isRightLidOpen, setIsRightLidOpen] = useState(false);
  

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
    { type: 'task', defaultActiveTab: 'todo', defaultColumnCount: 2 },
    'list' as TaskScreenMode,
    selectedTask,
    selectedDeletedTask,
    preferences || undefined
  );

  // 削除ボタン表示判定の統一化
  const shouldShowLeftBulkDelete = useMemo(() => {
    // 削除中は強制的に表示を維持
    if (isDeleting) {
      return true;
    }
    return shouldShowDeleteButton(
      activeTab,
      "deleted",
      checkedTasks,
      checkedDeletedTasks
    );
  }, [activeTab, checkedTasks, checkedDeletedTasks, isDeleting]);

  const deleteButtonCount = useMemo(() => {
    return getDeleteButtonCount(
      activeTab,
      "deleted",
      checkedTasks,
      checkedDeletedTasks
    );
  }, [activeTab, checkedTasks, checkedDeletedTasks]);

  // 削除ボタンの表示判定を更新
  useEffect(() => {
    if (shouldShowLeftBulkDelete && !showDeleteButton) {
      // 表示する場合はすぐに表示
      setShowDeleteButton(true);
    } else if (!shouldShowLeftBulkDelete && showDeleteButton && !isDeleting) {
      // 非表示にする場合は、アニメーション中でなければ1秒後に非表示
      const timer = setTimeout(() => {
        setShowDeleteButton(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowLeftBulkDelete, showDeleteButton, isDeleting]);

  // 全選択状態の判定
  const isAllSelected = useMemo(() => {
    if (activeTab === "deleted" && deletedTasks && deletedTasks.length > 0) {
      return deletedTasks.every(task => checkedDeletedTasks.has(task.id));
    } else if (tasks) {
      const filteredTasks = tasks.filter(task => task.status === activeTab);
      if (filteredTasks.length > 0) {
        return filteredTasks.every(task => checkedTasks.has(task.id));
      }
    }
    return false;
  }, [activeTab, tasks, deletedTasks, checkedTasks, checkedDeletedTasks]);

  // 全選択/全解除機能
  const handleSelectAll = useCallback(() => {
    if (activeTab === "deleted" && deletedTasks) {
      if (isAllSelected) {
        setCheckedDeletedTasks(new Set());
      } else {
        const allDeletedTaskIds = new Set(deletedTasks.map(task => task.id));
        setCheckedDeletedTasks(allDeletedTaskIds);
      }
    } else if (tasks) {
      const filteredTasks = tasks.filter(task => task.status === activeTab);
      if (isAllSelected) {
        setCheckedTasks(new Set());
      } else {
        const allTaskIds = new Set(filteredTasks.map(task => task.id));
        setCheckedTasks(allTaskIds);
      }
    }
  }, [activeTab, tasks, deletedTasks, isAllSelected, setCheckedTasks, setCheckedDeletedTasks]);

  // 選択解除処理の統一化
  const handleItemDeselect = useCallback((id: number) => {
    if (selectedTask?.id === id || selectedDeletedTask?.id === id) {
      onClearSelection?.();
      setTaskScreenMode("list");
    }
  }, [selectedTask, selectedDeletedTask, onClearSelection, setTaskScreenMode]);

  // 型キャストの統一化
  const activeTabTyped = activeTab as "todo" | "in_progress" | "completed" | "deleted";

  // 一括削除関連
  const { handleBulkDelete, bulkDeleteState } = useTasksBulkDelete({
    activeTab: activeTabTyped,
    checkedTasks,
    checkedDeletedTasks,
    setCheckedTasks,
    setCheckedDeletedTasks,
    tasks,
    deletedTasks,
    onTaskDelete: handleItemDeselect,
    onDeletedTaskDelete: handleItemDeselect,
    deleteButtonRef,
    setIsDeleting,
    setIsLidOpen,
    viewMode
  });

  // 一括復元関連
  const { handleBulkRestore, bulkRestoreState } = useTasksBulkRestore({
    checkedDeletedTasks,
    setCheckedDeletedTasks,
    deletedTasks,
    onDeletedTaskRestore: handleItemDeselect
  });

  // 削除後の次選択処理 - メモ側と同じシンプル化
  const selectNextDeletedTask = useCallback((deletedTask: DeletedTask) => {
    if (!deletedTasks) {
      onClose();
      return;
    }

    const nextTask = getNextDeletedItem(deletedTasks, deletedTask);
    
    if (nextTask && nextTask.id !== deletedTask.id) {
      // 次のタスクを選択
      onSelectDeletedTask(nextTask, true);
      setTaskScreenMode("view");
      
      // エディター表示復元
      setTimeout(() => {
        const editor = document.querySelector('[data-task-editor]') as HTMLElement;
        if (editor) {
          editor.style.visibility = 'visible';
          editor.style.pointerEvents = 'auto';
        }
      }, 100);
    } else {
      // 次がない場合はリストに戻る
      setTaskScreenMode("list");
      onClose();
    }
  }, [deletedTasks, onSelectDeletedTask, onClose, setTaskScreenMode]);

  // 削除済みタスクの復元時の次のタスク選択ハンドラー
  const handleDeletedTaskRestoreAndSelectNext = (deletedTask: DeletedTask) => {
    if (!deletedTasks) return;

    createDeletedNextSelectionHandler(
      deletedTasks,
      deletedTask,
      (task) => onSelectDeletedTask(task, true),
      () => {
        setTaskScreenMode("list");
        onClearSelection?.();
      },
      setTaskScreenMode
    );
  };

  // 通常タスクでの次のタスク選択ハンドラー（実際の画面表示順序に基づく）
  const handleTaskDeleteAndSelectNext = (deletedTask: Task, preDeleteDisplayOrder?: number[]) => {
    console.log('🎯 handleTaskDeleteAndSelectNext開始:', { 
      deletedTaskId: deletedTask.id, 
      deletedTaskStatus: deletedTask.status,
      activeTab,
      tasksLength: tasks?.length
    });
    
    if (!tasks) return;

    // 削除されたタスクが現在のタブと異なるステータスの場合は右パネルを閉じるだけ
    if (deletedTask.status !== activeTab) {
      console.log('🎯 ステータス不一致、パネルを閉じる');
      setTaskScreenMode("list");
      onClearSelection?.(); // 選択状態のみクリア
      return;
    }

    // 削除されたタスクを除外してフィルター
    const filteredTasks = tasks.filter((t) => t.status === activeTab && t.id !== deletedTask.id);
    console.log('🎯 フィルター後のタスク:', { 
      filteredTasksLength: filteredTasks.length,
      filteredTaskIds: filteredTasks.map(t => t.id),
      deletedTaskId: deletedTask.id,
      excludedDeletedTask: true
    });
    
    // 削除前のDOM順序を使用、なければ現在の順序
    const displayOrder = preDeleteDisplayOrder || getTaskDisplayOrder();
    console.log('🎯 DOM表示順序:', { displayOrder, deletedTaskId: deletedTask.id, usePreDelete: !!preDeleteDisplayOrder });

    // DOMベースで次のタスクを直接選択
    const deletedTaskIndex = displayOrder.indexOf(deletedTask.id);
    console.log('🎯 削除されたタスクのDOM位置:', { deletedTaskIndex, deletedTaskId: deletedTask.id });
    
    let nextTaskId = null;
    
    if (deletedTaskIndex !== -1) {
      // DOM順序で削除されたタスクの次のタスクを探す
      for (let i = deletedTaskIndex + 1; i < displayOrder.length; i++) {
        const candidateId = displayOrder[i];
        if (filteredTasks.some(t => t.id === candidateId)) {
          nextTaskId = candidateId;
          break;
        }
      }
      
      // 次がない場合は前のタスクを探す
      if (!nextTaskId) {
        for (let i = deletedTaskIndex - 1; i >= 0; i--) {
          const candidateId = displayOrder[i];
          if (filteredTasks.some(t => t.id === candidateId)) {
            nextTaskId = candidateId;
            break;
          }
        }
      }
    }
    
    console.log('🎯 次のタスクID:', { nextTaskId });
    
    if (nextTaskId) {
      const nextTask = filteredTasks.find(t => t.id === nextTaskId);
      console.log('🎯 次のタスクを選択:', { nextTask });
      
      if (nextTask) {
        // DOM監視
        setTimeout(() => {
          const editorElement = document.querySelector('[data-task-editor]');
          const titleInput = editorElement?.querySelector('input[placeholder="タスクタイトルを入力..."]') as HTMLInputElement;
          const textarea = editorElement?.querySelector('textarea') as HTMLTextAreaElement;
          
          console.log('🎯 エディターDOM監視:', {
            editorExists: !!editorElement,
            titleValue: titleInput?.value || 'なし',
            textareaValue: textarea?.value || 'なし',
            editorVisibility: editorElement ? getComputedStyle(editorElement).visibility : 'なし'
          });
        }, 100);
        
        onSelectTask(nextTask, true);
        setTaskScreenMode("view");
      } else {
        console.log('🎯 次のタスクが見つからない、リストモードに戻る');
        setTaskScreenMode("list");
        onClose();
      }
    } else {
      console.log('🎯 次のタスクIDが見つからない、リストモードに戻る');
      setTaskScreenMode("list");
      onClose();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${taskScreenMode === "list" ? "w-full" : "w-1/2"} ${taskScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-[400ms] relative`}
      >
        <DesktopUpper
          currentMode="task"
          activeTab={activeTabTyped}
          onTabChange={(tab) => {
            setActiveTab(tab);
            // タブ切り替え時に右パネルを閉じる
            setTaskScreenMode("list");
            onClearSelection?.();
          }}
          onCreateNew={() => {
            // 新規作成時に選択状態をクリア
            onSelectTask(null, true);
            onSelectDeletedTask(null, true);
            setTaskScreenMode("create");
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={taskScreenMode === "list" ? "hidden" : "view"}
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          sortOptions={sortOptions}
          onSortChange={setSortOptions}
          showEditDate={showEditDate}
          onShowEditDateChange={setShowEditDate}
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
        />

        <DesktopLower
          currentMode="task"
          activeTab={activeTabTyped}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={taskLoading}
          error={taskError}
          selectionMode={selectionMode}
          sortOptions={sortOptions}
          showEditDate={showEditDate}
          tasks={tasks || []}
          deletedTasks={deletedTasks || []}
          selectedTask={selectedTask}
          selectedDeletedTask={selectedDeletedTask}
          checkedTasks={checkedTasks}
          checkedDeletedTasks={checkedDeletedTasks}
          onToggleCheckTask={createToggleHandler(checkedTasks, setCheckedTasks)}
          onToggleCheckDeletedTask={createToggleHandler(
            checkedDeletedTasks,
            setCheckedDeletedTasks
          )}
          onSelectTask={(task) => {
            onSelectTask(task, true);
            setTaskScreenMode("view");
          }}
          onSelectDeletedTask={(task) => {
            onSelectDeletedTask(task, true);
            setTaskScreenMode("view");
          }}
        />

        {/* 一括削除ボタン */}
        <div
          className={`absolute bottom-4 right-6 z-10 transition-opacity duration-300 ${
            shouldShowLeftBulkDelete
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <DeleteButton
            ref={deleteButtonRef}
            onDelete={handleBulkDelete}
            count={deleteButtonCount}
            isAnimating={isLidOpen}
            variant={activeTab === "deleted" ? "danger" : undefined}
          />
        </div>

        {/* 一括復元ボタン */}
        <div className={`absolute bottom-4 left-6 z-10 transition-opacity duration-300 ${
          activeTab === "deleted" && checkedDeletedTasks.size > 0
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}>
          <RestoreButton
            onRestore={handleBulkRestore}
            isRestoring={bulkRestoreState.isRestoring}
            count={checkedDeletedTasks.size}
            buttonSize="size-9"
            iconSize="size-5"
            tooltipPosition="top"
          />
        </div>
      </div>

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={taskScreenMode !== "list"}
        onClose={() => {
          setTaskScreenMode("list");
          onClearSelection?.(); // 選択状態のみクリア（画面は変更しない）
        }}
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
            />
            {/* 削除済みタスク用の右下削除ボタン */}
            <div className={`${DELETE_BUTTON_POSITION} z-10`}>
              <DeleteButton
                data-right-panel-trash
                onDelete={() => {
                  // ボタンクリック時に即座に蓋を開く
                  setIsRightLidOpen(true);
                  
                  // 削除済みタスクビューアーの削除確認を呼び出す
                  deletedTaskViewerRef.current?.showDeleteConfirmation();
                }}
                isAnimating={isRightLidOpen}
                variant="danger"
              />
            </div>
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
      <BulkDeleteConfirmation
        isOpen={bulkDeleteState.isModalOpen}
        onClose={bulkDeleteState.handleCancel}
        onConfirm={bulkDeleteState.handleConfirm}
        count={bulkDeleteState.targetIds.length}
        itemType="task"
        deleteType={activeTab === "deleted" ? "permanent" : "normal"}
        isLoading={bulkDeleteState.isDeleting}
      />

      {/* 一括復元確認モーダル */}
      <BulkRestoreConfirmation
        isOpen={bulkRestoreState.isModalOpen}
        onClose={bulkRestoreState.handleCancel}
        onConfirm={bulkRestoreState.handleConfirm}
        count={bulkRestoreState.targetIds.length}
        itemType="task"
        isLoading={bulkRestoreState.isRestoring}
      />
    </div>
  );
}

export default TaskScreen;
