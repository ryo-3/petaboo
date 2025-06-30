'use client'

import PlusSimpleIcon from '@/components/icons/plus-simple-icon'
import Tooltip from '@/components/ui/tooltip'

type ItemType = 'memo' | 'task'

interface AddItemButtonProps {
  itemType: ItemType
  onClick: () => void
  position?: 'right' | 'top' | 'bottom'
  className?: string
  disabled?: boolean
}

function AddItemButton({
  itemType,
  onClick,
  position = 'right',
  className = '',
  disabled = false
}: AddItemButtonProps) {
  const typeConfig = {
    memo: {
      label: 'メモ',
      bgColor: 'bg-Green hover:bg-Green/85',
    },
    task: {
      label: 'タスク',
      bgColor: 'bg-Yellow hover:bg-Yellow/85',
    }
  }

  const config = typeConfig[itemType]

  return (
    <Tooltip
      text={`新規${config.label}作成`}
      position={position}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded-lg text-white transition-colors ${config.bgColor} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <PlusSimpleIcon className="w-5 h-5" />
      </button>
    </Tooltip>
  )
}

export default AddItemButton