import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  Board,
  BoardWithStats,
  BoardWithItems,
  CreateBoardData,
  UpdateBoardData,
  AddItemToBoardData,
  BoardItem,
} from "@/src/types/board";
import { DeletedMemo } from "@/src/types/memo";
import { DeletedTask } from "@/src/types/task";
import { useToast } from "@/src/contexts/toast-context";

interface ApiError extends Error {
  status?: number;
}

// セキュアなメモリキャッシュ（localStorage使用せず）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let cachedToken: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let tokenExpiry: number = 0;
let tokenPromise: Promise<string | null> | null = null; // 同期化用

async function getCachedToken(
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  // 既に取得中の場合は同じPromiseを返す（同期化）
  if (tokenPromise) {
    return tokenPromise;
  }

  // 新しいトークン取得を開始
  tokenPromise = (async () => {
    const token = await getToken();

    if (token) {
      cachedToken = token;
      tokenExpiry = Date.now() + 1 * 60 * 1000; // 1分のみキャッシュ
    }

    // 取得完了後、Promiseをクリア
    tokenPromise = null;
    return token;
  })();

  return tokenPromise;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

// ボード一覧取得
export function useBoards(
  status: "normal" | "completed" | "deleted" = "normal",
  enabled: boolean = true,
) {
  const { getToken, isLoaded } = useAuth();

  return useQuery<BoardWithStats[]>(
    ["boards", status],
    async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        const url = `${API_BASE_URL}/boards?status=${status}`;

        const response = await fetch(url, {
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
          const error: ApiError = new Error(
            `Failed to fetch boards: ${response.status} ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        const responseText = await response.text();

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ Individual boards JSON Parse Error:`, parseError);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }

        return data;
      }

      throw new Error("Failed after retry");
    },
    {
      enabled: isLoaded && enabled,
    },
  );
}

