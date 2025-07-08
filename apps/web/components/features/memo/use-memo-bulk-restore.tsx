import { useEffect } from 'react'
import { useRestoreNote } from '@/src/hooks/use-notes'
import { useBulkDelete, BulkRestoreConfirmation } from '@/components/ui/modals'
import type { DeletedMemo } from '@/src/types/memo'
import React from 'react'
import { useBulkAnimation } from '@/src/hooks/use-bulk-animation'
import { executeWithAnimation } from '@/src/utils/bulkAnimationUtils'

interface UseMemosBulkRestoreProps {
  checkedDeletedMemos: Set<number>
  setCheckedDeletedMemos: (memos: Set<number>) => void
  deletedNotes?: DeletedMemo[]
  onDeletedMemoRestore?: (id: number) => void
  restoreButtonRef?: React.RefObject<HTMLButtonElement | null>
  setIsRestoring?: (isRestoring: boolean) => void
  setIsLidOpen?: (isOpen: boolean) => void
}

export function useMemosBulkRestore({
  checkedDeletedMemos,
  setCheckedDeletedMemos,
  deletedNotes,
  onDeletedMemoRestore,
  restoreButtonRef,
  setIsRestoring,
  setIsLidOpen
}: UseMemosBulkRestoreProps) {
  const restoreNoteMutation = useRestoreNote()
  const bulkRestore = useBulkDelete() // 削除と同じモーダルロジックを使用
  
  // 共通のアニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: new Set(),
    checkedDeletedItems: checkedDeletedMemos,
  })

  // チェック状態のクリーンアップ - 復元されたメモのチェックを解除（部分復元中は無効）
  useEffect(() => {
    if (deletedNotes && !bulkAnimation.isPartialProcessing) {
      const deletedMemoIds = new Set(deletedNotes.map(m => m.id))
      const newCheckedDeletedMemos = new Set(Array.from(checkedDeletedMemos).filter(id => deletedMemoIds.has(id)))
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos)
      }
    }
  }, [deletedNotes, checkedDeletedMemos, setCheckedDeletedMemos, bulkAnimation.isPartialProcessing])

  // 共通の復元処理関数（共通ロジック使用）
  const executeRestoreWithAnimation = async (
    ids: number[],
    isPartialRestore = false,
    originalTotalCount?: number
  ) => {
    const onStateUpdate = (id: number) => {
      if (onDeletedMemoRestore) {
        onDeletedMemoRestore(id)
      }
    }

    const onCheckStateUpdate = (ids: number[], isPartial: boolean) => {
      if (isPartial) {
        const newCheckedDeletedMemos = new Set(checkedDeletedMemos)
        ids.forEach((id) => newCheckedDeletedMemos.delete(id))
        setCheckedDeletedMemos(newCheckedDeletedMemos)
      } else {
        setCheckedDeletedMemos(new Set())
      }
    }

    const onApiCall = async (id: number) => {
      await restoreNoteMutation.mutateAsync(id)
    }

    await executeWithAnimation({
      ids,
      isPartial: isPartialRestore,
      originalTotalCount,
      buttonRef: restoreButtonRef,
      dataAttribute: "data-memo-id",
      onStateUpdate,
      onCheckStateUpdate,
      onApiCall,
      initializeAnimation: bulkAnimation.initializeAnimation,
      startCountdown: bulkAnimation.startCountdown,
      finalizeAnimation: bulkAnimation.finalizeAnimation,
      setIsProcessing: setIsRestoring,
      setIsLidOpen,
    })
  }

  const handleBulkRestore = async () => {
    const rawTargetIds = Array.from(checkedDeletedMemos)

    // DOM順序でソート（個別チェック変更でSet順序が崩れるため）
    const { getMemoDisplayOrder } = await import('@/src/utils/domUtils');
    const domOrder = getMemoDisplayOrder();
    const targetIds = rawTargetIds.sort((a, b) => {
      const aIndex = domOrder.indexOf(a);
      const bIndex = domOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // 復元の場合は1件からモーダル表示
    const threshold = 1
    
    // 100件超えの場合は最初の100件のみ処理（DOM順序での最初の100件）
    const actualTargetIds = targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds
    const isLimitedRestore = targetIds.length > 100

    // 復元ボタンを押した瞬間の状態設定（カウンター維持）
    bulkAnimation.setModalState(setIsRestoring, setIsLidOpen)

    if (isLimitedRestore) {
      // 100件制限のモーダル表示
      await bulkRestore.confirmBulkDelete(
        actualTargetIds, 
        0, // 即座にモーダル表示
        async (ids: number[], isPartialRestore = false) => {
          await executeRestoreWithAnimation(ids, isPartialRestore, targetIds.length)
        },
        `${targetIds.length}件選択されています。\n一度に復元できる上限は100件です。`,
        true // isPartialRestore
      )
    } else {
      // 通常の確認モーダル
      await bulkRestore.confirmBulkDelete(actualTargetIds, threshold, async (ids: number[]) => {
        await executeRestoreWithAnimation(ids)
      })
    }
  }

  const RestoreModal: React.FC = () => (
    <BulkRestoreConfirmation
      isOpen={bulkRestore.isModalOpen}
      onClose={() => {
        bulkAnimation.handleModalCancel(setIsRestoring, setIsLidOpen)
        bulkRestore.handleCancel()
      }}
      onConfirm={async () => {
        await bulkRestore.handleConfirm()
      }}
      count={bulkRestore.targetIds.length}
      itemType="memo"
      isLoading={bulkRestore.isDeleting}
      customMessage={bulkRestore.customMessage}
    />
  )

  // 現在の復元カウント（通常時は実際のサイズ、復元中はアニメーション用）
  const currentRestoreCount = checkedDeletedMemos.size
  const finalDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : currentRestoreCount

  // デバッグログ
  // console.log('🔄 復元カウンター状態:', {
  //   isCountingActive: bulkAnimation.isCountingActive,
  //   displayCount: bulkAnimation.displayCount,
  //   currentRestoreCount,
  //   finalDisplayCount,
  //   checkedDeletedMemosSize: checkedDeletedMemos.size
  // })

  return {
    handleBulkRestore,
    RestoreModal,
    // カウンターアクティブ時はdisplayCount、それ以外は実際のカウント
    currentDisplayCount: finalDisplayCount,
    // 復元モーダルの状態
    isRestoreModalOpen: bulkRestore.isModalOpen,
  }
}