import type { Memo, DeletedMemo } from '@/src/types/memo'
import type { Tag } from '@/src/types/tag'
import type { Board } from '@/src/types/board'
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
  
  // 全データ事前取得（ちらつき解消）
  preloadedTags?: Tag[]
  preloadedBoards?: Board[]
}

function MemoCard({ 
  memo, 
  isChecked, 
  onToggleCheck, 
  onSelect, 
  variant = 'normal', 
  isSelected = false, 
  showEditDate = false, 
  showBoardName = false, 
  showTags = false, 
  isDeleting = false, 
  selectionMode = 'select',
  preloadedTags = [],
  preloadedBoards = []
}: MemoCardProps) {
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
      <MemoCardContent 
        memo={memo} 
        variant={variant} 
        isSelected={isSelected} 
        showEditDate={showEditDate} 
        showBoardName={showBoardName} 
        showTags={showTags}
        preloadedTags={preloadedTags}
        preloadedBoards={preloadedBoards}
      />
    </BaseCard>
  )
}

export default MemoCard