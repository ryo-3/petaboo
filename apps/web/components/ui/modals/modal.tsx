'use client'

import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  position?: 'center' | 'right-panel' | 'left-panel'
  parentElement?: HTMLElement
  maxHeight?: string
}

function Modal({ isOpen, onClose, title, children, maxWidth = 'md', position = 'center', maxHeight }: ModalProps) {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      // モーダル表示中はスクロールを無効化
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  }

  const containerClasses = position === 'center'
    ? "fixed inset-0 z-50 flex items-center justify-center"
    : position === 'left-panel'
    ? "absolute inset-0 z-50 flex items-center justify-start pl-8"
    : "absolute inset-0 z-50 flex items-center justify-end pr-8"; // right-panel

  const overlayClasses = position === 'center'
    ? "absolute inset-0 bg-black bg-opacity-50 transition-opacity"
    : "absolute inset-0 bg-black bg-opacity-20 transition-opacity";

  return (
    <div className={containerClasses}>
      {/* オーバーレイ */}
      <div 
        className={overlayClasses}
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div 
        className={`relative bg-white rounded-lg shadow-xl ${maxWidthClasses[maxWidth]} w-full mx-4 transform transition-transform`}
        style={maxHeight ? { maxHeight } : {}}
      >
        {/* ヘッダー */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 modal-header">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* コンテンツ */}
        <div className="p-4 modal-content">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal