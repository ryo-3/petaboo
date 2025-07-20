import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Board, BoardWithStats, BoardWithItems, CreateBoardData, UpdateBoardData, AddItemToBoardData, BoardItem } from "@/src/types/board";

// セキュアなメモリキャッシュ（localStorage使用せず）
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getCachedToken(getToken: () => Promise<string | null>): Promise<string | null> {
  const now = Date.now();
  
  // メモリキャッシュが有効な場合はそれを使用（1分間有効）
  if (cachedToken && now < tokenExpiry) {
    console.log('🔄 メモリキャッシュされたトークンを使用');
    return cachedToken;
  }
  
  // 新しいトークンを取得
  console.log('🔑 新しいトークンを取得中...');
  const token = await getToken();
  
  if (token) {
    cachedToken = token;
    tokenExpiry = now + (60 * 1000); // 1分後に期限切れ（短めに設定）
    console.log('✅ メモリトークンキャッシュ更新');
  }
  
  return token;
}

const API_BASE_URL = "http://localhost:8794";

// ボード一覧取得
export function useBoards(status: "normal" | "completed" | "deleted" = "normal") {
  const { getToken } = useAuth();

  return useQuery<BoardWithStats[]>({
    queryKey: ["boards", status],
    queryFn: async () => {
      console.log('🔍 useBoards API呼び出し開始:', status);
      const token = await getCachedToken(getToken);
      
      const response = await fetch(`${API_BASE_URL}/boards?status=${status}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        console.error('❌ useBoards API呼び出し失敗:', response.status, response.statusText);
        throw new Error("Failed to fetch boards");
      }

      const data = await response.json();
      console.log('✅ useBoards API呼び出し成功:', data.length, '件');
      return data;
    },
  });
}

// 特定ボード取得（アイテム付き）
export function useBoardWithItems(boardId: number | null, skip: boolean = false) {
  const { getToken, isLoaded } = useAuth();

  return useQuery<BoardWithItems>({
    queryKey: ["boards", boardId, "items"],
    queryFn: async () => {
      const startTime = performance.now();
      console.log(`🔍 useBoardWithItems API開始 boardId:${boardId}`);
      
      const token = await getCachedToken(getToken);
      const tokenTime = performance.now();
      console.log(`🔑 Token取得完了: ${(tokenTime - startTime).toFixed(2)}ms`);
      
      const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      const fetchTime = performance.now();
      console.log(`📡 Fetch完了: ${(fetchTime - tokenTime).toFixed(2)}ms`);
      
      if (!response.ok) {
        console.error(`❌ useBoardWithItems失敗: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch board with items");
      }

      const data = await response.json();
      const endTime = performance.now();
      console.log(`✅ useBoardWithItems完了: 総時間${(endTime - startTime).toFixed(2)}ms, アイテム数:${data.items?.length || 0}`);
      
      return {
        ...data.board,
        items: data.items,
      };
    },
    enabled: boardId !== null && isLoaded && !skip,
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
      const startTime = performance.now();
      console.log(`🔍 useBoardBySlug API開始 slug:${slug}`);
      
      const token = await getCachedToken(getToken);
      const tokenTime = performance.now();
      console.log(`🔑 Token取得完了: ${(tokenTime - startTime).toFixed(2)}ms`);
      
      const response = await fetch(`${API_BASE_URL}/boards/slug/${slug}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      const fetchTime = performance.now();
      console.log(`📡 Fetch完了: ${(fetchTime - tokenTime).toFixed(2)}ms`);
      
      if (!response.ok) {
        console.error(`❌ useBoardBySlug失敗: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch board by slug");
      }
      
      const data = await response.json();
      const endTime = performance.now();
      console.log(`✅ useBoardBySlug完了: 総時間${(endTime - startTime).toFixed(2)}ms`);
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
  });
}

// ボード更新
export function useUpdateBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

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

// ボードにアイテム追加
export function useAddItemToBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<BoardItem, Error, { boardId: number; data: AddItemToBoardData }>({
    mutationFn: async ({ boardId, data }) => {
      const token = await getCachedToken(getToken);
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
      const token = await getCachedToken(getToken);
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

// アイテムが所属しているボード一覧を取得
export function useItemBoards(itemType: 'memo' | 'task', itemId: number | undefined) {
  const { getToken } = useAuth();

  return useQuery<Board[]>({
    queryKey: ["item-boards", itemType, itemId],
    queryFn: async () => {
      const token = await getCachedToken(getToken);
      
      const response = await fetch(`${API_BASE_URL}/boards/items/${itemType}/${itemId}/boards`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch item boards");
      }

      return response.json();
    },
    enabled: !!itemId,
  });
}