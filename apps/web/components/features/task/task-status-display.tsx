"use client";

import TaskCard from "@/components/features/task/task-card";
import TaskListItem from "@/components/features/task/task-list-item";
import ItemStatusDisplay from "@/components/ui/layout/item-status-display";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { useMemo, useEffect } from "react";

interface TaskStatusDisplayProps {
  activeTab: "todo" | "in_progress" | "completed";
  tasks: Task[] | undefined;
  viewMode: "card" | "list";
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: Task) => void;
  selectedTaskId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: "include" | "exclude";
  selectedTagIds?: number[];
  tagFilterMode?: "include" | "exclude";
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
  teamMode?: boolean; // チームモードかどうか
  teamId?: number; // チームID

  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allTaggings?: Tagging[];
  allTeamTaggings?: Tagging[]; // チーム用タグ情報
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

interface DeletedTaskDisplayProps {
  deletedTasks: DeletedTask[] | undefined;
  viewMode: "card" | "list";
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: DeletedTask) => void;
  selectedTaskId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: "include" | "exclude";
  selectedTagIds?: number[];
  tagFilterMode?: "include" | "exclude";
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
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
  // 全選択機能
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

function TaskStatusDisplay({
  activeTab,
  tasks,
  viewMode,
  effectiveColumnCount,
  selectionMode = "select",
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
  sortOptions = [],
  isBoard = false,
  teamMode = false,
  teamId,
  allTaggings = [],
  allTeamTaggings = [],
  allBoardItems = [],
}: TaskStatusDisplayProps) {
  // ステータスでフィルター
  const statusFilteredTasks = tasks?.filter(
    (task) => task.status === activeTab,
  );

  // 各タスクのタグとボードを抽出（事前取得データから）
  const tasksWithData = useMemo(() => {
    if (!statusFilteredTasks) return [];

    return statusFilteredTasks.map((task) => {
      const originalId = task.originalId || task.id.toString();

      // このタスクのタグを抽出（チームモード対応）
      const taggingsToUse = teamMode ? allTeamTaggings : allTaggings;
      const taskTaggings = taggingsToUse.filter(
        (t: Tagging) =>
          t.targetType === "task" && t.targetOriginalId === originalId,
      );
      const taskTags = taskTaggings
        .map((t: Tagging) => t.tag)
        .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

      // このタスクのボードを抽出
      const taskBoardItems = allBoardItems.filter(
        (item: { itemType: "memo" | "task"; originalId: string }) =>
          item.itemType === "task" && item.originalId === originalId,
      );
      const taskBoards = taskBoardItems
        .map((item) => ({
          id: item.boardId,
          name: item.boardName,
          slug: `board-${item.boardId}`,
          description: "",
          userId: "",
          position: 0,
          color: null,
          archived: false,
          completed: false,
          createdAt: Date.now() / 1000,
          updatedAt: Date.now() / 1000,
        }))
        .filter(Boolean);

      return {
        task,
        tags: taskTags,
        boards: taskBoards,
      };
    });
  }, [
    statusFilteredTasks,
    allTaggings,
    allTeamTaggings,
    allBoardItems,
    teamMode,
  ]);

  // ボードフィルターとタグフィルターを適用（tasksWithDataベース）
  const filteredTasksWithData = useMemo(() => {
    if (!tasksWithData) return [];

    let result = tasksWithData;

    // ボードフィルターを適用
    if (selectedBoardIds && selectedBoardIds.length > 0) {
      result = result.filter(({ task, boards }) => {
        const taskBoardIds = boards.map((b) => b.id);

        // フィルターモードに応じて表示判定
        if (boardFilterMode === "exclude") {
          // 除外モード：選択されたボードのいずれにも所属していない場合に表示
          return !selectedBoardIds.some((selectedId) =>
            taskBoardIds.includes(selectedId),
          );
        } else {
          // 含むモード（デフォルト）：選択されたボードのいずれかに所属している場合に表示
          return selectedBoardIds.some((selectedId) =>
            taskBoardIds.includes(selectedId),
          );
        }
      });
    }

    // タグフィルターを適用
    if (selectedTagIds && selectedTagIds.length > 0) {
      result = result.filter(({ task, tags }) => {
        const taskTagIds = tags.map((t) => t.id);

        // フィルターモードに応じて表示判定
        if (tagFilterMode === "exclude") {
          // 除外モード：選択されたタグのいずれにも所属していない場合に表示
          return !selectedTagIds.some((selectedId) =>
            taskTagIds.includes(selectedId),
          );
        } else {
          // 含むモード（デフォルト）：選択されたタグのいずれかに所属している場合に表示
          return selectedTagIds.some((selectedId) =>
            taskTagIds.includes(selectedId),
          );
        }
      });
    }

    return result;
  }, [
    tasksWithData,
    selectedBoardIds,
    boardFilterMode,
    selectedTagIds,
    tagFilterMode,
  ]);

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "todo":
        return "未着手のタスクがありません";
      case "in_progress":
        return "進行中のタスクがありません";
      case "completed":
        return "完了したタスクがありません";
      default:
        return "タスクがありません";
    }
  };

  const getSortValue = (task: Task, sortId: string): number => {
    if (!task) return 0;
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
    if (!task) return 0;
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityValue = priorityOrder[task.priority] * 1000000000; // 優先度を大きな重みで乗算
    const timeValue = task.updatedAt || task.createdAt;
    return priorityValue + timeValue;
  };

  const renderTask = (
    task: Task,
    props: {
      isChecked: boolean;
      onToggleCheck: () => void;
      onSelect: () => void;
      isSelected: boolean;
      showEditDate: boolean;
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => {
    // 事前取得されたデータからこのタスクのタグとボードを取得
    const taskWithData = filteredTasksWithData.find(
      (t) => t.task.id === task.id,
    );
    const taskTags = taskWithData?.tags || [];
    const taskBoards = taskWithData?.boards || [];

    const Component = viewMode === "card" ? TaskCard : TaskListItem;
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

    return taskComponent;
    /* eslint-enable react/prop-types */
  };

  // フィルター適用時は個別コンポーネントで判定するため、空メッセージは表示しない

  return (
    <ItemStatusDisplay
      items={filteredTasksWithData.map((t) => t.task)}
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
      itemType="task"
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
  selectionMode = "select",
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
  sortOptions = [],
  isBoard = false,
  allTags = [],
  allBoards = [],
  allTaggings = [],
  allBoardItems = [],
  onSelectAll,
  isAllSelected,
}: DeletedTaskDisplayProps) {
  const getSortValue = (task: DeletedTask, sortId: string): number => {
    if (!task) return 0;
    switch (sortId) {
      case "priority": {
        const priorityOrder: Record<string, number> = {
          high: 3,
          medium: 2,
          low: 1,
        };
        return priorityOrder[task.priority] || 0;
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
    if (!task) return 0;
    return task.deletedAt;
  };

  const renderTask = (
    task: DeletedTask,
    props: {
      isChecked: boolean;
      onToggleCheck: () => void;
      onSelect: () => void;
      isSelected: boolean;
      showEditDate: boolean;
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => {
    // 削除済みタスクのタグ・ボード情報を取得
    const originalId = task.originalId || task.id.toString();

    // このタスクのタグを抽出
    const taskTaggings = allTaggings.filter(
      (t: Tagging) =>
        t.targetType === "task" && t.targetOriginalId === originalId,
    );
    const taskTags = taskTaggings
      .map((t: Tagging) => t.tag)
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

    // このタスクのボードを抽出
    const taskBoardItems = allBoardItems.filter(
      (item: { itemType: "memo" | "task"; originalId: string }) =>
        item.itemType === "task" && item.originalId === originalId,
    );
    const taskBoards = taskBoardItems
      .map((item) =>
        allBoards.find(
          (board) => board.id === (item as { boardId: number }).boardId,
        ),
      )
      .filter(
        (board): board is NonNullable<typeof board> => board !== undefined,
      );

    const Component = viewMode === "card" ? TaskCard : TaskListItem;
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
      itemType="task"
      onSelectAll={onSelectAll}
      isAllSelected={isAllSelected}
    />
  );
}

export default TaskStatusDisplay;
