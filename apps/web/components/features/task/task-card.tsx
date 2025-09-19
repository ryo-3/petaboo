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

  // 事前取得データ
  tags?: Array<{ id: number; name: string; color?: string }>;
  boards?: Array<{ id: number; name: string }>;
  // 削除済み表示用
  preloadedTags?: Array<{ id: number; name: string; color?: string }>;
  preloadedBoards?: Array<{ id: number; name: string }>;
  // チーム機能
  teamMode?: boolean;
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
  tags,
  boards,
  preloadedTags,
  preloadedBoards,
  teamMode = false,
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
        tags={tags}
        boards={boards}
        preloadedTags={preloadedTags}
        preloadedBoards={preloadedBoards}
        teamMode={teamMode}
      />
    </BaseCard>
  );
}

export default TaskCard;
