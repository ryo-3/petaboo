import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Board, BoardWithStats, BoardWithItems, CreateBoardData, UpdateBoardData, AddItemToBoardData, BoardItem, DeletedBoard } from "@/src/types/board";

const API_BASE_URL = "http://localhost:8794";

// ボード一覧取得
export function useBoards(status: "normal" | "completed" | "deleted" = "normal") {
  const { getToken } = useAuth();

  return useQuery<BoardWithStats[]>({
    queryKey: ["boards", status],
    queryFn: async () => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/boards?status=${status}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch boards");
      }

      return response.json();
    },
  });
}

// 特定ボード取得（アイテム付き）
export function useBoardWithItems(boardId: number | null) {
  const { getToken } = useAuth();

  return useQuery<BoardWithItems>({
    queryKey: ["boards", boardId, "items"],
    queryFn: async () => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch board with items");
      }

      const data = await response.json();
      return {
        ...data.board,
        items: data.items,
      };
    },
    enabled: boardId !== null,
  });
}

// slugからボード情報を取得
export function useBoardBySlug(slug: string | null) {
  const { getToken } = useAuth();

  return useQuery<Board>({
    queryKey: ["boards", "slug", slug],
    queryFn: async () => {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/boards/slug/${slug}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch board by slug");
      }
      
      return response.json();
    },
    enabled: !!slug,
  });
}

// ボード作成
export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Board, Error, CreateBoardData>({
    mutationFn: async (data) => {
      const token = await getToken();
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
  });
}

// ボード更新
export function useUpdateBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Board, Error, { id: number; data: UpdateBoardData }>({
    mutationFn: async ({ id, data }) => {
      const token = await getToken();
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
  });
}

// ボード完了切り替え
export function useToggleBoardCompletion() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Board, Error, number>({
    mutationFn: async (id) => {
      const token = await getToken();
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
      const token = await getToken();
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
      const token = await getToken();
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

// ボードにアイテム追加
export function useAddItemToBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<BoardItem, Error, { boardId: number; data: AddItemToBoardData }>({
    mutationFn: async ({ boardId, data }) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add item to board");
      }

      return response.json();
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
    },
  });
}

// ボードからアイテム削除
export function useRemoveItemFromBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<void, Error, { boardId: number; itemId: number; itemType: 'memo' | 'task' }>({
    mutationFn: async ({ boardId, itemId, itemType }) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items/${itemId}?itemType=${itemType}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove item from board");
      }
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "items"] });
    },
  });
}