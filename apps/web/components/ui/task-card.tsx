import type { Task, DeletedTask } from '@/src/types/task'
import BaseCard from './base-card'
import TaskCardContent from './task-card-content'

interface TaskCardProps {
  task: Task | DeletedTask
  isChecked: boolean
  onToggleCheck: () => void
  onSelect: () => void
  variant?: 'normal' | 'deleted'
  isSelected?: boolean
}

function TaskCard({ task, isChecked, onToggleCheck, onSelect, variant = 'normal', isSelected = false }: TaskCardProps) {
  return (
    <BaseCard
      isChecked={isChecked}
      onToggleCheck={onToggleCheck}
      onSelect={onSelect}
      variant={variant}
      isSelected={isSelected}
    >
      <TaskCardContent task={task} variant={variant} />
    </BaseCard>
  )
}

export default TaskCard