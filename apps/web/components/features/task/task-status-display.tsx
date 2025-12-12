"use client";

import ItemCard from "@/components/ui/layout/item-card";
import ItemListDisplay from "@/components/ui/layout/item-list-display";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import type { BoardCategory } from "@/src/types/board-categories";
import type { Attachment } from "@/src/hooks/use-attachments";
import { getTaskTabEmptyMessage } from "@/src/config/taskTabConfig";
import type { TaskStatus, TaskTabType } from "@/src/config/taskTabConfig";
import { useMemo } from "react";

interface TaskStatusDisplayProps {
  activeTab: TaskStatus;
  tasks: Task[] | undefined;
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: Task) => void;
  selectedTaskId?: number;
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
  initialBoardId?: number; // 初期選択ボードID

  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allTaggings?: Tagging[]; // チームモードの場合は親でteamTaggingsに切り替え済み
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: "memo" | "task";
    displayId: string;
    addedAt: number;
  }>;
  allAttachments?: Attachment[];
  // ボードカテゴリー（ボード詳細画面でのみ使用）
  allCategories?: BoardCategory[];
}

interface DeletedTaskDisplayProps {
  deletedTasks: DeletedTask[] | undefined;
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: DeletedTask) => void;
  selectedTaskId?: number;
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
  allBoards?: Board[];
  allTaggings?: Tagging[];
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: "memo" | "task";
    displayId: string;
    addedAt: number;
  }>;
  allAttachments?: Attachment[];
  // ボードカテゴリー（ボード詳細画面でのみ使用）
  allCategories?: BoardCategory[];
  // 全選択機能
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

