import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { memosApi } from "@/src/lib/api-client";
import type {
  Memo,
  DeletedMemo,
  CreateMemoData,
  UpdateMemoData,
} from "@/src/types/memo";

// メモ一覧を取得するhook
export function useMemos(options?: { teamMode?: boolean; teamId?: number }) {
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useQuery({
    queryKey: teamMode ? ["team-memos", teamId] : ["memos"],
    queryFn: async () => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム用のAPIエンドポイント
        const response = await memosApi.getTeamMemos(
          teamId,
          token || undefined,
        );
        const data = await response.json();
        return data as Memo[];
      } else {
        const response = await memosApi.getMemos(token || undefined);
        const data = await response.json();
        return data as Memo[];
      }
    },
    enabled: teamMode ? Boolean(teamId) : true,
  });
}

// 削除済みメモ一覧を取得するhook
export function useDeletedMemos(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useQuery({
    queryKey: teamMode ? ["team-deleted-memos", teamId] : ["deletedMemos"],
    queryFn: async () => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム用のAPIエンドポイント
        const response = await memosApi.getDeletedTeamMemos(
          teamId,
          token || undefined,
        );
        const data = await response.json();
        return data as DeletedMemo[];
      } else {
        const response = await memosApi.getDeletedMemos(token || undefined);
        const data = await response.json();
        return data as DeletedMemo[];
      }
    },
    enabled: teamMode ? Boolean(teamId) : true,
  });
}

// メモを作成するhook
export function useCreateMemo(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    mutationFn: async (memoData: CreateMemoData) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームメモ作成
        const response = await memosApi.createTeamMemo(
          teamId,
          memoData,
          token || undefined,
        );
        const data = await response.json();
        return data as Memo;
      } else {
        // 個人メモ作成
        const response = await memosApi.createNote(
          memoData,
          token || undefined,
        );
        const data = await response.json();
        return data as Memo;
      }
    },
    onSuccess: (newMemo) => {
      console.log(
        `📝 メモ作成成功: id=${newMemo.id}, teamMode=${teamMode}, teamId=${teamId}`,
      );
      if (teamMode && teamId) {
        // チームメモのキャッシュを更新
        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          console.log(
            `📋 チームメモ一覧にメモ追加: ${oldMemos?.length || 0} → ${(oldMemos?.length || 0) + 1}`,
          );
          if (!oldMemos) return [newMemo];
          return [...oldMemos, newMemo];
        });
        // チーム掲示板キャッシュを楽観的更新（空表示を避けるため）
        console.log(
          `🏷️ チーム掲示板キャッシュ楽観的更新（作成時）: teamId=${teamId}, memoId=${newMemo.id}`,
        );

        // 既存のボードアイテムキャッシュに新しいメモを即座に追加
        // 実際のクエリキーは ["team-boards", "18", 1, "items"] の形式
        const boardId = 1; // 仮値（実際はinitialBoardIdから取得すべき）
        queryClient.setQueryData(
          ["team-boards", teamId.toString(), boardId, "items"],
          (oldData: any) => {
            if (oldData?.items) {
              console.log(
                `🚀 楽観的更新: ${oldData.items.length} → ${oldData.items.length + 1}個`,
              );
              return {
                ...oldData,
                items: [
                  ...oldData.items,
                  {
                    id: newMemo.id,
                    boardId: 1, // 仮で設定、実際のボードIDは後でAPIから取得
                    itemId: newMemo.originalId || newMemo.id.toString(),
                    itemType: "memo",
                    content: newMemo,
                    createdAt: newMemo.createdAt,
                    updatedAt: newMemo.updatedAt,
                    position: oldData.items.length,
                  },
                ],
              };
            }
            return oldData;
          },
        );

        // バックグラウンドでデータを再取得（楽観的更新の検証）
        setTimeout(() => {
          console.log(`🔄 バックグラウンド検証開始: teamId=${teamId}`);
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return key[0] === "team-boards" && key[1] === teamId.toString();
            },
          });
        }, 1000);

        console.log(`✨ 楽観的更新完了: teamId=${teamId}`);
      } else {
        // 個人メモのキャッシュを更新
        queryClient.setQueryData<Memo[]>(["memos"], (oldMemos) => {
          if (!oldMemos) return [newMemo];
          return [...oldMemos, newMemo];
        });
        // ボード関連キャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: ["boards"],
          exact: false,
        });
      }
      // タグ付け関連キャッシュを無効化（タグ表示更新のため）
      queryClient.invalidateQueries({
        queryKey: ["taggings"],
        exact: false,
      });
    },
  });
}

// メモを更新するhook
export function useUpdateMemo() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMemoData }) => {
      const token = await getToken();
      const response = await memosApi.updateNote(id, data, token || undefined);
      const responseData = await response.json();
      return responseData as Memo;
    },
    onSuccess: (updatedMemo, { id, data }) => {
      // APIが不完全なレスポンスを返す場合があるので、キャッシュから既存メモを取得して更新
      queryClient.setQueryData<Memo[]>(["memos"], (oldMemos) => {
        if (!oldMemos) return [updatedMemo];
        return oldMemos.map((memo) => {
          if (memo.id === id) {
            // APIが完全なメモオブジェクトを返した場合はそれを使用
            if (
              updatedMemo.title !== undefined &&
              updatedMemo.content !== undefined
            ) {
              return updatedMemo;
            }
            // APIが不完全な場合は既存メモを更新データでマージ
            return {
              ...memo,
              title: data.title ?? memo.title,
              content: data.content ?? memo.content,
              updatedAt: Math.floor(Date.now() / 1000),
            };
          }
          return memo;
        });
      });
      // ボード関連キャッシュを無効化（一覧・統計・アイテムを含む）
      queryClient.invalidateQueries({
        queryKey: ["boards"],
        exact: false,
      });
      // タグ付け関連キャッシュを無効化（タグ表示更新のため）
      queryClient.invalidateQueries({
        queryKey: ["taggings"],
        exact: false,
      });
    },
  });
}

