'use client'

import TrashIcon from '../icons/trash-icon'
import Modal from './modal'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  variant?: 'danger' | 'warning'
}

function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '削除',
  cancelText = 'キャンセル',
  isLoading = false,
  variant = 'danger'
}: DeleteConfirmationModalProps) {
  
  const variantStyles = {
    danger: {
      icon: 'text-red-600',
      confirmButton: 'bg-red-600 hover:bg-red-700 disabled:bg-red-300',
      titleColor: 'text-red-900'
    },
    warning: {
      icon: 'text-yellow-600',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300',
      titleColor: 'text-yellow-900'
    }
  }

  const styles = variantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="text-center">
        {/* アイコン */}
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4`}>
          <TrashIcon className={`h-6 w-6 ${styles.icon}`} />
        </div>
        
        {/* タイトル */}
        <h3 className={`text-lg font-medium ${styles.titleColor} mb-2`}>
          {title}
        </h3>
        
        {/* メッセージ */}
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>
        
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

export default DeleteConfirmationModal