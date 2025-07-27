import { useQuery, useMutation, useQueryClient, useQueries, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Board, BoardWithStats, BoardWithItems, CreateBoardData, UpdateBoardData, AddItemToBoardData, BoardItem } from "@/src/types/board";
import { DeletedMemo } from "@/src/types/memo";
import { DeletedTask } from "@/src/types/task";
import { useToast } from "@/src/contexts/toast-context";

interface ApiError extends Error {
  status?: number;
}

// セキュアなメモリキャッシュ（localStorage使用せず）
let cachedToken: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let tokenExpiry: number = 0;
let tokenPromise: Promise<string | null> | null = null; // 同期化用

async function getCachedToken(getToken: () => Promise<string | null>): Promise<string | null> {
  // 既に取得中の場合は同じPromiseを返す（同期化）
  if (tokenPromise) {
    return tokenPromise;
  }
  
  // 新しいトークン取得を開始
  tokenPromise = (async () => {
    const token = await getToken();
    
    // トークンの変化をログで確認（変化した時のみ）
    const hasChanged = cachedToken !== token;
    if (hasChanged) {
      const tokenStart = token?.substring(0, 20) + '...';
      console.log(`🔑 Token Updated: ${tokenStart}, Time: ${new Date().toLocaleTimeString()}`);
    }
    
    if (token) {
      cachedToken = token;
      tokenExpiry = Date.now() + (1 * 60 * 1000); // 1分のみキャッシュ
    }
    
    // 取得完了後、Promiseをクリア
    tokenPromise = null;
    return token;
  })();
  
  return tokenPromise;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8794";

// ボード一覧取得
export function useBoards(status: "normal" | "completed" | "deleted" = "normal") {
  const { getToken, isLoaded } = useAuth();

  return useQuery<BoardWithStats[]>({
    queryKey: ["boards", status],
    enabled: isLoaded, // 認証完了まで待機
    queryFn: async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        
        const response = await fetch(`${API_BASE_URL}/boards?status=${status}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }
        
        if (!response.ok) {
          const error: ApiError = new Error(`Failed to fetch boards: ${response.status} ${response.statusText}`);
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        return data;
      }
      
      throw new Error('Failed after retry');
    },
  });
}

// 特定ボード取得（アイテム付き）
export function useBoardWithItems(boardId: number | null, skip: boolean = false) {
  const { getToken, isLoaded } = useAuth();

  return useQuery<BoardWithItems>({
    queryKey: ["boards", boardId, "items"],
    enabled: boardId !== null && isLoaded && !skip, // 認証完了まで待機
    queryFn: async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }
        
        if (!response.ok) {
          const error: ApiError = new Error(`Failed to fetch board with items: ${response.status} ${response.statusText}`);
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        
        return {
          ...data.board,
          items: data.items,
        };
      }
      
      throw new Error('Failed after retry');
    },
    staleTime: 2 * 60 * 1000,     // 2分間は新鮮なデータとして扱う
    gcTime: 10 * 60 * 1000,       // 10分間キャッシュを保持
    refetchOnWindowFocus: false,  // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false,        // マウント時の再取得を無効化
  });
}

// slugからボード情報を取得
export function useBoardBySlug(slug: string | null) {
  const { getToken } = useAuth();

  return useQuery<Board>({
    queryKey: ["boards", "slug", slug],
    queryFn: async () => {
      const token = await getCachedToken(getToken);
      
      const response = await fetch(`${API_BASE_URL}/boards/slug/${slug}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        const error: ApiError = new Error(`Failed to fetch board by slug: ${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }
      
      const data = await response.json();
      return data;
    },
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,     // 2分間は新鮮なデータとして扱う
    gcTime: 10 * 60 * 1000,       // 10分間キャッシュを保持
    refetchOnWindowFocus: false,  // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false,        // マウント時の再取得を無効化
  });
}

// ボード作成
export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<Board, Error, CreateBoardData>({
    mutationFn: async (data) => {
      const token = await getCachedToken(getToken);
      const response = await fetch(`${API_BASE_URL}/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create board");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (error) => {
      console.error("ボード作成に失敗しました:", error);
      showToast("ボード作成に失敗しました", "error");
    },
  });
}

// ボード更新
export function useUpdateBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<Board, Error, { id: number; data: UpdateBoardData }>({
    mutationFn: async ({ id, data }) => {
      const token = await getCachedToken(getToken);
      const response = await fetch(`${API_BASE_URL}/boards/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update board");
      }

      return response.json();
    },
    onSuccess: (updatedBoard) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["boards", updatedBoard.id] });
    },
    onError: (error) => {
      console.error("ボード更新に失敗しました:", error);
      showToast("ボード更新に失敗しました", "error");
    },
  });
}

// ボード完了切り替え
export function useToggleBoardCompletion() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Board, Error, number>({
    mutationFn: async (id) => {
      const token = await getCachedToken(getToken);
      const response = await fetch(`${API_BASE_URL}/boards/${id}/toggle-completion`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle board completion");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

// ボード削除（削除済みテーブルに移動）
export function useDeleteBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const token = await getCachedToken(getToken);
      const response = await fetch(`${API_BASE_URL}/boards/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete board");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

// 削除済みボード復元
export function useRestoreDeletedBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Board, Error, number>({
    mutationFn: async (id) => {
      const token = await getCachedToken(getToken);
      const response = await fetch(`${API_BASE_URL}/boards/restore/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore deleted board");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

// ボード完全削除
export function usePermanentDeleteBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const token = await getCachedToken(getToken);
      const response = await fetch(`${API_BASE_URL}/boards/${id}/permanent`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to permanently delete board");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

// ボードにアイテム追加
export function useAddItemToBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<BoardItem, Error, { boardId: number; data: AddItemToBoardData }>({
    mutationFn: async ({ boardId, data }) => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(data),
        });

        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }

        if (!response.ok) {
          let errorMessage = "Failed to add item to board";
          let errorDetail = null;
          try {
            errorDetail = await response.json();
            errorMessage = errorDetail.error || errorMessage;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        return response.json();
      }
      
      throw new Error('Failed after retry');
    },
    onSuccess: (newItem, { boardId }) => {
      // 特定のボードのアイテムを無効化
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
      // アイテムのボード情報も無効化
      queryClient.invalidateQueries({ queryKey: ["item-boards", newItem.itemType, newItem.itemId] });
      // ボード一覧も無効化（統計情報が変わるため）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (error) => {
      console.error("ボードへのアイテム追加に失敗しました:", error);
      showToast("ボードへのアイテム追加に失敗しました", "error");
    },
  });
}

// ボードからアイテム削除
export function useRemoveItemFromBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<void, Error, { boardId: number; itemId: number; itemType: 'memo' | 'task' }>({
    mutationFn: async ({ boardId, itemId, itemType }) => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items/${itemId}?itemType=${itemType}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to remove item from board");
        }

        return;
      }
      
      throw new Error('Failed after retry');
    },
    onSuccess: (_, { boardId, itemId, itemType }) => {
      // 特定のボードのアイテムを無効化
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
      // アイテムのボード情報も無効化
      queryClient.invalidateQueries({ queryKey: ["item-boards", itemType, itemId] });
      // ボード一覧も無効化（統計情報が変わるため）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (error) => {
      console.error("ボードからアイテムの削除に失敗しました:", error);
      showToast("ボードからアイテムの削除に失敗しました", "error");
    },
  });
}

// アイテムが所属しているボード一覧を取得
export function useItemBoards(itemType: 'memo' | 'task', itemId: number | undefined) {
  const { getToken } = useAuth();

  return useQuery<Board[]>({
    queryKey: ["item-boards", itemType, itemId],
    queryFn: async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        
        const response = await fetch(`${API_BASE_URL}/boards/items/${itemType}/${itemId}/boards`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }
        
        if (!response.ok) {
          // 404エラーは空配列を返す（削除済みアイテムなど）
          if (response.status === 404) {
            return [];
          }
          throw new Error("Failed to fetch item boards");
        }

        const data = await response.json();
        return data;
      }
      
      throw new Error('Failed after retry');
    },
    enabled: !!itemId,
    placeholderData: keepPreviousData, // 前のデータを保持してちらつき防止
  });
}

// ボード固有の削除済みアイテムを取得
export function useBoardDeletedItems(boardId: number) {
  const { getToken, isLoaded } = useAuth();

  return useQuery<{memos: DeletedMemo[], tasks: DeletedTask[]}>({
    queryKey: ["board-deleted-items", boardId],
    enabled: isLoaded, // 認証完了まで待機
    queryFn: async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/deleted-items`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }
        
        if (!response.ok) {
          const error: ApiError = new Error(`Failed to fetch board deleted items: ${response.status} ${response.statusText}`);
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        // APIレスポンスの形式を変換
        const memos: DeletedMemo[] = [];
        const tasks: DeletedTask[] = [];
        
        for (const item of data.deletedItems) {
          if (item.itemType === "memo" && item.content) {
            memos.push({
              id: item.content.id,
              originalId: item.content.originalId || item.content.id,
              title: item.content.title,
              content: item.content.content,
              categoryId: item.content.categoryId,
              createdAt: item.content.createdAt,
              updatedAt: item.content.updatedAt,
              deletedAt: item.deletedAt,
            });
          } else if (item.itemType === "task" && item.content) {
            tasks.push({
              id: item.content.id,
              originalId: item.content.originalId || item.content.id,
              title: item.content.title,
              description: item.content.description,
              status: item.content.status,
              priority: item.content.priority,
              dueDate: item.content.dueDate,
              categoryId: item.content.categoryId,
              createdAt: item.content.createdAt,
              updatedAt: item.content.updatedAt,
              deletedAt: item.deletedAt,
            });
          }
        }
        
        return { memos, tasks };
      }
      
      throw new Error('Failed after retry');
    },
    staleTime: 2 * 60 * 1000,     // 2分間は新鮮なデータとして扱う
    gcTime: 10 * 60 * 1000,       // 10分間キャッシュを保持
    refetchOnWindowFocus: false,  // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false,        // マウント時の再取得を無効化
  });
}

// アイテム一覧のボード情報を一括プリフェッチ
export function usePrefetchItemBoards(itemType: 'memo' | 'task', items: { id: number }[] | undefined) {
  const { getToken, isLoaded } = useAuth();

  return useQueries({
    queries: (items || []).map(item => ({
      queryKey: ["item-boards", itemType, item.id],
      queryFn: async () => {
        // 最大2回リトライ
        for (let attempt = 0; attempt < 2; attempt++) {
          const token = await getCachedToken(getToken);
          
          const response = await fetch(`${API_BASE_URL}/boards/items/${itemType}/${item.id}/boards`, {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          
          // 401エラーの場合はキャッシュをクリアしてリトライ
          if (response.status === 401 && attempt === 0) {
            cachedToken = null;
            tokenExpiry = 0;
            continue;
          }
          
          if (!response.ok) {
            // 404エラーは空配列を返す（削除済みアイテムなど）
            if (response.status === 404) {
              return [];
            }
            throw new Error("Failed to fetch item boards");
          }

          const data = await response.json();
          return data;
        }
        
        throw new Error('Failed after retry');
      },
      enabled: !!items && items.length > 0 && isLoaded, // 認証完了まで待機
      staleTime: 5 * 60 * 1000,  // 5分間キャッシュ
      refetchOnMount: false,     // マウント時の再取得を無効化
      refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    }))
  });
}