function TaskStatusDisplay({
  activeTab,
  tasks,
  effectiveColumnCount,
  selectionMode = "select",
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showBoardName = false,
  showTags = true,
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
  sortOptions = [],
  isBoard = false,
  teamMode = false,
  teamId: _teamId,
  initialBoardId,
  allTaggings = [],
  allBoardItems = [],
  allAttachments = [],
  allCategories = [],
}: TaskStatusDisplayProps) {
  // ステータスでフィルター
  const statusFilteredTasks = tasks?.filter(
    (task) => task.status === activeTab,
  );

  // 各タスクのタグとボードを抽出（事前取得データから）
  const tasksWithData = useMemo(() => {
    if (!statusFilteredTasks) return [];

    return statusFilteredTasks.map((task) => {
      // displayIdのみでマッチング（task.idを含めると別タスクのdisplayIdと衝突する可能性あり）
      const displayId = String(task.displayId || "");
      const identifiers = [displayId];

      // このタスクのタグを抽出
      // 注: allTaggingsは親コンポーネントで既にチームモードに応じて切り替えられている
      const taskTaggings = allTaggings.filter(
        (t: Tagging) =>
          t.targetType === "task" &&
          identifiers.some((id) => t.targetDisplayId === id),
      );
      const taskTags = taskTaggings
        .map((t: Tagging) => t.tag)
        .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

      // このタスクのボードを抽出
      const taskBoardItems = allBoardItems.filter(
        (item: { itemType: "memo" | "task"; displayId: string }) =>
          item.itemType === "task" &&
          identifiers.some(
            (id) => item.displayId === id || item.displayId === id,
          ),
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

      // このタスクの添付ファイルを抽出（画像のみ）
      const taskAttachments = allAttachments.filter((attachment) => {
        // attachedDisplayId または displayId を使用（API側の命名に対応）
        const attachmentDisplayId =
          attachment.attachedDisplayId || (attachment as any).displayId || "";
        return (
          identifiers.includes(attachmentDisplayId) &&
          attachment.mimeType.startsWith("image/")
        );
      });

      return {
        task,
        tags: taskTags,
        boards: taskBoards,
        attachments: taskAttachments,
      };
    });
  }, [
    statusFilteredTasks,
    allTaggings,
    allBoardItems,
    allAttachments,
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
    return getTaskTabEmptyMessage(activeTab);
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
    // 完了タブは完了日時順（新しい順）
    if (activeTab === "completed") {
      // completedAtがある場合はそれを使用、なければupdatedAtで代替
      return task.completedAt || task.updatedAt || task.createdAt;
    }
    // それ以外は優先度 > 更新日 > 作成日順
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
    const taskAttachments = taskWithData?.attachments || [];

    // ボードカテゴリー名を取得（ボード詳細画面でのみ使用）
    const boardCategoryName = task.boardCategoryId
      ? allCategories.find((cat) => cat.id === task.boardCategoryId)?.name
      : undefined;

    /* eslint-disable react/prop-types */
    const taskComponent = (
      <ItemCard
        key={task.id}
        itemType="task"
        item={task}
        variant={props.variant}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        isSelected={props.isSelected}
        showBoardName={props.showBoardName}
        showTags={props.showTags}
        selectionMode={selectionMode}
        preloadedTags={taskTags}
        preloadedBoards={taskBoards}
        preloadedAttachments={taskAttachments}
        teamMode={teamMode}
        boardCategoryName={boardCategoryName}
      />
    );

    return taskComponent;
    /* eslint-enable react/prop-types */
  };

  // フィルター適用時は個別コンポーネントで判定するため、空メッセージは表示しない

  return (
    <ItemListDisplay
      items={filteredTasksWithData.map((t) => t.task)}
      effectiveColumnCount={effectiveColumnCount}
      isBoard={isBoard}
      selectionMode={selectionMode}
      checkedItems={checkedTasks}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectTask}
      selectedItemId={selectedTaskId}
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
  effectiveColumnCount,
  selectionMode = "select",
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showBoardName = false,
  showTags = true,
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
  sortOptions = [],
  isBoard = false,
  teamMode = false,
  teamId: _teamId,
  allTags = [],
  allBoards = [],
  allTaggings = [],
  allBoardItems = [],
  allAttachments = [],
  allCategories = [],
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
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => {
    // 削除済みタスクのタグ・ボード情報を取得
    const displayId = task.displayId || "";
    const taskIds = [displayId, String(task.id)];
    if (teamMode && displayId) {
      taskIds.push(displayId);
    }

    // このタスクのタグを抽出
    const taskTaggings = allTaggings.filter(
      (t: Tagging) =>
        t.targetType === "task" &&
        taskIds.some((id) => t.targetDisplayId === id),
    );
    const taskTags = taskTaggings
      .map((t: Tagging) => t.tag)
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

    // このタスクのボードを抽出
    const taskBoardItems = allBoardItems.filter(
      (item: { itemType: "memo" | "task"; displayId: string }) =>
        item.itemType === "task" &&
        taskIds.some((id) => item.displayId === id || item.displayId === id),
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

    // このタスクの添付ファイルを抽出（画像のみ）
    const taskAttachments = allAttachments.filter((attachment) => {
      // attachedDisplayId または displayId を使用（API側の命名に対応）
      const attachmentDisplayId =
        attachment.attachedDisplayId || (attachment as any).displayId || "";
      return (
        taskIds.includes(attachmentDisplayId) &&
        attachment.mimeType.startsWith("image/")
      );
    });

    // ボードカテゴリー名を取得（ボード詳細画面でのみ使用）
    const boardCategoryName = task.boardCategoryId
      ? allCategories.find((cat) => cat.id === task.boardCategoryId)?.name
      : undefined;

    /* eslint-disable react/prop-types */
    return (
      <ItemCard
        key={task.id}
        itemType="task"
        item={task}
        variant="deleted"
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        isSelected={props.isSelected}
        showBoardName={props.showBoardName}
        showTags={props.showTags}
        selectionMode={selectionMode}
        preloadedTags={taskTags}
        preloadedBoards={taskBoards}
        preloadedAttachments={taskAttachments}
        boardCategoryName={boardCategoryName}
      />
    );
    /* eslint-enable react/prop-types */
  };

  return (
    <ItemListDisplay
      items={deletedTasks}
      effectiveColumnCount={effectiveColumnCount}
      isBoard={isBoard}
      selectionMode={selectionMode}
      checkedItems={checkedTasks}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectTask}
      selectedItemId={selectedTaskId}
      showBoardName={showBoardName}
      showTags={showTags}
      sortOptions={sortOptions}
      emptyMessage={getTaskTabEmptyMessage("deleted" as TaskTabType)}
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
