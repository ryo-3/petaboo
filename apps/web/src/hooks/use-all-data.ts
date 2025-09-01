import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { Tagging } from "@/src/types/tag";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

/**
 * 全タグ付け情報を取得するフック
 * メモ・タスク・ボードすべてのタグ付け情報を一括取得
 */
export function useAllTaggings() {
  const { getToken, isLoaded } = useAuth();

  const result = useQuery<Tagging[]>(
    ["taggings", "all"],
    async () => {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/taggings`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch all taggings: ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
    {
      enabled: isLoaded,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  );

  return result;
}

interface BoardItem {
  boardId: number;
  boardName: string;
  itemType: "memo" | "task";
  itemId: string;
  originalId: string;
  addedAt: number;
}

/**
 * 全ボードのアイテム情報を取得するフック
 * 新しい /boards/all-items APIを使用
 */
export function useAllBoardItems() {
  const { getToken, isLoaded } = useAuth();

  return useQuery<BoardItem[]>(
    ["boards", "all-items"],
    async () => {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/boards/all-items`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        // エンドポイントが存在しない場合は空配列を返す
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch all board items: ${response.status}`);
      }

      const data = await response.json();

      // 物理削除になったので、返されるデータはすべて有効
      return data;
    },
    {
      enabled: isLoaded,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  );
}
