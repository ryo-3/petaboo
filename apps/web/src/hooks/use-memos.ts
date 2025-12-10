import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { memosApi } from "@/src/lib/api-client";
import type {
  Memo,
  DeletedMemo,
  CreateMemoData,
  UpdateMemoData,
} from "@/src/types/memo";
import { updateItemCache } from "@/src/lib/cache-utils";
import { useToast } from "@/src/contexts/toast-context";

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
    // 個人モード: setQueryDataで更新するためAPI再取得不要
    // チームモード: 他メンバーの変更取得のため短めのstaleTime
    staleTime: teamMode ? 30 * 1000 : Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: teamMode ? true : false,
    keepPreviousData: true,
    ...(teamMode && {
      refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得
      refetchIntervalInBackground: true,
    }),
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
    // 個人モード: setQueryDataで更新するためAPI再取得不要
    staleTime: teamMode ? 30 * 1000 : Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: teamMode ? true : false,
    keepPreviousData: true,
    ...(teamMode && {
      refetchInterval: 60 * 1000,
      refetchIntervalInBackground: true,
    }),
  });
}

// メモを作成するhook
export function useCreateMemo(options?: {
  teamMode?: boolean;
  teamId?: number;
  boardId?: number; // チームボードキャッシュ更新用
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { teamMode = false, teamId, boardId } = options || {};

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
        // チームモード: 既存のキャッシュ更新ロジックを維持（Step 2で対応）
        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [newMemo];
          const exists = oldMemos.some(
            (m) => m.displayId === newMemo.displayId,
          );
          if (exists) return oldMemos;
          return [...oldMemos, newMemo];
        });

        if (boardId) {
          queryClient.setQueryData(
            ["team-boards", teamId.toString(), boardId, "items"],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (oldData: any) => {
              if (oldData?.items) {
                const exists = oldData.items.some(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (item: any) =>
                    item.itemType === "memo" &&
                    item.content?.displayId === newMemo.displayId,
                );
                if (exists) return oldData;

                const newBoardItem = {
                  id: `memo_${newMemo.id}`,
                  boardId,
                  itemId: newMemo.displayId,
                  itemType: "memo" as const,
                  content: newMemo,
                  createdAt: newMemo.createdAt,
                  updatedAt: newMemo.updatedAt,
                  position: oldData.items.length,
                };

                return {
                  ...oldData,
                  items: [...oldData.items, newBoardItem],
                };
              }
              return oldData;
            },
          );
          queryClient.invalidateQueries({
            queryKey: ["team-boards", teamId.toString(), boardId, "items"],
          });
        }
      } else {
        // 個人モード: updateItemCacheで統一管理
        updateItemCache({
          queryClient,
          itemType: "memo",
          operation: "create",
          item: newMemo,
          boardId,
        });
      }
    },
  });
}

