import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeleteNote, usePermanentDeleteNote } from "@/src/hooks/use-notes";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { notesApi } from "@/src/lib/api-client";
import { useAnimatedCounter } from "@/src/hooks/useAnimatedCounter";
import { calculateDeleteDuration } from "@/src/utils/deleteAnimation";

interface UseMemosBulkDeleteProps {
  activeTab: "normal" | "deleted";
  checkedMemos: Set<number>;
  checkedDeletedMemos: Set<number>;
  setCheckedMemos: (memos: Set<number>) => void;
  setCheckedDeletedMemos: (memos: Set<number>) => void;
  notes?: Memo[];
  deletedNotes?: DeletedMemo[];
  localMemos: Memo[];
  onMemoDelete?: (id: number) => void;
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>;
  setIsDeleting?: (isDeleting: boolean) => void;
  setIsLidOpen?: (isOpen: boolean) => void;
  viewMode?: 'list' | 'card';
}

export function useMemosBulkDelete({
  activeTab,
  checkedMemos,
  checkedDeletedMemos,
  setCheckedMemos,
  setCheckedDeletedMemos,
  notes,
  deletedNotes,
  localMemos,
  onMemoDelete,
  deleteButtonRef,
  setIsDeleting,
  setIsLidOpen,
  viewMode = 'list', // eslint-disable-line @typescript-eslint/no-unused-vars
}: UseMemosBulkDeleteProps) {
  const deleteNoteMutation = useDeleteNote();
  const permanentDeleteNoteMutation = usePermanentDeleteNote();
  const bulkDelete = useBulkDelete();
  const { getToken } = useAuth();
  
  // 自動更新なしの削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteNoteWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await notesApi.deleteNote(id, token || undefined);
      return response.json();
    },
    // onSuccessなし（自動更新しない）
  });
  
  // 自動更新なしの完全削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const permanentDeleteNoteWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await notesApi.permanentDeleteNote(id, token || undefined);
      return response.json();
    },
    // onSuccessなし（自動更新しない）
  });
  
  // タイマーIDを保持
  const timerRef = useRef<{ isDeleting?: NodeJS.Timeout; clearChecked?: NodeJS.Timeout }>({});
  
  // 部分削除中フラグ（自動クリーンアップを無効にするため）
  const [isPartialDeleting, setIsPartialDeleting] = useState(false);

  // チェック状態が変更されたらタイマーをクリア
  useEffect(() => {
    if (checkedMemos.size > 0) {
      // 新しい選択があったらタイマーをクリア
      if (timerRef.current.clearChecked) {
        clearTimeout(timerRef.current.clearChecked);
        timerRef.current.clearChecked = undefined;
      }
      if (timerRef.current.isDeleting) {
        clearTimeout(timerRef.current.isDeleting);
        timerRef.current.isDeleting = undefined;
      }
    }
  }, [checkedMemos]);

  // チェック状態のクリーンアップ - 削除されたメモのチェックを解除（部分削除中は無効）
  useEffect(() => {
    if (notes && !isPartialDeleting) {
      const allMemoIds = new Set([
        ...notes.map((m) => m.id),
        ...localMemos.map((m) => m.id),
      ]);
      const newCheckedMemos = new Set(
        Array.from(checkedMemos).filter((id) => allMemoIds.has(id))
      );
      if (newCheckedMemos.size !== checkedMemos.size) {
        setCheckedMemos(newCheckedMemos);
      }
    }
  }, [notes, localMemos, checkedMemos, setCheckedMemos, isPartialDeleting]);

  useEffect(() => {
    if (deletedNotes && !isPartialDeleting) {
      const deletedMemoIds = new Set(deletedNotes.map((m) => m.id));
      const newCheckedDeletedMemos = new Set(
        Array.from(checkedDeletedMemos).filter((id) => deletedMemoIds.has(id))
      );
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos);
      }
    }
  }, [deletedNotes, checkedDeletedMemos, setCheckedDeletedMemos, isPartialDeleting]);

  // 共通の削除処理関数
  const executeDeleteWithAnimation = async (ids: number[], isPartialDelete = false) => {
    // 部分削除の場合はフラグを設定
    if (isPartialDelete) {
      setIsPartialDeleting(true);
    }
    
    // 削除ボタンの位置を取得
    const buttonRect = deleteButtonRef?.current?.getBoundingClientRect();
    
    // console.log('✅ 削除処理開始:', { ids: ids.length, activeTab, hasButtonRect: !!buttonRect });
    
    // アニメーションが必要な場合（通常メモまたは削除済みメモ）
    if (buttonRect) {
      // console.log('🎬 処理開始:', { ids: ids.length });
      
      // 蓋を開く
      setIsLidOpen?.(true);
      
      // 30件以上は最初の30個だけアニメーション、残りは一括削除
      if (ids.length > 30) {
        // console.log('🎬➡️⚡ 混合削除モード:', { count: ids.length });
        
        // 最初の30個をアニメーション
        const animatedIds = ids.slice(0, 30);
        const bulkIds = ids.slice(30);
        
        // console.log('🎬 最初の30個のアニメーション:', { animated: animatedIds.length, bulk: bulkIds.length });
        const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation');
        
        animateBulkFadeOutCSS(animatedIds, async () => {
          // console.log('🎬 最初のアニメーション完了、一括削除開始:', { bulk: bulkIds.length, isPartialDelete });
          
          // 残りを一括でState更新
          for (const id of bulkIds) {
            if (activeTab === "normal" && onMemoDelete) {
              onMemoDelete(id);
            }
          }
          
          // チェック状態をクリア
          if (isPartialDelete) {
            if (activeTab === "normal") {
              const newCheckedMemos = new Set(checkedMemos);
              ids.forEach(id => newCheckedMemos.delete(id));
              setCheckedMemos(newCheckedMemos);
            } else {
              const newCheckedDeletedMemos = new Set(checkedDeletedMemos);
              ids.forEach(id => newCheckedDeletedMemos.delete(id));
              setCheckedDeletedMemos(newCheckedDeletedMemos);
            }
          } else {
            if (activeTab === "normal") {
              setCheckedMemos(new Set());
            } else {
              setCheckedDeletedMemos(new Set());
            }
          }
          
          // 蓋を閉じる
          setTimeout(() => {
            setIsLidOpen?.(false);
          }, 500);
          
          // 削除ボタンを非表示
          setTimeout(() => {
            if (setIsDeleting) {
              setIsDeleting(false);
            }
          }, 1000);
          
          // console.log('⚡ 混合削除完了:', { animated: animatedIds.length, bulk: bulkIds.length });
          
          // 部分削除フラグを解除
          if (isPartialDelete) {
            setTimeout(() => setIsPartialDeleting(false), 100);
          }
        }, 120, 'delete', async (id: number) => {
          // アニメーション付きアイテムの個別処理
          if (activeTab === "normal" && onMemoDelete) {
            onMemoDelete(id);
          }
          
          try {
            if (activeTab === "normal") {
              await deleteNoteMutation.mutateAsync(id);
            } else {
              await permanentDeleteNoteMutation.mutateAsync(id);
            }
          } catch (error: unknown) {
            if (!(error instanceof Error && error.message?.includes('404'))) {
              console.error(`アニメーション削除エラー (ID: ${id}):`, error);
            }
          }
        });
        
        // 残りのAPI処理をバックグラウンドで実行
        setTimeout(async () => {
          // console.log('🌐 残りのAPI処理開始:', { count: bulkIds.length });
          for (const id of bulkIds) {
            try {
              if (activeTab === "normal") {
                await deleteNoteMutation.mutateAsync(id);
              } else {
                await permanentDeleteNoteMutation.mutateAsync(id);
              }
            } catch (error: unknown) {
              if (!(error instanceof Error && error.message?.includes('404'))) {
                console.error(`一括削除エラー (ID: ${id}):`, error);
              }
            }
          }
          // console.log('🌐 残りのAPI処理完了:', { count: bulkIds.length });
        }, 1000); // アニメーション開始から1秒後
        
        return;
      }
      
      // 30件以下はアニメーション付き削除
      // console.log('🎬 アニメーション削除:', { count: ids.length });
      const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation');
      animateBulkFadeOutCSS(ids, async () => {
        // console.log('🎬 全アニメーション完了:', { ids: ids.length });
        
        // チェック状態をクリア（部分削除の場合は削除されたIDのみクリア）
        if (isPartialDelete) {
          if (activeTab === "normal") {
            const newCheckedMemos = new Set(checkedMemos);
            ids.forEach(id => newCheckedMemos.delete(id));
            setCheckedMemos(newCheckedMemos);
          } else {
            const newCheckedDeletedMemos = new Set(checkedDeletedMemos);
            ids.forEach(id => newCheckedDeletedMemos.delete(id));
            setCheckedDeletedMemos(newCheckedDeletedMemos);
          }
        } else {
          // 通常削除の場合は全クリア
          if (activeTab === "normal") {
            setCheckedMemos(new Set());
          } else {
            setCheckedDeletedMemos(new Set());
          }
        }
        
        // 500ms後に蓋を閉じる
        setTimeout(() => {
          setIsLidOpen?.(false);
        }, 500);
        
        // 削除ボタンを3秒後に非表示
        // console.log('⏰ タイマー設定:', { hasSetIsDeleting: !!setIsDeleting });
        timerRef.current.isDeleting = setTimeout(() => {
          // console.log('🚫 削除ボタン非表示 実行', { hasSetIsDeleting: !!setIsDeleting });
          if (setIsDeleting) {
            setIsDeleting(false);
          } else {
            console.error('❌ setIsDeletingが未定義');
          }
        }, 3000);
        
        // 個別APIで実行済みのため、ここでの一括API処理は不要
        // console.log('🎊 全アニメーション・API処理完了:', { ids: ids.length });
      }, 120, 'delete', async (id: number) => {
        // 各アイテムのアニメーション完了時に個別DOM操作 + API実行
        // console.log('🎯 個別アニメーション完了:', { id });
        if (activeTab === "normal" && onMemoDelete) {
          onMemoDelete(id);
          // console.log('🔄 個別State更新完了:', { id });
          
          // 個別API実行（自動更新あり）
          try {
            await deleteNoteMutation.mutateAsync(id);
            // console.log('🌐 個別API完了:', { id });
          } catch (error: unknown) {
            if (!(error instanceof Error && error.message?.includes('404'))) {
              console.error(`個別API削除エラー (ID: ${id}):`, error);
            }
          }
        } else if (activeTab === "deleted") {
          // 削除済みアイテムの完全削除
          try {
            await permanentDeleteNoteMutation.mutateAsync(id);
            // console.log('🌐 個別完全削除API完了:', { id });
          } catch (error: unknown) {
            if (!(error instanceof Error && error.message?.includes('404'))) {
              console.error(`個別完全削除エラー (ID: ${id}):`, error);
            }
          }
        }
      });
    } else {
      // アニメーションなしの場合は即座に処理
      // 削除済みアイテムの完全削除は即座にState更新
      if (activeTab === "normal" && onMemoDelete) {
        for (const id of ids) {
          onMemoDelete(id);
        }
      }
      // 選択状態をクリア (UI即座更新) - 部分削除の場合は削除したIDのみ除外
      if (isPartialDelete) {
        if (activeTab === "normal") {
          const newCheckedMemos = new Set(checkedMemos);
          ids.forEach(id => newCheckedMemos.delete(id));
          setCheckedMemos(newCheckedMemos);
        } else {
          const newCheckedDeletedMemos = new Set(checkedDeletedMemos);
          ids.forEach(id => newCheckedDeletedMemos.delete(id));
          setCheckedDeletedMemos(newCheckedDeletedMemos);
        }
      } else {
        if (activeTab === "normal") {
          setCheckedMemos(new Set());
        } else {
          setCheckedDeletedMemos(new Set());
        }
      }
      
      // API処理を即座に実行
      for (const id of ids) {
        try {
          if (activeTab === "normal") {
            await deleteNoteMutation.mutateAsync(id);
          } else {
            await permanentDeleteNoteMutation.mutateAsync(id);
          }
        } catch (error) {
          console.error(`メモ削除エラー (ID: ${id}):`, error);
        }
      }
      
      // 部分削除フラグを解除
      if (isPartialDelete) {
        setTimeout(() => setIsPartialDeleting(false), 100);
      }
    }
  };

  const handleBulkDelete = async () => {
    const targetIds =
      activeTab === "normal"
        ? Array.from(checkedMemos)
        : Array.from(checkedDeletedMemos);

    // 削除済みメモの場合は1件から、通常メモの場合は10件からモーダル表示
    const threshold = activeTab === "deleted" ? 1 : 10;
    
    // 100件超えの場合は最初の100件のみ処理
    const actualTargetIds = targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds;
    const isLimitedDelete = targetIds.length > 100;

    // 削除ボタンを押した瞬間に蓋を開く
    setIsDeleting?.(true);
    setIsLidOpen?.(true);

    
    if (isLimitedDelete) {
      // 100件制限のモーダル表示
      await bulkDelete.confirmBulkDelete(
        actualTargetIds, 
        0, // 即座にモーダル表示
        async (ids: number[], isPartialDelete = false) => {
          // カウンターアニメーション開始
          animatedCounter.startAnimation();
          await executeDeleteWithAnimation(ids, isPartialDelete);
        },
        `${targetIds.length}件選択されています。\n一度に削除できる上限は100件です。`,
        true // isPartialDelete
      );
    } else {
      // 通常の確認モーダル
      await bulkDelete.confirmBulkDelete(actualTargetIds, threshold, async (ids: number[]) => {
        // カウンターアニメーション開始
        animatedCounter.startAnimation();
        await executeDeleteWithAnimation(ids);
      });
    }
  };

  const DeleteModal: React.FC = () => (
    <BulkDeleteConfirmation
      isOpen={bulkDelete.isModalOpen}
      onClose={() => {
        // console.log('❌ キャンセル');
        // キャンセル時に蓋を閉じる
        setIsDeleting?.(false);
        // カウンターアニメーション停止
        animatedCounter.stopAnimation();
        setTimeout(() => {
          setIsLidOpen?.(false);
        }, 300);
        bulkDelete.handleCancel();
      }}
      onConfirm={async () => {
        await bulkDelete.handleConfirm();
      }}
      count={bulkDelete.targetIds.length}
      itemType="memo"
      deleteType={activeTab === "normal" ? "normal" : "permanent"}
      isLoading={bulkDelete.isDeleting}
      customMessage={bulkDelete.customMessage}
    />
  );

  // アニメーション付きカウンター
  const currentDeleteCount = activeTab === "normal" ? checkedMemos.size : checkedDeletedMemos.size;
  
  // 100件制限の場合の残りアイテム数を計算
  const remainingAfterDelete = currentDeleteCount > 100 ? currentDeleteCount - 100 : 0;
  
  const animatedCounter = useAnimatedCounter({
    totalItems: currentDeleteCount,
    remainingItems: remainingAfterDelete, // 100件制限の場合は残り、それ以外は0
    animationDuration: calculateDeleteDuration(Math.min(currentDeleteCount, 100)), // 実際に削除される数で計算
    updateInterval: 50, // 50ms でより滑らか
    onComplete: () => {
      // アニメーション完了
    }
  });
  

  return {
    handleBulkDelete,
    DeleteModal,
    // アニメーション付きカウンター
    animatedDeleteCount: animatedCounter.currentCount,
    isCounterAnimating: animatedCounter.isAnimating,
    startCounterAnimation: () => animatedCounter.startAnimation(),
    stopCounterAnimation: () => animatedCounter.stopAnimation(),
  };
}