// 特定ボード取得（アイテム付き）
export function useBoardWithItems(
  boardId: number | null,
  skip: boolean = false,
) {
  const { getToken, isLoaded } = useAuth();

  return useQuery<BoardWithItems>(
    ["boards", boardId, "items"],
    async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);

        const response = await fetch(
          `${API_BASE_URL}/boards/${boardId}/items`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }

        if (!response.ok) {
          const error: ApiError = new Error(
            `Failed to fetch board with items: ${response.status} ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        const data = await response.json();

        return {
          ...data.board,
          items: data.items,
        };
      }

      throw new Error("Failed after retry");
    },
    {
      enabled: boardId !== null && isLoaded && !skip,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );
}

// slugからボード情報を取得
export function useBoardBySlug(slug: string | null) {
  const { getToken } = useAuth();

  return useQuery<Board>(
    ["boards", "slug", slug],
    async () => {
      const token = await getCachedToken(getToken);

      const response = await fetch(`${API_BASE_URL}/boards/slug/${slug}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error: ApiError = new Error(
          `Failed to fetch board by slug: ${response.status} ${response.statusText}`,
        );
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    },
    {
      enabled: !!slug,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );
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
    onSuccess: (newBoard) => {
      // 新しいボードは通常状態で作成されるため、normal状態のボード一覧に追加
      queryClient.setQueryData<BoardWithStats[]>(
        ["boards", "normal"],
        (oldBoards) => {
          if (!oldBoards) return [newBoard as BoardWithStats];
          return [...oldBoards, newBoard as BoardWithStats];
        },
      );
      // 他のステータスのキャッシュも無効化（統計情報の整合性のため）
      queryClient.invalidateQueries({ queryKey: ["boards", "completed"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "deleted"] });
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
      // ボード一覧の特定ボードを更新（全ステータス）
      ["normal", "completed", "deleted"].forEach((status) => {
        queryClient.setQueryData<BoardWithStats[]>(
          ["boards", status],
          (oldBoards) => {
            if (!oldBoards) return oldBoards;
            return oldBoards.map((board) =>
              board.id === updatedBoard.id
                ? { ...board, ...updatedBoard }
                : board,
            );
          },
        );
      });
      // 特定ボードの詳細キャッシュを無効化
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
      const response = await fetch(
        `${API_BASE_URL}/boards/${id}/toggle-completion`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle board completion");
      }

      return response.json();
    },
    onSuccess: (updatedBoard, id) => {
      // 元のボードを削除して新しいステータスに移動
      ["normal", "completed", "deleted"].forEach((status) => {
        queryClient.setQueryData<BoardWithStats[]>(
          ["boards", status],
          (oldBoards) => {
            if (!oldBoards) return oldBoards;
            // 元のボードを削除
            const filtered = oldBoards.filter((board) => board.id !== id);
            // 新しいステータスが現在のステータスと一致する場合は追加
            if (
              (status === "completed" && updatedBoard.completed) ||
              (status === "normal" && !updatedBoard.completed)
            ) {
              return [...filtered, updatedBoard as BoardWithStats];
            }
            return filtered;
          },
        );
      });
      // 特定ボードの詳細キャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["boards", id] });
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
    onSuccess: (_, id) => {
      // 通常・完了済みボード一覧から削除されたボードを除去
      ["normal", "completed"].forEach((status) => {
        queryClient.setQueryData<BoardWithStats[]>(
          ["boards", status],
          (oldBoards) => {
            if (!oldBoards) return oldBoards;
            return oldBoards.filter((board) => board.id !== id);
          },
        );
      });
      // 削除済みボード一覧は無効化（削除済みボードが追加されるため）
      queryClient.invalidateQueries({ queryKey: ["boards", "deleted"] });
      // 特定ボードの詳細キャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["boards", id] });
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
    onSuccess: (restoredBoard, id) => {
      // 削除済み一覧から復元されたボードを除去
      queryClient.setQueryData<BoardWithStats[]>(
        ["boards", "deleted"],
        (oldBoards) => {
          if (!oldBoards) return oldBoards;
          return oldBoards.filter((board) => board.id !== id);
        },
      );
      // 復元されたボードを適切なステータス一覧に追加
      const targetStatus = restoredBoard.completed ? "completed" : "normal";
      queryClient.setQueryData<BoardWithStats[]>(
        ["boards", targetStatus],
        (oldBoards) => {
          if (!oldBoards) return [restoredBoard as BoardWithStats];
          return [...oldBoards, restoredBoard as BoardWithStats];
        },
      );
      // 特定ボードの詳細キャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["boards", id] });
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
    onSuccess: (_, id) => {
      // 削除済みボード一覧から完全削除されたボードを除去
      queryClient.setQueryData<BoardWithStats[]>(
        ["boards", "deleted"],
        (oldBoards) => {
          if (!oldBoards) return oldBoards;
          return oldBoards.filter((board) => board.id !== id);
        },
      );
    },
  });
}

// ボードにアイテム追加
export function useAddItemToBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<
    BoardItem,
    Error,
    { boardId: number; data: AddItemToBoardData }
  >({
    mutationFn: async ({ boardId, data }) => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        const response = await fetch(
          `${API_BASE_URL}/boards/${boardId}/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(data),
          },
        );

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

      throw new Error("Failed after retry");
    },
    onSuccess: (newItem, { boardId, data }) => {
      // newItem.itemIdがundefinedの場合は、元のdataから取得
      const itemId = newItem.itemId || data.itemId;
      const itemType = newItem.itemType || data.itemType;

      // 特定のボードのアイテムキャッシュを無効化（新しいアイテムが追加されるため）
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
      // アイテムのボード情報も無効化（originalIdベース） - 確実に更新
      queryClient.invalidateQueries({
        queryKey: ["item-boards", itemType, itemId],
      });
      // 完全にキャッシュをクリア（"item-boards"で始まる全てのキャッシュをクリア）
      queryClient.invalidateQueries({ queryKey: ["item-boards"] });
      // ボード一覧の統計情報を更新（より細かい制御は困難なため無効化）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      // 全ボードアイテム情報も無効化（全データ事前取得で使用）
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });
      // 完全なキャッシュリフレッシュ（ボードアイテムすべて）
      queryClient.refetchQueries({ queryKey: ["boards", "all-items"] });
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

  return useMutation<
    void,
    Error,
    { boardId: number; itemId: string; itemType: "memo" | "task" }
  >({
    mutationFn: async ({ boardId, itemId, itemType }) => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        const url = `${API_BASE_URL}/boards/${boardId}/items/${itemId}?itemType=${itemType}`;

        const response = await fetch(url, {
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
          try {
            const errorJson = await response.json();
            throw new Error(
              errorJson.error ||
                `Failed to remove item from board: ${response.status} ${response.statusText}`,
            );
          } catch {
            const rawText = await response.text();
            throw new Error(
              `Failed to remove item from board: ${response.status} ${response.statusText} - ${rawText}`,
            );
          }
        }

        return;
      }

      throw new Error("Failed after retry");
    },
    onSuccess: (_, { boardId, itemId, itemType }) => {
      // 特定のボードのアイテムキャッシュを無効化（アイテムが削除されるため）
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
      // アイテムのボード情報も無効化 - 確実に更新
      queryClient.invalidateQueries({
        queryKey: ["item-boards", itemType, itemId],
      });
      // 完全にキャッシュをクリア（"item-boards"で始まる全てのキャッシュをクリア）
      queryClient.invalidateQueries({ queryKey: ["item-boards"] });
      // ボード一覧の統計情報を更新（より細かい制御は困難なため無効化）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      // 全ボードアイテム情報も無効化（全データ事前取得で使用）
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });
      // 完全なキャッシュリフレッシュ（ボードアイテムすべて）
      queryClient.refetchQueries({ queryKey: ["boards", "all-items"] });
    },
    onError: (error, variables) => {
      console.error("ボードからアイテムの削除に失敗しました:", {
        error: error.message,
        variables,
        errorObject: error,
      });
      showToast("ボードからアイテムの削除に失敗しました", "error");
    },
  });
}

// アイテムが所属しているボード一覧を取得
export function useItemBoards(
  itemType: "memo" | "task",
  itemId: string | undefined,
) {
  const { getToken } = useAuth();

  return useQuery<Board[]>({
    queryKey: ["item-boards", itemType, itemId],
    queryFn: async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);

        const response = await fetch(
          `${API_BASE_URL}/boards/items/${itemType}/${itemId}/boards`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

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

      throw new Error("Failed after retry");
    },
    enabled: !!itemId,
    keepPreviousData: true, // 前のデータを保持してちらつき防止
  });
}

// ボード固有の削除済みアイテムを取得
export function useBoardDeletedItems(boardId: number) {
  const { getToken, isLoaded } = useAuth();

  return useQuery<{ memos: DeletedMemo[]; tasks: DeletedTask[] }>(
    ["board-deleted-items", boardId],
    async () => {
      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);

        const response = await fetch(
          `${API_BASE_URL}/boards/${boardId}/deleted-items`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }

        if (!response.ok) {
          const error: ApiError = new Error(
            `Failed to fetch board deleted items: ${response.status} ${response.statusText}`,
          );
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
              boardCategoryId: item.content.boardCategoryId,
              createdAt: item.content.createdAt,
              updatedAt: item.content.updatedAt,
              deletedAt: item.deletedAt,
            });
          }
        }

        return { memos, tasks };
      }

      throw new Error("Failed after retry");
    },
    {
      enabled: isLoaded,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );
}
