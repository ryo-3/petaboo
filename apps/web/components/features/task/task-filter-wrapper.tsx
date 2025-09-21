import ItemFilterWrapper from "@/components/shared/item-filter-wrapper";
import type { Task } from "@/src/types/task";
import { ReactElement } from "react";

interface TaskFilterWrapperProps {
  task: Task;
  selectedBoardIds: number[];
  filterMode?: "include" | "exclude";
  children: ReactElement;
}

/**
 * タスクのボードフィルタリングを行うラッパーコンポーネント
 * 内部的に共通のItemFilterWrapperを使用
 */
function TaskFilterWrapper({
  task,
  selectedBoardIds,
  filterMode = "include",
  children,
}: TaskFilterWrapperProps) {
  return (
    <ItemFilterWrapper
      item={task}
      selectedBoardIds={selectedBoardIds}
      filterMode={filterMode}
      itemType="task"
      variant="normal"
    >
      {children}
    </ItemFilterWrapper>
  );
}

export default TaskFilterWrapper;
