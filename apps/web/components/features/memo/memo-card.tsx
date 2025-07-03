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
}

function MemoCard({ memo, isChecked, onToggleCheck, onSelect, variant = 'normal', isSelected = false, showEditDate = false }: MemoCardProps) {
  return (
    <BaseCard
      isChecked={isChecked}
      onToggleCheck={onToggleCheck}
      onSelect={onSelect}
      variant={variant}
      isSelected={isSelected}
      dataMemoId={memo.id}
    >
      <MemoCardContent memo={memo} variant={variant} isSelected={isSelected} showEditDate={showEditDate} />
    </BaseCard>
  )
}

export default MemoCard