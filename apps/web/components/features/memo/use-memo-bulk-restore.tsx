import { useEffect } from 'react'
import { useRestoreNote } from '@/src/hooks/use-notes'
import { useBulkDelete, BulkRestoreConfirmation } from '@/components/ui/modals'
// import { animateItemsRestoreFadeOutCSS } from '@/src/utils/deleteAnimation'
import type { DeletedMemo } from '@/src/types/memo'
import React from 'react'
import { useAnimatedCounter } from '@/src/hooks/useAnimatedCounter'
import { calculateDeleteDuration } from '@/src/utils/deleteAnimation'

interface UseMemosBulkRestoreProps {
  checkedDeletedMemos: Set<number>
  setCheckedDeletedMemos: (memos: Set<number>) => void
  deletedNotes?: DeletedMemo[]
  onDeletedMemoRestore?: (id: number) => void
}

export function useMemosBulkRestore({
  checkedDeletedMemos,
  setCheckedDeletedMemos,
  deletedNotes,
  onDeletedMemoRestore
}: UseMemosBulkRestoreProps) {
  const restoreNoteMutation = useRestoreNote()
  const bulkRestore = useBulkDelete() // 削除と同じモーダルロジックを使用

  // チェック状態のクリーンアップ - 復元されたメモのチェックを解除
  useEffect(() => {
    if (deletedNotes) {
      const deletedMemoIds = new Set(deletedNotes.map(m => m.id))
      const newCheckedDeletedMemos = new Set(Array.from(checkedDeletedMemos).filter(id => deletedMemoIds.has(id)))
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos)
      }
    }
  }, [deletedNotes, checkedDeletedMemos, setCheckedDeletedMemos])

  // 共通の復元処理関数
  const executeRestoreWithAnimation = async (ids: number[]) => {
    console.log('✅ 復元処理開始:', { ids: ids.length });
    
    // 30件以上は最初の30個だけアニメーション、残りは一括復元
    if (ids.length > 30) {
      console.log('🎬➡️⚡ 混合復元モード:', { count: ids.length });
      
      // 最初の30個をアニメーション
      const animatedIds = ids.slice(0, 30);
      const bulkIds = ids.slice(30);
      
      console.log('🎬 最初の30個のアニメーション:', { animated: animatedIds.length, bulk: bulkIds.length });
      
      const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation');
      animateBulkFadeOutCSS(animatedIds, async () => {
        console.log('🎬 最初のアニメーション完了、一括復元開始:', { bulk: bulkIds.length });
        
        // 残りを一括でState更新
        for (const id of bulkIds) {
          onDeletedMemoRestore?.(id);
        }
        
        // 選択状態をクリア（削除側と同じ分割処理）
        const newCheckedDeletedMemos = new Set(checkedDeletedMemos);
        ids.forEach(id => newCheckedDeletedMemos.delete(id));
        setCheckedDeletedMemos(newCheckedDeletedMemos);
        
        console.log('⚡ 混合復元完了:', { animated: animatedIds.length, bulk: bulkIds.length });
      }, 120, 'restore', async (id: number) => {
        // 各アニメーションアイテムの個別処理（削除側と同じパターン）
        console.log('🎯 個別復元アニメーション完了:', { id });
        onDeletedMemoRestore?.(id);
        
        try {
          await restoreNoteMutation.mutateAsync(id);
          console.log('🌐 個別復元API完了:', { id });
        } catch (error) {
          console.error(`個別復元エラー (ID: ${id}):`, error);
        }
      });
      
      // 残りのAPI処理をバックグラウンドで実行
      setTimeout(async () => {
        console.log('🌐 残りのAPI処理開始:', { count: bulkIds.length });
        for (const id of bulkIds) {
          try {
            await restoreNoteMutation.mutateAsync(id);
          } catch (error) {
            console.error(`一括復元エラー (ID: ${id}):`, error);
          }
        }
        console.log('🌐 残りのAPI処理完了:', { count: bulkIds.length });
      }, 1000);
      
      return;
    }
    
    // 30件以下はアニメーション付き復元
    console.log('🎬 アニメーション復元:', { count: ids.length });
    const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation');
    animateBulkFadeOutCSS(ids, async () => {
      console.log('🌟 全アニメーション完了:', { ids: ids.length });
      
      // 選択状態をクリア
      setCheckedDeletedMemos(new Set());
    }, 120, 'restore', async (id: number) => {
      // 各アイテムのアニメーション完了時に個別DOM操作 + API実行
      console.log('🎯 個別復元アニメーション完了:', { id });
      onDeletedMemoRestore?.(id);
      
      try {
        await restoreNoteMutation.mutateAsync(id);
        console.log('🌐 個別復元API完了:', { id });
      } catch (error) {
        console.error(`復元エラー (ID: ${id}):`, error);
      }
    });
  };

  const handleBulkRestore = async () => {
    const targetIds = Array.from(checkedDeletedMemos)

    // メモの場合は1件からモーダル表示
    const threshold = 1

    console.log('🔄 復元開始:', { targetIds: targetIds.length });
    
    await bulkRestore.confirmBulkDelete(targetIds, threshold, async (ids: number[]) => {
      // カウンターアニメーション開始
      animatedCounter.startAnimation();
      await executeRestoreWithAnimation(ids);
    })
  }

  const RestoreModal: React.FC = () => (
    <BulkRestoreConfirmation
      isOpen={bulkRestore.isModalOpen}
      onClose={() => {
        // カウンターアニメーション停止
        animatedCounter.stopAnimation();
        bulkRestore.handleCancel();
      }}
      onConfirm={async () => {
        console.log('👍 モーダル復元確認ボタン押下');
        await bulkRestore.handleConfirm(executeRestoreWithAnimation);
      }}
      count={bulkRestore.targetIds.length}
      itemType="memo"
      isLoading={bulkRestore.isDeleting}
    />
  );

  // アニメーション付きカウンター（復元処理用）
  const animatedCounter = useAnimatedCounter({
    totalItems: checkedDeletedMemos.size,
    remainingItems: 0, // 復元後は削除済み一覧から0になる
    animationDuration: calculateDeleteDuration(checkedDeletedMemos.size),
    updateInterval: 200,
    onComplete: () => {
      console.log('🎊 復元カウンターアニメーション完了');
    }
  });

  return {
    handleBulkRestore,
    RestoreModal,
    // アニメーション付きカウンター
    animatedRestoreCount: animatedCounter.currentCount,
    isRestoreCounterAnimating: animatedCounter.isAnimating,
    startRestoreCounterAnimation: animatedCounter.startAnimation,
    stopRestoreCounterAnimation: animatedCounter.stopAnimation,
  }
}