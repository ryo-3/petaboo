import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeleteNote, usePermanentDeleteNote } from "@/src/hooks/use-notes";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { notesApi } from "@/src/lib/api-client";
import { DELETE_ANIMATION_INTERVAL } from "@/src/utils/deleteAnimation";

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
  
  // シンプルなカウンター
  const [displayCount, setDisplayCount] = useState(0);
  const [isCountingActive, setIsCountingActive] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deletedCount, setDeletedCount] = useState(0); // 削除済み件数
  

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
  const executeDeleteWithAnimation = async (ids: number[], isPartialDelete = false, originalTotalCount?: number) => {
    // 実際に削除するアイテム数を記録
    const actualDeleteCount = ids.length;
    // 元々選択されていた総数（部分削除の場合）
    const displayTotalCount = originalTotalCount || actualDeleteCount;
    // 部分削除の場合はフラグを設定
    if (isPartialDelete) {
      setIsPartialDeleting(true);
    }
    
    // 削除ボタンの位置を取得
    const buttonRect = deleteButtonRef?.current?.getBoundingClientRect();
    
    // アニメーションが必要な場合（通常メモまたは削除済みメモ）
    if (buttonRect) {
      // 蓋を開く
      setIsLidOpen?.(true);
      
      // 削除開始時はカウンター無効（99+表示継続）
      setDisplayCount(0);
      setIsCountingActive(false);
      setDeletedCount(0); // 削除カウントリセット
      
      const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation');
      
      const startTime = Date.now();
      console.log(`⏱️ アニメーション開始: ${startTime} (100件 = 予想8.2秒)`);
      
      // カウントダウン対象の判定と開始タイミング計算
      const remainingCountAfterLimit = displayTotalCount - ids.length;
      
      // カウントダウンが必要な場合（99以下になる場合）
      if (remainingCountAfterLimit <= 99) {
        // カウンター開始数値を決定（99以下の場合は実際の開始数値）
        const startCount = Math.min(displayTotalCount, 99);
        const itemsUntilStart = displayTotalCount - startCount;
        const delayUntilStart = itemsUntilStart * DELETE_ANIMATION_INTERVAL;
        
        setTimeout(() => {
          console.log(`🎯 カウンター開始: 残り${startCount}個`);
          
          // カウンターを開始数値から段階的に減らす
          let currentCount = startCount;
          const targetCount = remainingCountAfterLimit;
          const decrementInterval = DELETE_ANIMATION_INTERVAL; // 80msごとに減少（アニメーションと同期）
          
          // 最初の数値を設定してからカウンター開始（ちらつき防止）
          setDisplayCount(startCount);
          setIsCountingActive(true);
          
          const counterTimer = setInterval(() => {
            if (currentCount <= targetCount) {
              clearInterval(counterTimer);
              setDisplayCount(targetCount);
              console.log(`🏁 カウンター終了: 残り${targetCount}個`);
            } else {
              currentCount--;
              setDisplayCount(currentCount);
            }
          }, decrementInterval);
        }, delayUntilStart);
      }
      
      animateBulkFadeOutCSS(ids, async () => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`🏁 アニメーション完了: ${endTime} (実際: ${duration}秒)`);
        // 全アニメーション完了後に一括State更新
        
        // カウンター停止（これ以上のコールバック実行を無効化）
        setIsCountingActive(false);
        
        // 一括State更新（DOM削除）
        if (activeTab === "normal" && onMemoDelete) {
          ids.forEach(id => onMemoDelete(id));
        }
        
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
        timerRef.current.isDeleting = setTimeout(() => {
          if (setIsDeleting) {
            setIsDeleting(false);
          } else {
            console.error('❌ setIsDeletingが未定義');
          }
        }, 3000);
        
        // API実行は並列でバックグラウンド処理
        setTimeout(async () => {
          const apiPromises = ids.map(async (id) => {
            try {
              if (activeTab === "normal") {
                await deleteNoteMutation.mutateAsync(id);
              } else {
                await permanentDeleteNoteMutation.mutateAsync(id);
              }
            } catch (error: unknown) {
              if (!(error instanceof Error && error.message?.includes('404'))) {
                console.error(`API削除エラー (ID: ${id}):`, error);
              }
            }
          });
          
          await Promise.all(apiPromises);
        }, 100);
      }, DELETE_ANIMATION_INTERVAL, 'delete');
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
          await executeDeleteWithAnimation(ids, isPartialDelete, targetIds.length);
        },
        `${targetIds.length}件選択されています。\n一度に削除できる上限は100件です。`,
        true // isPartialDelete
      );
    } else {
      // 通常の確認モーダル
      await bulkDelete.confirmBulkDelete(actualTargetIds, threshold, async (ids: number[]) => {
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

  // 現在の削除カウント（通常時は実際のサイズ、削除中はアニメーション用）
  const currentDeleteCount = activeTab === "normal" ? checkedMemos.size : checkedDeletedMemos.size;
  

  return {
    handleBulkDelete,
    DeleteModal,
    // カウンターアクティブ時はdisplayCount、それ以外は実際のカウント
    currentDisplayCount: isCountingActive ? displayCount : currentDeleteCount,
  };
}
