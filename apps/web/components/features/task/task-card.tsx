import type { Task, DeletedTask } from '@/src/types/task'
import BaseCard from '@/components/ui/layout/base-card'
import TaskCardContent from './task-card-content'

interface TaskCardProps {
  task: Task | DeletedTask
  isChecked: boolean
  onToggleCheck: () => void
  onSelect: () => void
  variant?: 'normal' | 'deleted'
  isSelected?: boolean
  showEditDate?: boolean
  isDeleting?: boolean
}

function TaskCard({ task, isChecked, onToggleCheck, onSelect, variant = 'normal', isSelected = false, showEditDate = false, isDeleting = false }: TaskCardProps) {
  return (
    <BaseCard
      isChecked={isChecked}
      onToggleCheck={onToggleCheck}
      onSelect={onSelect}
      variant={variant}
      isSelected={isSelected}
      dataTaskId={task.id}
      isDeleting={isDeleting}
    >
      <TaskCardContent task={task} variant={variant} showEditDate={showEditDate} />
    </BaseCard>
  )
}

export default TaskCard