// メモを削除するhook（削除済みに移動）
export function useDeleteMemo(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    mutationFn: async (id: number) => {
      console.log(
        `🚀 メモ削除開始: id=${id}, teamMode=${teamMode}, teamId=${teamId}`,
      );
      const token = await getToken();

      if (teamMode && teamId) {
        console.log(
          `🌐 チームメモ削除API呼び出し: teamId=${teamId}, memoId=${id}`,
        );
        // チームメモ削除
        await memosApi.deleteTeamMemo(teamId, id, token || undefined);
        console.log(`✅ チームメモ削除API成功: teamId=${teamId}, memoId=${id}`);
      } else {
        console.log(`🌐 個人メモ削除API呼び出し: memoId=${id}`);
        // 個人メモ削除
        await memosApi.deleteNote(id, token || undefined);
        console.log(`✅ 個人メモ削除API成功: memoId=${id}`);
      }
    },
    onSuccess: (_, id) => {
      console.log(
        `🗑️ メモ削除成功: id=${id}, teamMode=${teamMode}, teamId=${teamId}`,
      );
      if (teamMode && teamId) {
        console.log(`📋 チームメモキャッシュ更新開始: teamId=${teamId}`);
        // チームメモ一覧から削除されたメモを除去
        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [];
          const filtered = oldMemos.filter((memo) => memo.id !== id);
          console.log(
            `📝 チームメモ一覧更新: ${oldMemos.length} → ${filtered.length}`,
          );
          return filtered;
        });
        // チーム削除済み一覧は無効化（削除済みメモが追加されるため）
        console.log(`🗂️ チーム削除済みメモキャッシュ無効化: teamId=${teamId}`);
        queryClient.invalidateQueries({
          queryKey: ["team-deleted-memos", teamId],
        });
        // チームボード関連のキャッシュを強制再取得（統計が変わるため）
        console.log(`📊 チームボード統計キャッシュ再取得: teamId=${teamId}`);
        queryClient.refetchQueries({ queryKey: ["team-boards", teamId] });
        // チーム掲示板アイテムのキャッシュを無効化（掲示板からメモが消えるため）
        console.log(
          `🏷️ チーム掲示板アイテムキャッシュ無効化: teamId=${teamId}`,
        );
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key[0] === "team-boards" && key[1] === teamId.toString();
          },
        });
        // 強制的にアイテムキャッシュも無効化
        queryClient.removeQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key[0] === "team-boards" && key[1] === teamId.toString();
          },
        });
        console.log(`💥 チーム掲示板キャッシュを強制削除: teamId=${teamId}`);
        // 削除後に新しいデータを強制取得
        setTimeout(() => {
          console.log(`🔄 削除後のデータ再取得開始: teamId=${teamId}`);
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return key[0] === "team-boards" && key[1] === teamId.toString();
            },
          });
          // 追加：全てのチーム掲示板関連クエリを強制再実行
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return key[0] === "team-boards";
            },
          });
          console.log(`🌊 全チーム掲示板クエリを無効化完了`);
        }, 100);
      } else {
        // メモ一覧から削除されたメモを除去
        queryClient.setQueryData<Memo[]>(["memos"], (oldMemos) => {
          if (!oldMemos) return [];
          return oldMemos.filter((memo) => memo.id !== id);
        });
        // 削除済み一覧は無効化（削除済みメモが追加されるため）
        queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });
        // ボード関連のキャッシュを強制再取得（統計が変わるため）
        queryClient.refetchQueries({ queryKey: ["boards"] });
      }
      // 全タグ付け情報を無効化（削除されたメモに関連するタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
    },
  });
}

// メモを完全削除するhook
export function usePermanentDeleteMemo() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();
      await memosApi.permanentDeleteNote(originalId, token || undefined);
    },
    onSuccess: (_, originalId) => {
      // 削除済み一覧から完全削除されたメモを除去
      queryClient.setQueryData<DeletedMemo[]>(
        ["deletedMemos"],
        (oldDeletedMemos) => {
          if (!oldDeletedMemos) return [];
          return oldDeletedMemos.filter(
            (memo) => memo.originalId !== originalId,
          );
        },
      );
    },
  });
}

// メモを復元するhook
export function useRestoreMemo() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();
      await memosApi.restoreNote(originalId, token || undefined);
    },
    onSuccess: () => {
      // メモと削除済みメモの両方を無効化（復元されたメモの新しいIDが分からないため）
      queryClient.invalidateQueries({ queryKey: ["memos"] });
      queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });
      // ボード関連のキャッシュを強制再取得（復元されたメモがボードに含まれる可能性があるため）
      queryClient.refetchQueries({ queryKey: ["boards"] });
      // ボード詳細とボード削除済みアイテムのキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["boards"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["board-deleted-items"] });
      // ボードアイテムのキャッシュを無効化（復元時にボード紐づきも復元されるため）
      queryClient.invalidateQueries({ queryKey: ["board-items"] });
      // 全タグ付け情報を無効化（復元されたメモのタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
    },
  });
}

// CSVインポートhook
export function useImportMemos() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      const response = await memosApi.importMemos(file, token || undefined);
      const data = await response.json();
      return data as { success: boolean; imported: number; errors: string[] };
    },
    onSuccess: () => {
      // CSVインポートは大量データの可能性があるため一覧を無効化
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}
