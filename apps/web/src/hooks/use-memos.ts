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
    placeholderData: [], // 初回も即座に空配列を表示
    keepPreviousData: true, // 前回のデータを表示しながら新データをフェッチ
    ...(teamMode && {
      refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
      refetchIntervalInBackground: true, // バックグラウンドタブでも定期取得を継続
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
    keepPreviousData: true, // 前回のデータを表示しながら新データをフェッチ
    ...(teamMode && {
      refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
      refetchIntervalInBackground: true, // バックグラウンドタブでも定期取得を継続
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
      // 1. まず楽観的更新でUIを即座に反映
      if (teamMode && teamId) {
        // チームメモのキャッシュを更新（重複チェック付き）
        queryClient.setQueryData<Memo[]>(["team-memos", teamId], (oldMemos) => {
          if (!oldMemos) return [newMemo];
          // 重複チェック（displayIdで比較）
          const exists = oldMemos.some(
            (m) => m.displayId === newMemo.displayId,
          );
          if (exists) return oldMemos;
          return [...oldMemos, newMemo];
        });

        // ボードIDが指定されている場合、ボードアイテムキャッシュも更新
        if (boardId) {
          queryClient.setQueryData(
            ["team-boards", teamId.toString(), boardId, "items"],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (oldData: any) => {
              if (oldData?.items) {
                // 重複チェック
                const exists = oldData.items.some(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (item: any) =>
                    item.itemType === "memo" &&
                    item.content?.displayId === newMemo.displayId,
                );
                if (exists) return oldData;

                const newBoardItem = {
                  id: `memo_${newMemo.id}`, // ボードアイテムID
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
        }

        // 2. バックグラウンドでデータを再取得（楽観的更新の検証）
        queryClient.refetchQueries({
          queryKey: ["team-memos", teamId],
          exact: true,
        });
        if (boardId) {
          queryClient.refetchQueries({
            queryKey: ["team-boards", teamId.toString(), boardId, "items"],
          });
        }
        // ボード一覧の統計も更新
        queryClient.invalidateQueries({ queryKey: ["team-boards", teamId] });
      } else {
        // 個人メモのキャッシュを更新（重複チェック付き）
        queryClient.setQueryData<Memo[]>(["memos"], (oldMemos) => {
          if (!oldMemos) return [newMemo];
          // 重複チェック（displayIdで比較）
          const exists = oldMemos.some(
            (m) => m.displayId === newMemo.displayId,
          );
          if (exists) return oldMemos;
          return [...oldMemos, newMemo];
        });

        // バックグラウンドでrefetch
        queryClient.refetchQueries({ queryKey: ["memos"], exact: true });

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
  boardId?: number; // チームボードキャッシュ更新用
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
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

        // チーム掲示板キャッシュも楽観的更新（作成時と同様のパターン）

        // ボードIDが指定されている場合、ボードアイテムキャッシュも更新
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
                title: data.title !== undefined ? data.title : memo.title,
                content:
                  data.content !== undefined ? data.content : memo.content,
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
          const deletedMemoWithDeletedAt = {
            ...deletedMemo,
            displayId: deletedMemo.displayId || id.toString(),
            deletedAt: Date.now(), // Unix timestamp形式
          };

          queryClient.setQueryData<DeletedMemo[]>(
            ["team-deleted-memos", teamId],
            (oldDeletedMemos) => {
              if (!oldDeletedMemos) return [deletedMemoWithDeletedAt];
              // 重複チェック
              const exists = oldDeletedMemos.some(
                (m) => m.displayId === deletedMemoWithDeletedAt.displayId,
              );
              if (exists) {
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

        // 紐づいているチームボードのアイテムキャッシュのみ無効化・再取得
        const deletedMemoDisplayId = deletedMemo?.displayId || id.toString();
        const teamItemBoards = queryClient.getQueryData<{ id: number }[]>([
          "team-item-boards",
          teamId,
          "memo",
          deletedMemoDisplayId,
        ]);
        if (teamItemBoards && teamItemBoards.length > 0) {
          // キャッシュがある場合は紐づきボードのみ
          teamItemBoards.forEach((board) => {
            queryClient.invalidateQueries({
              queryKey: ["team-boards", teamId.toString(), board.id, "items"],
            });
            queryClient.refetchQueries({
              queryKey: ["team-boards", teamId.toString(), board.id, "items"],
            });
          });
        } else {
          // キャッシュがない場合は現在開いてるチームボード詳細を無効化
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
          const deletedMemoWithDeletedAt = {
            ...deletedMemo,
            displayId: deletedMemo.displayId || id.toString(),
            deletedAt: Date.now(), // Unix timestamp形式
          };

          queryClient.setQueryData<DeletedMemo[]>(
            ["deletedMemos"],
            (oldDeletedMemos) => {
              if (!oldDeletedMemos) return [deletedMemoWithDeletedAt];
              // 重複チェック
              const exists = oldDeletedMemos.some(
                (m) => m.displayId === deletedMemoWithDeletedAt.displayId,
              );
              if (exists) {
                return oldDeletedMemos;
              }
              return [deletedMemoWithDeletedAt, ...oldDeletedMemos];
            },
          );
        }

        // 削除済み一覧もバックグラウンドで無効化（安全性のため）
        queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });

        // 紐づいているボードのアイテムキャッシュのみ無効化・再取得
        const deletedMemoDisplayId = deletedMemo?.displayId || id.toString();
        const itemBoards = queryClient.getQueryData<{ id: number }[]>([
          "item-boards",
          "memo",
          deletedMemoDisplayId,
        ]);
        if (itemBoards && itemBoards.length > 0) {
          // キャッシュがある場合は紐づきボードのみ
          itemBoards.forEach((board) => {
            queryClient.invalidateQueries({
              queryKey: ["boards", board.id, "items"],
            });
            queryClient.refetchQueries({
              queryKey: ["boards", board.id, "items"],
            });
          });
        } else {
          // キャッシュがない場合は現在開いてるボード詳細を無効化
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return key[0] === "boards" && key[2] === "items";
            },
          });
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return key[0] === "boards" && key[2] === "items";
            },
          });
        }
      }
      // 全タグ付け情報を無効化（削除されたメモに関連するタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
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
        // 削除済みメモキャッシュから復元されたメモを即座に除去（存在する場合のみ）
        const existingData = queryClient.getQueryData([
          "team-deleted-memos",
          teamId,
        ]);
        if (existingData) {
          queryClient.setQueryData(
            ["team-deleted-memos", teamId],
            (oldDeletedMemos: { displayId: string }[] | undefined) => {
              if (!oldDeletedMemos) return [];
              return oldDeletedMemos.filter(
                (memo) => memo.displayId !== itemId,
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
        // 紐づいているチームボードのアイテムキャッシュのみ無効化・再取得
        const teamItemBoards = queryClient.getQueryData<{ id: number }[]>([
          "team-item-boards",
          teamId,
          "memo",
          itemId,
        ]);
        if (teamItemBoards && teamItemBoards.length > 0) {
          // キャッシュがある場合は紐づきボードのみ
          teamItemBoards.forEach((board) => {
            queryClient.invalidateQueries({
              queryKey: ["team-boards", teamId.toString(), board.id, "items"],
            });
            queryClient.refetchQueries({
              queryKey: ["team-boards", teamId.toString(), board.id, "items"],
            });
            queryClient.invalidateQueries({
              queryKey: [
                "team-board-deleted-items",
                teamId.toString(),
                board.id,
              ],
            });
            queryClient.refetchQueries({
              queryKey: [
                "team-board-deleted-items",
                teamId.toString(),
                board.id,
              ],
            });
          });
        } else {
          // キャッシュがない場合は現在開いてるチームボード詳細を無効化
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
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return (
                key[0] === "team-board-deleted-items" &&
                key[1] === teamId.toString()
              );
            },
          });
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return (
                key[0] === "team-board-deleted-items" &&
                key[1] === teamId.toString()
              );
            },
          });
        }
      } else {
        // 削除済みメモキャッシュから復元されたメモを即座に除去（存在する場合のみ）
        const existingData = queryClient.getQueryData(["deletedMemos"]);
        if (existingData) {
          queryClient.setQueryData(
            ["deletedMemos"],
            (oldDeletedMemos: { displayId: string }[] | undefined) => {
              if (!oldDeletedMemos) return [];
              return oldDeletedMemos.filter(
                (memo) => memo.displayId !== itemId,
              );
            },
          );
        }

        // 個人メモ復元時のキャッシュ無効化
        queryClient.invalidateQueries({ queryKey: ["memos"] });
        queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });

        // 紐づいているボードのアイテムキャッシュのみ無効化・再取得
        const itemBoards = queryClient.getQueryData<{ id: number }[]>([
          "item-boards",
          "memo",
          itemId,
        ]);
        if (itemBoards && itemBoards.length > 0) {
          // キャッシュがある場合は紐づきボードのみ
          itemBoards.forEach((board) => {
            queryClient.invalidateQueries({
              queryKey: ["boards", board.id, "items"],
            });
            queryClient.refetchQueries({
              queryKey: ["boards", board.id, "items"],
            });
            queryClient.invalidateQueries({
              queryKey: ["board-deleted-items", board.id],
            });
            queryClient.refetchQueries({
              queryKey: ["board-deleted-items", board.id],
            });
          });
        } else {
          // キャッシュがない場合は現在開いてるボード詳細を無効化
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return key[0] === "boards" && key[2] === "items";
            },
          });
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return key[0] === "boards" && key[2] === "items";
            },
          });
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return key[0] === "board-deleted-items";
            },
          });
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as unknown[];
              return key[0] === "board-deleted-items";
            },
          });
        }
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
