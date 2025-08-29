import type { Task, DeletedTask } from "@/src/types/task";
import BaseCard from "@/components/ui/layout/base-card";
import TaskCardContent from "./task-card-content";

interface TaskCardProps {
  task: Task | DeletedTask;
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  variant?: "normal" | "deleted";
  isSelected?: boolean;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  isDeleting?: boolean;
  selectionMode?: "select" | "check";

  // 事前取得データ（削除済み表示用）
  preloadedTags?: Array<{ id: number; name: string; color?: string }>;
  preloadedBoards?: Array<{ id: number; name: string }>;
}

function TaskCard({
  task,
  isChecked,
  onToggleCheck,
  onSelect,
  variant = "normal",
  isSelected = false,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  isDeleting = false,
  selectionMode = "select",
  preloadedTags,
  preloadedBoards,
}: TaskCardProps) {
  return (
    <BaseCard
      isChecked={isChecked}
      onToggleCheck={onToggleCheck}
      onSelect={onSelect}
      variant={variant}
      isSelected={isSelected}
      dataTaskId={task.id}
      isDeleting={isDeleting}
      selectionMode={selectionMode}
    >
      <TaskCardContent
        task={task}
        variant={variant}
        showEditDate={showEditDate}
        showBoardName={showBoardName}
        showTags={showTags}
        preloadedTags={preloadedTags}
        preloadedBoards={preloadedBoards}
      />
    </BaseCard>
  );
}

export default TaskCard;
