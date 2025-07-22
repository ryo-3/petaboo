'use client'

import { ReactNode, useState } from 'react'
import TrashIcon from '@/components/icons/trash-icon'
import Modal from './modal'

type IconType = 'trash' | 'logout' | 'save' | 'warning' | 'info' | 'custom'
type Variant = 'danger' | 'warning' | 'primary' | 'secondary'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  variant?: Variant
  icon?: IconType
  customIcon?: ReactNode
  position?: 'center' | 'right-panel'
}

// 一括削除用のカスタムhook
export function useBulkDelete() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetIds, setTargetIds] = useState<number[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [customMessage, setCustomMessage] = useState<string | ReactNode | undefined>(undefined)
  const [isPartialDelete, setIsPartialDelete] = useState(false)
  const [deleteCallback, setDeleteCallback] = useState<((ids: number[], isPartialDelete?: boolean) => Promise<void>) | null>(null)

  const confirmBulkDelete = async (
    ids: number[], 
    threshold: number = 10, 
    deleteCallback: (ids: number[], isPartialDelete?: boolean) => Promise<void>,
    message?: string | ReactNode,
    isPartialDeleteParam?: boolean
  ) => {
    if (ids.length === 0) return

    // 部分削除フラグを設定
    setIsPartialDelete(isPartialDeleteParam || false)

    // 閾値以上の場合のみモーダル表示
    if (ids.length >= threshold) {
      setTargetIds(ids)
      setCustomMessage(message)
      setDeleteCallback(() => deleteCallback)
      setIsModalOpen(true)
      return
    }

    // 閾値未満は即座に削除
    await executeDelete(ids, deleteCallback, isPartialDeleteParam)
  }

  const executeDelete = async (ids: number[], deleteCallback: (ids: number[], isPartialDelete?: boolean) => Promise<void>, isPartialDeleteParam?: boolean) => {
    try {
      setIsDeleting(true)
      await deleteCallback(ids, isPartialDeleteParam)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirm = async () => {
    setIsModalOpen(false)
    if (deleteCallback) {
      await executeDelete(targetIds, deleteCallback, isPartialDelete)
    }
    setTargetIds([])
    setIsPartialDelete(false)
    setDeleteCallback(null)
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    setTargetIds([])
    setCustomMessage(undefined)
    setIsPartialDelete(false)
    setDeleteCallback(null)
  }

  return {
    isModalOpen,
    targetIds,
    isDeleting,
    customMessage,
    isPartialDelete,
    confirmBulkDelete,
    handleConfirm,
    handleCancel
  }
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  isLoading = false,
  variant = 'primary',
  icon = 'info',
  customIcon,
  position = 'center'
}: ConfirmationModalProps) {
  
  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      confirmButton: 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
    },
    warning: {
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300'
    },
    primary: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
    },
    secondary: {
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      titleColor: 'text-gray-900',
      confirmButton: 'bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300'
    }
  }

  const styles = variantStyles[variant]

  const renderIcon = () => {
    if (customIcon) {
      return customIcon
    }

    switch (icon) {
      case 'trash':
        return <TrashIcon className={`h-6 w-6 ${styles.iconColor}`} />
      case 'logout':
        return (
          <svg className={`h-6 w-6 ${styles.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
          </svg>
        )
      case 'save':
        return (
          <svg className={`h-6 w-6 ${styles.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={`h-6 w-6 ${styles.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg className={`h-6 w-6 ${styles.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        )
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" position={position}>
      <div className="text-center">
        {/* アイコン */}
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg} mb-4`}>
          {renderIcon()}
        </div>
        
        {/* タイトル */}
        <h3 className={`text-lg font-medium ${styles.titleColor} mb-2`}>
          {title}
        </h3>
        
        {/* メッセージ */}
        <div className="mb-6">
          {typeof message === 'string' ? (
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {message}
            </p>
          ) : (
            <div>{message}</div>
          )}
          {/* 削除処理中のタブ切り替え注意書き */}
          {(icon === 'trash' || variant === 'danger') && (
            <p className="text-xs text-gray-500 mt-2">
              ※削除中にタブを切り替えると処理が中断されます
            </p>
          )}
        </div>
        
        {/* ボタン */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2 ${styles.confirmButton}`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                処理中...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// 一括削除専用コンポーネント
interface BulkDeleteConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  count: number
  itemType: 'memo' | 'task'
  deleteType: 'normal' | 'permanent'
  isLoading?: boolean
  customMessage?: string
}

export function BulkDeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  count,
  itemType,
  deleteType,
  isLoading = false,
  customMessage
}: BulkDeleteConfirmationProps) {
  const itemTypeName = itemType === 'memo' ? 'メモ' : 'タスク'
  
  const title = '一括削除の確認'
  const message = customMessage || (deleteType === 'normal'
    ? `${count}件の${itemTypeName}を削除しますか？\n（ゴミ箱に移動されます）`
    : `${count}件の${itemTypeName}を完全に削除しますか？\n（復元できません）`)

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText="削除"
      cancelText="キャンセル"
      variant="danger"
      icon="trash"
      isLoading={isLoading}
    />
  )
}

// 単体削除専用コンポーネント
interface SingleDeleteConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemTitle: string
  itemType: 'memo' | 'task'
  deleteType: 'normal' | 'permanent'
  isLoading?: boolean
  position?: 'center' | 'right-panel'
}

export function SingleDeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  itemType,
  deleteType,
  isLoading = false,
  position = 'center'
}: SingleDeleteConfirmationProps) {
  const itemTypeName = itemType === 'memo' ? 'メモ' : 'タスク'
  
  const title = `${itemTypeName}削除の確認`
  const message = deleteType === 'normal'
    ? `「${itemTitle}」を削除しますか？\n（ゴミ箱に移動されます）`
    : `「${itemTitle}」を完全に削除しますか？\n（復元できません）`

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText="削除"
      cancelText="キャンセル"
      variant="danger"
      icon="trash"
      isLoading={isLoading}
      position={position}
    />
  )
}

export default ConfirmationModal