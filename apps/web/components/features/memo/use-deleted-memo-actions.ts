import { useState } from "react";
import { useRestoreMemo } from "@/src/hooks/use-memos";
import type { DeletedMemo } from "@/src/types/memo";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { memosApi } from "@/src/lib/api-client";

interface UseDeletedMemoActionsProps {
  memo: DeletedMemo | null;
  onClose: () => void;
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  onAnimationChange?: (isAnimating: boolean) => void;
  teamMode?: boolean;
  teamId?: number;
  boardId?: number;
}

export function useDeletedMemoActions({
  memo,
  onClose,
  onDeleteAndSelectNext,
  onRestoreAndSelectNext,
  onAnimationChange,
  teamMode = false,
  teamId,
  boardId,
}: UseDeletedMemoActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLocalRestoring, setIsLocalRestoring] = useState(false);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteNote = useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームモード: チーム用完全削除API
        const response = await memosApi.permanentDeleteTeamMemo(
          teamId,
          originalId,
          token || undefined,
        );
        return response.json();
      } else {
        // 個人モード: 個人用完全削除API
        const response = await memosApi.permanentDeleteNote(
          originalId,
          token || undefined,
        );
        return response.json();
      }
    },
    onError: (error) => {
      console.error("permanentDeleteNote ミューテーションエラー:", error);
    },
    onSuccess: async () => {
      console.log(
        `✅ 完全削除成功: memo.originalId=${memo?.originalId}, teamMode=${teamMode}`,
      );
      // キャッシュを手動更新（削除されたアイテムをすぐに除去）
      if (teamMode && teamId) {
        // チームモード: チーム削除済みメモキャッシュを更新
        console.log(
          `🔄 チーム削除済みメモキャッシュ更新: teamId=${teamId}, originalId=${memo?.originalId}`,
        );
        queryClient.setQueryData(
          ["team-deleted-memos", teamId],
          (oldDeletedMemos: DeletedMemo[] | undefined) => {
            console.log(
              `📊 更新前チーム削除済みメモ数:`,
              oldDeletedMemos?.length || 0,
            );
            if (!oldDeletedMemos) return [];
            const filteredMemos = oldDeletedMemos.filter(
              (m) => memo && m.originalId !== memo.originalId,
            );
            console.log(`📊 更新後チーム削除済みメモ数:`, filteredMemos.length);
            return filteredMemos;
          },
        );
      } else {
        // 個人モード: 個人削除済みメモキャッシュを更新
        console.log(
          `🔄 個人削除済みメモキャッシュ更新: originalId=${memo?.originalId}`,
        );
        queryClient.setQueryData(
          ["deletedMemos"],
          (oldDeletedMemos: DeletedMemo[] | undefined) => {
            console.log(
              `📊 更新前個人削除済みメモ数:`,
              oldDeletedMemos?.length || 0,
            );
            if (!oldDeletedMemos) return [];
            const filteredMemos = oldDeletedMemos.filter(
              (m) => memo && m.originalId !== memo.originalId,
            );
            console.log(`📊 更新後個人削除済みメモ数:`, filteredMemos.length);
            return filteredMemos;
          },
        );
      }

      // ボード固有の削除済みアイテムキャッシュも手動更新（teamIdを文字列に統一）
      const boardDeletedItemsQueryKey =
        teamMode && teamId && boardId
          ? ["team-board-deleted-items", teamId.toString(), boardId]
          : ["board-deleted-items", boardId];

      console.log(
        `🔄 ボード削除済みアイテムキャッシュ更新: queryKey=`,
        boardDeletedItemsQueryKey,
      );

      // 削除前にキャッシュの存在状況を詳しく調査
      console.log(`🔍 削除前キャッシュ調査開始`);
      const allQueries = queryClient.getQueryCache().getAll();
      const relevantQueries = allQueries.filter((q) => {
        const key = q.queryKey as string[];
        return (
          key[0] === "team-board-deleted-items" ||
          key[0] === "board-deleted-items"
        );
      });
      console.log(
        `🔍 全削除済みアイテム関連クエリ:`,
        relevantQueries.map((q) => ({
          queryKey: q.queryKey,
          state: q.state.status,
          hasData: !!q.state.data,
          dataType: typeof q.state.data,
          dataKeys: q.state.data ? Object.keys(q.state.data) : "no data",
        })),
      );

      const exactQueryData = queryClient.getQueryData(
        boardDeletedItemsQueryKey,
      );
      console.log(`🔍 正確なクエリキーでのデータ取得:`, exactQueryData);
      queryClient.setQueryData(boardDeletedItemsQueryKey, (oldItems: any) => {
        console.log(`📊 更新前ボード削除済みアイテム:`, oldItems);
        console.log(
          `🎯 削除対象originalId=${memo?.originalId}のアイテムを除去`,
        );

        if (!oldItems) {
          console.log(`⚠️ oldItems is null/undefined - キャッシュ更新スキップ`);
          return null;
        }

        // 削除済みアイテム構造: { memos: [], tasks: [] }
        if (oldItems.memos) {
          const beforeCount = oldItems.memos.length;
          const filteredItems = {
            ...oldItems,
            memos: oldItems.memos.filter(
              (item: any) => memo && item.originalId !== memo.originalId,
            ),
          };
          const afterCount = filteredItems.memos.length;
          console.log(
            `📊 ボードメモフィルタ: ${beforeCount}件 → ${afterCount}件 (削除=${beforeCount - afterCount}件)`,
          );
          console.log(
            `🎯 更新後ボード削除済みメモ詳細:`,
            filteredItems.memos.map(
              (m: any) => `originalId=${m.originalId}, title="${m.title}"`,
            ),
          );
          return filteredItems;
        }

        console.log(`⚠️ oldItems.memos が存在しない - そのまま返却`);
        return oldItems;
      });

      // 即座に次のメモ選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onDeleteAndSelectNext && memo) {
        onDeleteAndSelectNext(memo);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得（安全なアプローチ）
      console.log(
        `🔄 キャッシュ無効化開始: teamMode=${teamMode}, teamId=${teamId}, boardId=${boardId}`,
      );
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: ["team-deleted-memos", teamId],
        });
        // チーム削除済みメモ一覧の条件付き強制再取得（アクティブクエリのみ）
        const teamDeletedMemosQueries = queryClient.getQueryCache().findAll({
          queryKey: ["team-deleted-memos", teamId],
          type: "active",
        });
        if (teamDeletedMemosQueries.length > 0) {
          await queryClient.refetchQueries({
            queryKey: ["team-deleted-memos", teamId],
          });
          console.log(`🔄 チーム削除済みメモ強制再取得実行: teamId=${teamId}`);
        } else {
          console.log(
            `⏭️ チーム削除済みメモクエリ非アクティブ - 再取得スキップ: teamId=${teamId}`,
          );
        }

        if (boardId) {
          const teamIdString = teamId.toString();
          await queryClient.invalidateQueries({
            queryKey: ["team-board-deleted-items", teamIdString, boardId],
          });
          // ボード削除済みアイテムの条件付き強制再取得（アクティブクエリのみ）
          const boardDeletedItemsQueries = queryClient.getQueryCache().findAll({
            queryKey: ["team-board-deleted-items", teamIdString, boardId],
            type: "active",
          });

          console.log(
            `🔍 アクティブなボード削除済みアイテムクエリ数: ${boardDeletedItemsQueries.length}`,
          );
          console.log(
            `🔍 全ボード削除済みアイテムクエリ一覧:`,
            queryClient
              .getQueryCache()
              .findAll({
                queryKey: ["team-board-deleted-items", teamIdString, boardId],
              })
              .map(
                (q) =>
                  `state=${q.state.status}, dataUpdatedAt=${q.state.dataUpdatedAt}`,
              ),
          );

          if (boardDeletedItemsQueries.length > 0) {
            console.log(
              `🔄 ボード削除済みアイテム強制再取得開始: teamId=${teamId}, boardId=${boardId}`,
            );
            await queryClient.refetchQueries({
              queryKey: ["team-board-deleted-items", teamIdString, boardId],
            });
            console.log(
              `✅ ボード削除済みアイテム強制再取得完了: teamId=${teamId}, boardId=${boardId}`,
            );

            // 再取得後のデータ状態も確認
            const afterRefetch = queryClient.getQueryData([
              "team-board-deleted-items",
              teamIdString,
              boardId,
            ]);
            console.log(`🎯 再取得後データ:`, afterRefetch);
          } else {
            console.log(
              `⏭️ ボード削除済みアイテムクエリ非アクティブ - 再取得スキップ: teamId=${teamId}, boardId=${boardId}`,
            );
            console.log(
              `💡 UIが表示されていない可能性があります。ページ再読み込み時に最新データが表示されます。`,
            );
          }
        }
      } else {
        await queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });
        // 個人削除済みメモ一覧の条件付き強制再取得（アクティブクエリのみ）
        const personalDeletedMemosQueries = queryClient
          .getQueryCache()
          .findAll({
            queryKey: ["deletedMemos"],
            type: "active",
          });
        if (personalDeletedMemosQueries.length > 0) {
          await queryClient.refetchQueries({ queryKey: ["deletedMemos"] });
          console.log(`🔄 個人削除済みメモ強制再取得実行`);
        } else {
          console.log(`⏭️ 個人削除済みメモクエリ非アクティブ - 再取得スキップ`);
        }

        if (boardId) {
          await queryClient.invalidateQueries({
            queryKey: ["board-deleted-items", boardId],
          });
          const boardDeletedItemsQueries = queryClient.getQueryCache().findAll({
            queryKey: ["board-deleted-items", boardId],
            type: "active",
          });
          if (boardDeletedItemsQueries.length > 0) {
            await queryClient.refetchQueries({
              queryKey: ["board-deleted-items", boardId],
            });
            console.log(
              `🔄 個人ボード削除済みアイテム強制再取得実行: boardId=${boardId}`,
            );
          } else {
            console.log(
              `⏭️ 個人ボード削除済みアイテムクエリ非アクティブ - 再取得スキップ: boardId=${boardId}`,
            );
          }
        }
      }
      console.log(`✅ キャッシュ無効化完了`);
    },
  });

  const restoreNote = useRestoreMemo({ teamMode, teamId, boardId });

  const handlePermanentDelete = async () => {
    console.log(
      `🚀 完全削除開始: memo.originalId=${memo?.originalId}, teamMode=${teamMode}, teamId=${teamId}`,
    );
    try {
      setShowDeleteModal(false);

      // エディターコンテンツをゴミ箱に吸い込むアニメーション
      const editorArea = document.querySelector(
        "[data-memo-editor]",
      ) as HTMLElement;
      const rightTrashButton = document.querySelector(
        "[data-right-panel-trash]",
      ) as HTMLElement;

      if (editorArea && rightTrashButton) {
        const { animateEditorContentToTrashCSS } = await import(
          "@/src/utils/deleteAnimation"
        );
        animateEditorContentToTrashCSS(
          editorArea,
          rightTrashButton,
          async () => {
            // アニメーション完了後の処理
            try {
              // API実行（onSuccessで次選択とキャッシュ更新が実行される）
              if (memo) {
                await permanentDeleteNote.mutateAsync(memo.originalId);
              }

              // アニメーション状態をリセットしてから蓋を閉じる
              onAnimationChange?.(false);
              setTimeout(() => {
                (
                  window as Window & { closeDeletingLid?: () => void }
                ).closeDeletingLid?.();
              }, 500);
            } catch (error) {
              console.error("完全削除エラー (アニメーション内):", error);
              onAnimationChange?.(false);
              alert("完全削除に失敗しました。");
            }
          },
        );
      } else {
        // アニメーション要素がない場合は通常の処理
        // API実行（onSuccessで次選択とキャッシュ更新が実行される）
        if (memo) {
          await permanentDeleteNote.mutateAsync(memo.originalId);
        }

        // アニメーション状態をリセットしてから蓋を閉じる
        onAnimationChange?.(false);
        setTimeout(() => {
          (
            window as Window & { closeDeletingLid?: () => void }
          ).closeDeletingLid?.();
        }, 500);
      }
    } catch (error) {
      console.error("完全削除エラー (メイン):", error);
      onAnimationChange?.(false);
      alert("完全削除に失敗しました。");
    }
  };

  const handleRestore = async () => {
    console.log(
      `🔄 復元処理開始: memo.id=${memo?.id}, memo.originalId=${memo?.originalId}, teamMode=${teamMode}, teamId=${teamId}`,
    );
    try {
      setIsLocalRestoring(true);
      // API実行
      if (memo) {
        console.log(
          `📤 復元API呼び出し: originalId=${memo.originalId}, teamMode=${teamMode}`,
        );
        await restoreNote.mutateAsync(memo.originalId);
        console.log(`✅ 復元API成功: originalId=${memo.originalId}`);
      }

      // 復元完了後、すぐにUIを更新
      setIsLocalRestoring(false);
      console.log(
        `🎯 UI更新処理: onRestoreAndSelectNext=${!!onRestoreAndSelectNext}`,
      );
      if (onRestoreAndSelectNext && memo) {
        console.log(
          `⏭️ 次のアイテム選択実行: memo.originalId=${memo.originalId}`,
        );
        onRestoreAndSelectNext(memo);
      } else {
        console.log(`❌ パネルを閉じる`);
        onClose();
      }
      console.log(`🏁 復元処理完了: memo.originalId=${memo?.originalId}`);
    } catch (error) {
      console.error("メモ復元エラー:", error);
      setIsLocalRestoring(false);
      alert("復元に失敗しました。");
    }
  };

  const showDeleteConfirmation = () => {
    setShowDeleteModal(true);
  };

  const hideDeleteConfirmation = () => {
    setShowDeleteModal(false);
    // アニメーション状態をリセット
    onAnimationChange?.(false);
    // キャンセル時も蓋を閉じる
    setTimeout(() => {
      (
        window as Window & { closeDeletingLid?: () => void }
      ).closeDeletingLid?.();
    }, 100);
  };

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
    isRestoring: restoreNote.isPending || isLocalRestoring,
  };
}
