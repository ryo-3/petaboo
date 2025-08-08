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
  showBoardName?: boolean
  showTags?: boolean
  isDeleting?: boolean
  selectionMode?: 'select' | 'check'
}

function MemoCard({ memo, isChecked, onToggleCheck, onSelect, variant = 'normal', isSelected = false, showEditDate = false, showBoardName = false, showTags = false, isDeleting = false, selectionMode = 'select' }: MemoCardProps) {
  return (
    <BaseCard
      isChecked={isChecked}
      onToggleCheck={onToggleCheck}
      onSelect={onSelect}
      variant={variant}
      isSelected={isSelected}
      dataMemoId={memo.id}
      isDeleting={isDeleting}
      selectionMode={selectionMode}
    >
      <MemoCardContent memo={memo} variant={variant} isSelected={isSelected} showEditDate={showEditDate} showBoardName={showBoardName} showTags={showTags} />
    </BaseCard>
  )
}

export default MemoCard