// メモを更新するhook
export function useUpdateMemo(options?: {
  teamMode?: boolean;
  teamId?: number;
  boardId?: number; // チームボードキャッシュ更新用
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId, boardId } = options || {};

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

        // 409 Conflict: 楽観的ロックによる競合検出
        if (response.status === 409) {
          const errorData = await response.json();
          const error = new Error("Conflict") as Error & {
            status: number;
            latestData?: Memo;
          };
          error.status = 409;
          error.latestData = errorData.latestData;
          throw error;
        }

        if (!response.ok) {
          throw new Error("Failed to update team memo");
        }

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
        // チームモード: 既存のキャッシュ更新ロジックを維持（Step 2で対応）
        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [updatedMemo];
          const updated = oldMemos.map((memo) => {
            if (memo.id === id) {
              if (
                updatedMemo.title !== undefined &&
                updatedMemo.content !== undefined
              ) {
                return updatedMemo;
              }
              return {
                ...memo,
                title: data.title !== undefined ? data.title : memo.title,
                content:
                  data.content !== undefined ? data.content : memo.content,
                updatedAt: Math.floor(Date.now() / 1000),
              };
            }
            return memo;
          });
          return updated;
        });

        if (boardId) {
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
                        title:
                          data.title !== undefined
                            ? data.title
                            : item.content.title,
                        content:
                          data.content !== undefined
                            ? data.content
                            : item.content.content,
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
        }

        setTimeout(() => {
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return key[0] === "team-boards" && key[1] === teamId.toString();
            },
          });
        }, 1000);
        // チームモード: タグ付け情報を無効化
        queryClient.invalidateQueries({
          queryKey: ["taggings"],
          exact: false,
        });
      } else {
        // 個人モード: updateItemCacheで統一管理
        // APIが完全なデータを返した場合はそれを使用、不完全な場合はマージ
        const existingMemo = queryClient
          .getQueryData<Memo[]>(["memos"])
          ?.find((m) => m.id === id);

        const mergedMemo: Memo = {
          ...(existingMemo || updatedMemo),
          ...updatedMemo,
          title:
            updatedMemo.title !== undefined
              ? updatedMemo.title
              : data.title !== undefined
                ? data.title
                : (existingMemo?.title ?? ""),
          content:
            updatedMemo.content !== undefined
              ? updatedMemo.content
              : data.content !== undefined
                ? data.content
                : (existingMemo?.content ?? null),
          updatedAt: Math.floor(Date.now() / 1000),
        };

        updateItemCache({
          queryClient,
          itemType: "memo",
          operation: "update",
          item: mergedMemo,
          boardId,
        });
        // 個人モード: タグ付け情報を無効化（タグは独立した操作のため許可）
        queryClient.invalidateQueries({
          queryKey: ["taggings"],
          exact: false,
        });
      }
    },
    onError: (error: Error & { status?: number; latestData?: Memo }) => {
      if (error.status === 409 && error.latestData) {
        // 競合エラー: 最新データでキャッシュを更新
        showToast(
          "他のメンバーが変更しました。最新の内容を表示します。",
          "warning",
          5000,
        );
        updateItemCache({
          queryClient,
          itemType: "memo",
          operation: "update",
          item: error.latestData,
          teamId,
        });
      } else {
        console.error("メモ更新に失敗しました:", error);
        showToast("メモ更新に失敗しました", "error");
      }
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
        // チームモード: 既存のキャッシュ更新ロジックを維持（Step 2で対応）
        const deletedMemo = queryClient
          .getQueryData<Memo[]>(["team-memos", teamId])
          ?.find((memo) => memo.id === id);

        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [];
          return oldMemos.filter((memo) => memo.id !== id);
        });

        if (deletedMemo) {
          const deletedMemoWithDeletedAt = {
            ...deletedMemo,
            displayId: deletedMemo.displayId || id.toString(),
            deletedAt: Date.now(),
          };

          queryClient.setQueryData<DeletedMemo[]>(
            ["team-deleted-memos", teamId],
            (oldDeletedMemos) => {
              if (!oldDeletedMemos) return [deletedMemoWithDeletedAt];
              const exists = oldDeletedMemos.some(
                (m) => m.displayId === deletedMemoWithDeletedAt.displayId,
              );
              if (exists) return oldDeletedMemos;
              return [deletedMemoWithDeletedAt, ...oldDeletedMemos];
            },
          );
        }

        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-deleted-memos" && key[1] === teamId?.toString()
            );
          },
        });

        const deletedMemoDisplayId = deletedMemo?.displayId || id.toString();
        const teamItemBoards = queryClient.getQueryData<{ id: number }[]>([
          "team-item-boards",
          teamId,
          "memo",
          deletedMemoDisplayId,
        ]);
        if (teamItemBoards && teamItemBoards.length > 0) {
          teamItemBoards.forEach((board) => {
            queryClient.invalidateQueries({
              queryKey: ["team-boards", teamId.toString(), board.id, "items"],
            });
            queryClient.refetchQueries({
              queryKey: ["team-boards", teamId.toString(), board.id, "items"],
            });
          });
        } else {
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return (
                key[0] === "team-boards" &&
                key[1] === teamId.toString() &&
                key[3] === "items"
              );
            },
          });
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return (
                key[0] === "team-boards" &&
                key[1] === teamId.toString() &&
                key[3] === "items"
              );
            },
          });
        }
        // チームモード: タグ付け情報を無効化
        queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
      } else {
        // 個人モード: updateItemCacheで統一管理
        const deletedMemo = queryClient
          .getQueryData<Memo[]>(["memos"])
          ?.find((memo) => memo.id === id);

        if (deletedMemo) {
          updateItemCache({
            queryClient,
            itemType: "memo",
            operation: "delete",
            item: deletedMemo,
          });
        }
        // 個人モード: タグ付け情報を無効化（タグは独立した操作のため許可）
        queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
      }
    },
  });
}

