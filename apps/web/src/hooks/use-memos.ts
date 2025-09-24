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
    enabled: teamMode ? Boolean(teamId) : true, // チームモードの場合はteamIdが必要
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
      if (teamMode && teamId) {
        // チームメモのキャッシュを更新
        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [newMemo];
          return [...oldMemos, newMemo];
        });
        // チーム掲示板キャッシュを楽観的更新（空表示を避けるため）

        // 既存のボードアイテムキャッシュに新しいメモを即座に追加
        // 実際のクエリキーは ["team-boards", "18", 1, "items"] の形式
        const boardId = 1; // 仮値（実際はinitialBoardIdから取得すべき）
        queryClient.setQueryData(
          ["team-boards", teamId.toString(), boardId, "items"],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (oldData: any) => {
            if (oldData?.items) {
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
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return key[0] === "team-boards" && key[1] === teamId.toString();
            },
          });
        }, 1000);
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
export function useUpdateMemo(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMemoData }) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームメモ更新
        const response = await memosApi.updateTeamMemo(
          teamId,
          id,
          data,
          token || undefined,
        );
        const responseData = await response.json();
        return responseData as Memo;
      } else {
        // 個人メモ更新
        const response = await memosApi.updateNote(
          id,
          data,
          token || undefined,
        );
        const responseData = await response.json();
        return responseData as Memo;
      }
    },
    onSuccess: (updatedMemo, { id, data }) => {
      if (teamMode && teamId) {
        // チームメモ一覧のキャッシュを更新
        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [updatedMemo];
          const updated = oldMemos.map((memo) => {
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
          return updated;
        });

        // チーム掲示板キャッシュも楽観的更新（作成時と同様のパターン）

        // 既存のボードアイテムキャッシュ内のメモを更新
        const boardId = 1; // 仮値（実際はinitialBoardIdから取得すべき）
        queryClient.setQueryData(
          ["team-boards", teamId.toString(), boardId, "items"],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (oldData: any) => {
            if (oldData?.items) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const updatedItems = oldData.items.map((item: any) => {
                if (item.itemType === "memo" && item.content?.id === id) {
                  return {
                    ...item,
                    content: {
                      ...item.content,
                      title: data.title ?? item.content.title,
                      content: data.content ?? item.content.content,
                      updatedAt: Math.floor(Date.now() / 1000),
                    },
                    updatedAt: Math.floor(Date.now() / 1000),
                  };
                }
                return item;
              });
              return {
                ...oldData,
                items: updatedItems,
              };
            }
            return oldData;
          },
        );

        // バックグラウンドでデータを再取得（楽観的更新の検証）
        setTimeout(() => {
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return key[0] === "team-boards" && key[1] === teamId.toString();
            },
          });
        }, 1000);
      } else {
        // 個人メモのキャッシュを更新
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
      }

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
      const token = await getToken();

      if (teamMode && teamId) {
        // チームメモ削除
        await memosApi.deleteTeamMemo(teamId, id, token || undefined);
      } else {
        // 個人メモ削除
        await memosApi.deleteNote(id, token || undefined);
      }
    },
    onSuccess: (_, id) => {
      if (teamMode && teamId) {
        // チームメモ一覧から削除されたメモを楽観的更新で即座に除去
        const deletedMemo = queryClient
          .getQueryData<Memo[]>(["team-memos", teamId])
          ?.find((memo) => memo.id === id);

        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [];
          return oldMemos.filter((memo) => memo.id !== id);
        });

        // 削除済み一覧に楽観的更新で即座に追加（キャッシュ問題回避）
        if (deletedMemo) {
          console.log("🗑️ 削除済み一覧に楽観的更新で追加", {
            memoId: id,
            memoOriginalId: deletedMemo.originalId,
            memoTitle: deletedMemo.title,
            teamId,
            時刻: new Date().toISOString(),
          });

          const deletedMemoWithDeletedAt = {
            ...deletedMemo,
            originalId: deletedMemo.originalId || id.toString(),
            deletedAt: Date.now(), // Unix timestamp形式
          };

          queryClient.setQueryData<DeletedMemo[]>(
            ["team-deleted-memos", teamId],
            (oldDeletedMemos) => {
              if (!oldDeletedMemos) return [deletedMemoWithDeletedAt];
              // 重複チェック
              const exists = oldDeletedMemos.some(
                (m) => m.originalId === deletedMemoWithDeletedAt.originalId,
              );
              if (exists) {
                console.log(
                  "⚠️ 削除済み一覧に既に存在するためスキップ",
                  deletedMemoWithDeletedAt.originalId,
                );
                return oldDeletedMemos;
              }
              return [deletedMemoWithDeletedAt, ...oldDeletedMemos];
            },
          );
        }

        // 削除済み一覧もバックグラウンドで無効化（安全性のため）
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-deleted-memos" && key[1] === teamId?.toString()
            );
          },
        });
        // チームボード関連のキャッシュを強制再取得（統計が変わるため）
        queryClient.refetchQueries({
          queryKey: ["team-boards", teamId],
        });
        // ボードアイテムキャッシュを強制再取得（UIからも削除するため）
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-boards" &&
              key[1] === teamId.toString() &&
              key[3] === "items"
            );
          },
        });
      } else {
        // 個人メモ一覧から削除されたメモを楽観的更新で即座に除去
        const deletedMemo = queryClient
          .getQueryData<Memo[]>(["memos"])
          ?.find((memo) => memo.id === id);

        queryClient.setQueryData<Memo[]>(["memos"], (oldMemos) => {
          if (!oldMemos) return [];
          return oldMemos.filter((memo) => memo.id !== id);
        });

        // 削除済み一覧に楽観的更新で即座に追加（キャッシュ問題回避）
        if (deletedMemo) {
          console.log("🗑️ 個人削除済み一覧に楽観的更新で追加", {
            memoId: id,
            memoOriginalId: deletedMemo.originalId,
            memoTitle: deletedMemo.title,
            時刻: new Date().toISOString(),
          });

          const deletedMemoWithDeletedAt = {
            ...deletedMemo,
            originalId: deletedMemo.originalId || id.toString(),
            deletedAt: Date.now(), // Unix timestamp形式
          };

          queryClient.setQueryData<DeletedMemo[]>(
            ["deletedMemos"],
            (oldDeletedMemos) => {
              if (!oldDeletedMemos) return [deletedMemoWithDeletedAt];
              // 重複チェック
              const exists = oldDeletedMemos.some(
                (m) => m.originalId === deletedMemoWithDeletedAt.originalId,
              );
              if (exists) {
                console.log(
                  "⚠️ 個人削除済み一覧に既に存在するためスキップ",
                  deletedMemoWithDeletedAt.originalId,
                );
                return oldDeletedMemos;
              }
              return [deletedMemoWithDeletedAt, ...oldDeletedMemos];
            },
          );
        }

        // 削除済み一覧もバックグラウンドで無効化（安全性のため）
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
export function useRestoreMemo(options?: {
  teamMode?: boolean;
  teamId?: number;
  boardId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { teamMode = false, teamId, boardId } = options || {};

  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームメモ復元
        await memosApi.restoreTeamMemo(teamId, originalId, token || undefined);
      } else {
        // 個人メモ復元
        await memosApi.restoreNote(originalId, token || undefined);
      }
    },
    onSuccess: (_, originalId) => {
      if (teamMode && teamId) {
        // 削除済みメモキャッシュから復元されたメモを即座に除去（存在する場合のみ）
        const existingData = queryClient.getQueryData([
          "team-deleted-memos",
          teamId,
        ]);
        if (existingData) {
          queryClient.setQueryData(
            ["team-deleted-memos", teamId],
            (oldDeletedMemos: any[] | undefined) => {
              if (!oldDeletedMemos) return [];
              return oldDeletedMemos.filter(
                (memo) => memo.originalId !== originalId,
              );
            },
          );
        }

        // 特定のボードの削除済みアイテムからも除去（存在する場合のみ）
        if (boardId) {
          const existingBoardData = queryClient.getQueryData([
            "team-board-deleted-items",
            teamId.toString(),
            boardId,
          ]);
          if (existingBoardData) {
            queryClient.setQueryData(
              ["team-board-deleted-items", teamId.toString(), boardId],
              (oldData: any) => {
                if (oldData?.memos) {
                  return {
                    ...oldData,
                    memos: oldData.memos.filter(
                      (memo: any) => memo.originalId !== originalId,
                    ),
                  };
                }
                return oldData;
              },
            );
          }
        }

        // チームメモ復元時のキャッシュ無効化と強制再取得
        queryClient.invalidateQueries({ queryKey: ["team-memos", teamId] });
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key[0] === "team-memos" && key[1] === teamId?.toString();
          },
        });
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-deleted-memos" && key[1] === teamId?.toString()
            );
          },
        });
        // 存在するクエリのみ再取得
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-deleted-memos" && key[1] === teamId?.toString()
            );
          },
        });
        // チームボード関連のキャッシュを強制再取得（復元されたメモを即座に反映）
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-boards" &&
              key[1] === teamId.toString() &&
              key[3] === "items"
            );
          },
        });
        // すべてのチーム関連の削除済みアイテムキャッシュを無効化・再取得
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-board-deleted-items" &&
              key[1] === teamId.toString()
            );
          },
        });
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-board-deleted-items" &&
              key[1] === teamId.toString()
            );
          },
        });

        // 特定のボードの削除済みアイテムも明示的に無効化
        if (boardId) {
          queryClient.invalidateQueries({
            queryKey: ["team-board-deleted-items", teamId.toString(), boardId],
          });
          // 即座に再取得も実行
          queryClient.refetchQueries({
            queryKey: ["team-board-deleted-items", teamId.toString(), boardId],
          });
        }
      } else {
        // 削除済みメモキャッシュから復元されたメモを即座に除去（存在する場合のみ）
        const existingData = queryClient.getQueryData(["deletedMemos"]);
        if (existingData) {
          queryClient.setQueryData(
            ["deletedMemos"],
            (oldDeletedMemos: any[] | undefined) => {
              if (!oldDeletedMemos) return [];
              return oldDeletedMemos.filter(
                (memo) => memo.originalId !== originalId,
              );
            },
          );
        }

        // 個人メモ復元時のキャッシュ無効化
        queryClient.invalidateQueries({ queryKey: ["memos"] });
        queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });
        // ボード関連のキャッシュを強制再取得（復元されたメモがボードに含まれる可能性があるため）
        queryClient.refetchQueries({ queryKey: ["boards"] });
        // ボード詳細とボード削除済みアイテムのキャッシュも無効化
        queryClient.invalidateQueries({ queryKey: ["boards"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["board-deleted-items"] });
        // ボードアイテムのキャッシュを無効化（復元時にボード紐づきも復元されるため）
        queryClient.invalidateQueries({ queryKey: ["board-items"] });
      }
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
