'use client'

import MemoForm from '@/components/memo-form'

interface MemoCreatorProps {
  onClose: () => void
}

function MemoCreator({ onClose }: MemoCreatorProps) {
  return <MemoForm onClose={onClose} />
}

export default MemoCreator