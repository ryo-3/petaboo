'use client'

import MemoForm from '@/components/memo-form'
import type { Memo } from '@/src/types/memo'

interface MemoEditorProps {
  onClose: () => void
  memo?: Memo | null // 新規メモの場合はnull
}

function MemoEditor({ onClose, memo }: MemoEditorProps) {
  return <MemoForm onClose={onClose} memo={memo} />
}

export default MemoEditor