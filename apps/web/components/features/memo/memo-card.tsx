import type { Memo, DeletedMemo } from '@/src/types/memo'
import BaseCard from '@/components/ui/layout/base-card'
import MemoCardContent from './memo-card-content'

interface MemoCardProps {
  memo: Memo | DeletedMemo
  isChecked: boolean
  onToggleCheck: () => void
  onSelect: () => void
  variant?: 'normal' | 'deleted'
  isSelected?: boolean
  showEditDate?: boolean
  isDeleting?: boolean
}

function MemoCard({ memo, isChecked, onToggleCheck, onSelect, variant = 'normal', isSelected = false, showEditDate = false, isDeleting = false }: MemoCardProps) {
  return (
    <BaseCard
      isChecked={isChecked}
      onToggleCheck={onToggleCheck}
      onSelect={onSelect}
      variant={variant}
      isSelected={isSelected}
      dataMemoId={memo.id}
      isDeleting={isDeleting}
    >
      <MemoCardContent memo={memo} variant={variant} isSelected={isSelected} showEditDate={showEditDate} />
    </BaseCard>
  )
}

export default MemoCard