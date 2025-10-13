import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { tagsApi } from "@/src/lib/api-client";
import type { Tag, CreateTagData, UpdateTagData } from "@/src/types/tag";

interface UseTagsOptions {
  search?: string;
  sort?: "name" | "usage" | "recent";
  limit?: number;
  enabled?: boolean; // API重複呼び出し防止用
}

export function useTags(options: UseTagsOptions = {}) {
  const { getToken } = useAuth();

  // enabledをキャッシュキーから除外（キャッシュを共有するため）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { enabled: _enabled, ...cacheKeyOptions } = options;

  return useQuery({
    queryKey: ["tags", cacheKeyOptions],
    queryFn: async () => {
      const token = await getToken();
      const response = await tagsApi.getTags(
        token || undefined,
        options.search,
        options.sort,
        options.limit,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status}`);
      }
      const data = await response.json();
      return data as Tag[];
    },
    enabled: options.enabled !== false, // デフォルトはtrue、falseが明示的に渡された時のみ無効化
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (tagData: CreateTagData) => {
      const token = await getToken();
      const response = await tagsApi.createTag(tagData, token || undefined);
      const data = await response.json();
      return data as Tag;
    },
    onSuccess: () => {
      // 新規タグ作成時は複数のキャッシュキーに影響するため、全て無効化して再取得を促す
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTagData }) => {
      const token = await getToken();
      const response = await tagsApi.updateTag(id, data, token || undefined);
      const responseData = await response.json();
      return responseData as Tag;
    },
    onSuccess: () => {
      // 全てのタグ関連クエリを無効化して再取得（確実にキャッシュ更新）
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      // 全タグ付け情報も無効化（タグ名・色が変わった場合に確実に更新）
      queryClient.invalidateQueries({ queryKey: ["taggings"] });
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      await tagsApi.deleteTag(id, token || undefined);
    },
    onSuccess: (_, id) => {
      // すべてのタグクエリキャッシュから削除されたタグを即座に除去
      queryClient.setQueriesData<Tag[]>({ queryKey: ["tags"] }, (oldTags) => {
        if (!oldTags) return [];
        return oldTags.filter((tag) => tag.id !== id);
      });

      // タグ付け情報を無効化（削除されたタグに関連する情報が変わるため）
      queryClient.invalidateQueries({ queryKey: ["taggings"] });
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
    },
  });
}
