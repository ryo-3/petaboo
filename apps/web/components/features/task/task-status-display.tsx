'use client';

import TaskCard from '@/components/features/task/task-card';
import TaskListItem from '@/components/features/task/task-list-item';
import ItemStatusDisplay from '@/components/ui/layout/item-status-display';
import TaskFilterWrapper from '@/components/features/task/task-filter-wrapper';
import type { Task, DeletedTask } from '@/src/types/task';
import type { Tag, Tagging } from '@/src/types/tag';
import type { Board } from '@/src/types/board';
import { useMemo } from 'react';

interface TaskStatusDisplayProps {
  activeTab: 'todo' | 'in_progress' | 'completed';
  tasks: Task[] | undefined;
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  selectionMode?: 'select' | 'check';
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: Task) => void;
  selectedTaskId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: 'include' | 'exclude';
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
  
  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allTaggings?: Tagging[];
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: 'memo' | 'task';
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

interface DeletedTaskDisplayProps {
  deletedTasks: DeletedTask[] | undefined;
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  selectionMode?: 'select' | 'check';
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: DeletedTask) => void;
  selectedTaskId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: 'include' | 'exclude';
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
  
  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allBoards?: Board[];
  allTaggings?: Tagging[];
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: 'memo' | 'task';
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

function TaskStatusDisplay({
  activeTab,
  tasks,
  viewMode,
  effectiveColumnCount,
  selectionMode = 'select',
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  selectedBoardIds = [],
  boardFilterMode = 'include',
  sortOptions = [],
  isBoard = false,
  allTaggings = [],
  allBoardItems = []
}: TaskStatusDisplayProps) {
  // ステータスでフィルター
  const statusFilteredTasks = tasks?.filter(task => task.status === activeTab);
  
  // 各タスクのタグとボードを抽出（事前取得データから）
  const tasksWithData = useMemo(() => {
    if (!statusFilteredTasks) return [];
    
    return statusFilteredTasks.map(task => {
      const originalId = task.originalId || task.id.toString();
      
      // このタスクのタグを抽出
      const taskTaggings = allTaggings.filter(
        (t: Tagging) => t.targetType === 'task' && t.targetOriginalId === originalId
      );
      const taskTags = taskTaggings.map((t: Tagging) => t.tag).filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);
      
      // このタスクのボードを抽出
      const taskBoardItems = allBoardItems.filter(
        (item: {itemType: 'memo' | 'task'; originalId: string}) => item.itemType === 'task' && item.originalId === originalId
      );
      const taskBoards = taskBoardItems
        .map(item => ({
          id: item.boardId,
          name: item.boardName,
          slug: `board-${item.boardId}`,
          description: '',
          userId: '',
          position: 0,
          color: null,
          archived: false,
          completed: false,
          createdAt: Date.now() / 1000,
          updatedAt: Date.now() / 1000
        }))
        .filter(Boolean);
      
      return {
        task,
        tags: taskTags,
        boards: taskBoards
      };
    });
  }, [statusFilteredTasks, allTaggings, allBoardItems]);

  // ボードフィルターを適用（tasksWithDataベース）
  const filteredTasksWithData = useMemo(() => {
    if (!tasksWithData) return [];
    
    // ボードフィルターが設定されていない場合は全て表示
    if (!selectedBoardIds || selectedBoardIds.length === 0) {
      return tasksWithData;
    }
    
    // フィルタリングはTaskFilterWrapperで個別に行うため、全て返す
    return tasksWithData;
  }, [tasksWithData, selectedBoardIds]);

  // フィルタリングが必要かどうか
  const needsFiltering = selectedBoardIds && selectedBoardIds.length > 0;

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'todo':
        return '未着手のタスクがありません';
      case 'in_progress':
        return '進行中のタスクがありません';
      case 'completed':
        return '完了したタスクがありません';
      default:
        return 'タスクがありません';
    }
  };

  const getSortValue = (task: Task, sortId: string): number => {
    switch (sortId) {
      case "priority": {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[task.priority] || 0;
      }
      case "createdAt":
        return task.createdAt;
      case "updatedAt":
        return task.updatedAt || task.createdAt;
      case "dueDate":
        return task.dueDate ? new Date(task.dueDate).getTime() : 0;
      default:
        return 0;
    }
  };

  const getDefaultSortValue = (task: Task): number => {
    // デフォルトは優先度 > 更新日 > 作成日順
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityValue = priorityOrder[task.priority] * 1000000000; // 優先度を大きな重みで乗算
    const timeValue = task.updatedAt || task.createdAt;
    return priorityValue + timeValue;
  };

  const renderTask = (task: Task, props: {
    isChecked: boolean;
    onToggleCheck: () => void;
    onSelect: () => void;
    isSelected: boolean;
    showEditDate: boolean;
    showBoardName?: boolean;
    showTags?: boolean;
    variant?: 'normal' | 'deleted';
  }) => {
    // 事前取得されたデータからこのタスクのタグとボードを取得
    const taskWithData = filteredTasksWithData.find(t => t.task.id === task.id);
    const taskTags = taskWithData?.tags || [];
    const taskBoards = taskWithData?.boards || [];
    
    const Component = viewMode === 'card' ? TaskCard : TaskListItem;
    /* eslint-disable react/prop-types */
    const taskComponent = (
      <Component
        key={task.id}
        task={task}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        isSelected={props.isSelected}
        showEditDate={props.showEditDate}
        showBoardName={props.showBoardName}
        showTags={props.showTags}
        variant={props.variant}
        selectionMode={selectionMode}
        tags={taskTags}
        boards={taskBoards}
      />
    );
    
    // フィルタリングが必要な場合はTaskFilterWrapperで包む
    if (needsFiltering) {
      return (
        <TaskFilterWrapper
          key={task.id}
          task={task}
          selectedBoardIds={selectedBoardIds}
          filterMode={boardFilterMode}
        >
          {taskComponent}
        </TaskFilterWrapper>
      );
    }
    
    return taskComponent;
    /* eslint-enable react/prop-types */
  };

  // フィルター適用時は個別コンポーネントで判定するため、空メッセージは表示しない

  return (
    <ItemStatusDisplay
      items={filteredTasksWithData.map(t => t.task)}
      viewMode={viewMode}
      effectiveColumnCount={effectiveColumnCount}
      isBoard={isBoard}
      selectionMode={selectionMode}
      checkedItems={checkedTasks}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectTask}
      selectedItemId={selectedTaskId}
      showEditDate={showEditDate}
      showBoardName={showBoardName}
      showTags={showTags}
      sortOptions={sortOptions}
      emptyMessage={getEmptyMessage()}
      renderItem={renderTask}
      getSortValue={getSortValue}
      getDefaultSortValue={getDefaultSortValue}
    />
  );
}

