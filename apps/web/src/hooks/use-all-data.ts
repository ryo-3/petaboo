import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { Tagging } from '@/src/types/tag';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8794";

/**
 * 全タグ付け情報を取得するフック
 * メモ・タスク・ボードすべてのタグ付け情報を一括取得
 */
export function useAllTaggings() {
  const { getToken, isLoaded } = useAuth();

  const result = useQuery<Tagging[]>({
    queryKey: ['taggings', 'all'],
    enabled: isLoaded,
    queryFn: async () => {
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
    staleTime: 5 * 60 * 1000,     // 5分間キャッシュ
    gcTime: 30 * 60 * 1000,        // 30分間保持
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,                      // 最大3回リトライ
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
  });

  return result;
}

interface BoardItem {
  boardId: number;
  boardName: string;
  itemType: 'memo' | 'task';
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

  return useQuery<BoardItem[]>({
    queryKey: ['boards', 'all-items'],
    enabled: isLoaded,
    queryFn: async () => {
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
      
      // 削除済みボードアイテムは除外（deletedAtがnullまたは存在しないもののみ）
      // API側では削除済みメモ表示のため全データを返しているが、フロント側では通常時は除外
      return data.filter((item: { deletedAt?: string | null }) => !item.deletedAt);
    },
    staleTime: 5 * 60 * 1000,     // 5分間キャッシュ
    gcTime: 30 * 60 * 1000,        // 30分間保持
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,                      // 最大3回リトライ
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
  });
}