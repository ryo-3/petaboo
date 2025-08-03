import { useState } from 'react'
import { useRestoreMemo } from '@/src/hooks/use-memos'
import type { DeletedMemo } from '@/src/types/memo'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { memosApi } from '@/src/lib/api-client'

interface UseDeletedMemoActionsProps {
  memo: DeletedMemo
  onClose: () => void
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void
}

export function useDeletedMemoActions({ memo, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext }: UseDeletedMemoActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isLocalRestoring, setIsLocalRestoring] = useState(false)
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteNote = useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken()
      const response = await memosApi.permanentDeleteNote(originalId, token || undefined)
      return response.json()
    },
    onSuccess: async () => {
      // 完全削除後に削除済みメモリストを再取得
      await queryClient.invalidateQueries({ queryKey: ["deleted-memos"] })
      
      // 少し遅延してから次のメモ選択機能を使用（React Queryの状態更新を待つ）
      setTimeout(() => {
        if (onDeleteAndSelectNext) {
          onDeleteAndSelectNext(memo)
        } else {
          onClose()
        }
      }, 100);
    },
  })
  
  const restoreNote = useRestoreMemo()

  const handlePermanentDelete = async () => {
    try {
      setShowDeleteModal(false)
      
      // エディターコンテンツをゴミ箱に吸い込むアニメーション
      const editorArea = document.querySelector('[data-memo-editor]') as HTMLElement;
      const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
      
      if (editorArea && rightTrashButton) {
        const { animateEditorContentToTrashCSS } = await import('@/src/utils/deleteAnimation');
        animateEditorContentToTrashCSS(editorArea, rightTrashButton, async () => {
          // アニメーション完了後の処理
          try {
            // API実行（onSuccessで次選択とキャッシュ更新が実行される）
            await permanentDeleteNote.mutateAsync(memo.originalId)
            
            // 蓋を閉じる
            setTimeout(() => {
              (window as Window & { closeDeletingLid?: () => void }).closeDeletingLid?.();
            }, 500);
          } catch {
            alert('完全削除に失敗しました。')
          }
        });
      } else {
        // アニメーション要素がない場合は通常の処理
        // API実行（onSuccessで次選択とキャッシュ更新が実行される）
        await permanentDeleteNote.mutateAsync(memo.originalId)
        
        setTimeout(() => {
          (window as Window & { closeDeletingLid?: () => void }).closeDeletingLid?.();
        }, 500);
      }
    } catch {
      console.log('❌ 削除処理失敗')
      alert('完全削除に失敗しました。')
    }
  }

  const handleRestore = async () => {
    try {
      setIsLocalRestoring(true)
      // API実行
      await restoreNote.mutateAsync(memo.originalId)
      
      // 復元完了後、すぐにUIを更新
      setIsLocalRestoring(false)
      if (onRestoreAndSelectNext) {
        onRestoreAndSelectNext(memo)
      } else {
        onClose()
      }
    } catch {
      setIsLocalRestoring(false)
      alert('復元に失敗しました。')
    }
  }

  const showDeleteConfirmation = () => {
    setShowDeleteModal(true)
  }

  const hideDeleteConfirmation = () => {
    setShowDeleteModal(false)
    // キャンセル時も蓋を閉じる
    setTimeout(() => {
      (window as Window & { closeDeletingLid?: () => void }).closeDeletingLid?.();
    }, 100);
  }

  return {
    // Actions
    handlePermanentDelete,
    handleRestore,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    
    // Modal state
    showDeleteModal,
    
    // Loading states
    isDeleting: permanentDeleteNote.isPending,
    isRestoring: restoreNote.isPending || isLocalRestoring
  }
}