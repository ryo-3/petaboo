'use client'

import PlusSimpleIcon from '@/components/icons/plus-simple-icon'
import Tooltip from '@/components/ui/base/tooltip'

type ItemType = 'memo' | 'task'

interface AddItemButtonProps {
  itemType: ItemType
  onClick: () => void
  position?: 'right' | 'top' | 'bottom'
  className?: string
  disabled?: boolean
  size?: 'small' | 'normal'
  showTooltip?: boolean
}

function AddItemButton({
  itemType,
  onClick,
  position = 'right',
  className = '',
  disabled = false,
  size = 'normal',
  showTooltip = true
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
  
  const sizeClasses = {
    small: 'p-2',
    normal: 'p-2'
  }
  
  const iconSizeClasses = {
    small: 'w-4 h-4',
    normal: 'w-5 h-5'
  }

  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClasses[size]} rounded-lg text-white transition-colors ${config.bgColor} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <PlusSimpleIcon className={iconSizeClasses[size]} />
    </button>
  )

  return showTooltip ? (
    <Tooltip
      text={`新規${config.label}作成`}
      position={position}
    >
      {button}
    </Tooltip>
  ) : button
}

export default AddItemButton