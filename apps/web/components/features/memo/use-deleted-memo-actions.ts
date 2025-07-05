import { useState } from 'react'
import { useRestoreNote } from '@/src/hooks/use-notes'
import type { DeletedMemo } from '@/src/types/memo'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { notesApi } from '@/src/lib/api-client'

interface UseDeletedMemoActionsProps {
  memo: DeletedMemo
  onClose: () => void
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void
}

export function useDeletedMemoActions({ memo, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext }: UseDeletedMemoActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteNote = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      const response = await notesApi.permanentDeleteNote(id, token || undefined)
      return response.json()
    },
    onSuccess: async () => {
      // 完全削除後に削除済みメモリストを再取得
      await queryClient.invalidateQueries({ queryKey: ["deleted-notes"] })
      
      // キャッシュ更新後に次のメモ選択機能を使用
      if (onDeleteAndSelectNext) {
        onDeleteAndSelectNext(memo)
      } else {
        onClose()
      }
    },
  })
  
  const restoreNote = useRestoreNote()

  const handlePermanentDelete = async () => {
    try {
      setShowDeleteModal(false)
      
      // エディターコンテンツをゴミ箱に吸い込むアニメーション
      const editorArea = document.querySelector('[data-memo-editor]') as HTMLElement;
      const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
      
      if (editorArea && rightTrashButton) {
        const { animateEditorContentToTrash } = await import('@/src/utils/deleteAnimation');
        animateEditorContentToTrash(editorArea, rightTrashButton, async () => {
          // アニメーション完了後の処理
          try {
            // API実行（onSuccessで次選択とキャッシュ更新が実行される）
            await permanentDeleteNote.mutateAsync(memo.id)
            
            // 蓋を閉じる
            setTimeout(() => {
              (window as any).closeDeletingLid?.();
            }, 500);
          } catch (error) {
            console.error('完全削除に失敗しました:', error)
            alert('完全削除に失敗しました。')
          }
        });
      } else {
        // アニメーション要素がない場合は通常の処理
        // API実行（onSuccessで次選択とキャッシュ更新が実行される）
        await permanentDeleteNote.mutateAsync(memo.id)
        
        setTimeout(() => {
          (window as any).closeDeletingLid?.();
        }, 500);
      }
    } catch (error) {
      console.error('完全削除に失敗しました:', error)
      alert('完全削除に失敗しました。')
    }
  }

  const handleRestore = async () => {
    try {
      console.log('復元ボタンクリック:', { memoId: memo.id, hasCallback: !!onRestoreAndSelectNext });
      
      // UIを先に更新
      if (onRestoreAndSelectNext) {
        onRestoreAndSelectNext(memo)
      } else {
        onClose()
      }
      
      // その後APIを実行
      await restoreNote.mutateAsync(memo.id)
    } catch (error) {
      console.error('復元に失敗しました:', error)
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
      (window as any).closeDeletingLid?.();
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
    isRestoring: restoreNote.isPending
  }
}