// メモを完全削除するhook
export function usePermanentDeleteMemo(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    mutationFn: async (itemId: string) => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム側: displayId を送信
        await memosApi.permanentDeleteTeamMemo(
          teamId,
          itemId,
          token || undefined,
        );
      } else {
        // 個人側: displayId を送信
        await memosApi.permanentDeleteNote(itemId, token || undefined);
      }
    },
    onSuccess: (_, itemId) => {
      // 削除済み一覧から完全削除されたメモを除去
      if (teamMode && teamId) {
        queryClient.setQueryData<DeletedMemo[]>(
          ["team-deleted-memos", teamId],
          (oldDeletedMemos) => {
            if (!oldDeletedMemos) return [];
            // チーム側: displayId で比較
            return oldDeletedMemos.filter((memo) => memo.displayId !== itemId);
          },
        );
      } else {
        queryClient.setQueryData<DeletedMemo[]>(
          ["deletedMemos"],
          (oldDeletedMemos) => {
            if (!oldDeletedMemos) return [];
            // 個人側: displayId で比較
            return oldDeletedMemos.filter((memo) => memo.displayId !== itemId);
          },
        );
      }
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
    mutationFn: async (itemId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームメモ復元: displayId を送信
        await memosApi.restoreTeamMemo(teamId, itemId, token || undefined);
      } else {
        // 個人メモ復元: displayId を送信
        const response = await memosApi.restoreNote(itemId, token || undefined);
        await response.json(); // レスポンスをJSONパースしてバックエンドの完了を確認
      }
    },
    onSuccess: (_, itemId) => {
      if (teamMode && teamId) {
        // チームモード: 既存のキャッシュ更新ロジックを維持（Step 2で対応）
        const deletedMemos = queryClient.getQueryData<DeletedMemo[]>([
          "team-deleted-memos",
          teamId,
        ]);
        const restoredMemo = deletedMemos?.find(
          (memo) => memo.displayId === itemId,
        );

        if (deletedMemos) {
          queryClient.setQueryData(
            ["team-deleted-memos", teamId],
            (oldDeletedMemos: DeletedMemo[] | undefined) => {
              if (!oldDeletedMemos) return [];
              return oldDeletedMemos.filter(
                (memo) => memo.displayId !== itemId,
              );
            },
          );
        }

        if (restoredMemo) {
          queryClient.setQueryData<Memo[]>(
            ["team-memos", teamId],
            (oldMemos) => {
              if (!oldMemos) return [restoredMemo as unknown as Memo];
              const exists = oldMemos.some(
                (m) => m.displayId === restoredMemo.displayId,
              );
              if (exists) return oldMemos;
              return [...oldMemos, restoredMemo as unknown as Memo];
            },
          );
        }

        if (boardId) {
          const existingBoardData = queryClient.getQueryData([
            "team-board-deleted-items",
            teamId.toString(),
            boardId,
          ]);
          if (existingBoardData) {
            queryClient.setQueryData(
              ["team-board-deleted-items", teamId.toString(), boardId],
              (oldData: { memos?: { displayId: string }[] } | undefined) => {
                if (oldData?.memos) {
                  return {
                    ...oldData,
                    memos: oldData.memos.filter(
                      (memo) => memo.displayId !== itemId,
                    ),
                  };
                }
                return oldData;
              },
            );
          }
          queryClient.invalidateQueries({
            queryKey: ["team-boards", teamId.toString(), boardId, "items"],
          });
        }
      } else {
        // 個人モード: updateItemCacheで統一管理
        const deletedMemo = queryClient
          .getQueryData<DeletedMemo[]>(["deletedMemos"])
          ?.find((memo) => memo.displayId === itemId);

        if (deletedMemo) {
          updateItemCache({
            queryClient,
            itemType: "memo",
            operation: "restore",
            item: deletedMemo,
            boardId,
          });
        }
      }
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