/**
 * 削除済みタスク表示コンポーネント
 */
export function DeletedTaskDisplay({
  deletedTasks,
  viewMode,
  effectiveColumnCount,
  selectionMode = 'select',
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  sortOptions = [],
  isBoard = false,
  allTags = [],
  allBoards = [],
  allTaggings = [],
  allBoardItems = []
}: DeletedTaskDisplayProps) {
  // 削除済み表示の初期データをログ出力
  console.log('DeletedTaskDisplay初期化:', {
    showTags,
    showBoardName,
    allTagsLength: allTags.length,
    allBoardsLength: allBoards.length,
    allTaggingsLength: allTaggings.length,
    allBoardItemsLength: allBoardItems.length
  });
  const getSortValue = (task: DeletedTask, sortId: string): number => {
    switch (sortId) {
      case "priority": {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[task.priority] || 0);
      }
      case "createdAt":
        return task.createdAt;
      case "updatedAt":
        return task.updatedAt || task.createdAt;
      case "deletedAt":
        return task.deletedAt;
      default:
        return 0;
    }
  };

  const getDefaultSortValue = (task: DeletedTask): number => {
    // デフォルトは削除日順（新しい順）
    return task.deletedAt;
  };

  const renderTask = (task: DeletedTask, props: {
    isChecked: boolean;
    onToggleCheck: () => void;
    onSelect: () => void;
    isSelected: boolean;
    showEditDate: boolean;
    showBoardName?: boolean;
    showTags?: boolean;
    variant?: 'normal' | 'deleted';
  }) => {
    // 削除済みタスクのタグ・ボード情報を取得
    const originalId = task.originalId || task.id.toString();
    
    // このタスクのタグを抽出
    const taskTaggings = allTaggings.filter(
      (t: Tagging) => t.targetType === 'task' && t.targetOriginalId === originalId
    );
    const taskTags = taskTaggings.map((t: Tagging) => t.tag).filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);
    
    // このタスクのボードを抽出
    const taskBoardItems = allBoardItems.filter(
      (item: {itemType: 'memo' | 'task'; originalId: string}) => item.itemType === 'task' && item.originalId === originalId
    );
    const taskBoards = taskBoardItems
      .map(item => allBoards.find(board => board.id === (item as {boardId: number}).boardId))
      .filter((board): board is NonNullable<typeof board> => board !== undefined);

    // デバッグ用ログ（ランダムに1%の確率で出力）
    if (Math.random() < 0.01) {
      console.log('削除済みタスク表示デバッグ:', {
        taskId: task.id,
        originalId,
        showTags: props.showTags,
        showBoardName: props.showBoardName,
        taskTagsLength: taskTags.length,
        taskBoardsLength: taskBoards.length,
        allTaggingsLength: allTaggings.length,
        allBoardItemsLength: allBoardItems.length
      });
    }

    const Component = viewMode === 'card' ? TaskCard : TaskListItem;
    /* eslint-disable react/prop-types */
    return (
      <Component
        key={task.id}
        task={task}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        variant="deleted"
        isSelected={props.isSelected}
        showEditDate={props.showEditDate}
        showBoardName={props.showBoardName}
        showTags={props.showTags}
        preloadedTags={taskTags}
        preloadedBoards={taskBoards}
        selectionMode={selectionMode}
      />
    );
    /* eslint-enable react/prop-types */
  };

  return (
    <ItemStatusDisplay
      items={deletedTasks}
      viewMode={viewMode}
      effectiveColumnCount={effectiveColumnCount}
      isBoard={isBoard}
      selectionMode={selectionMode}
      checkedItems={checkedTasks}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectTask}
      selectedItemId={selectedTaskId}
      showEditDate={showEditDate}
      showBoardName={showBoardName}
      showTags={showTags}
      sortOptions={sortOptions}
      emptyMessage="削除済みタスクはありません"
      renderItem={renderTask}
      getSortValue={getSortValue}
      getDefaultSortValue={getDefaultSortValue}
      variant="deleted"
    />
  );
}

export default TaskStatusDisplay;