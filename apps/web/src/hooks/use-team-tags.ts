import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { Tag, CreateTagData, UpdateTagData } from "@/src/types/tag";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

interface UseTeamTagsOptions {
  search?: string;
  sort?: "name" | "usage" | "recent";
  limit?: number;
  enabled?: boolean; // API重複呼び出し防止用
}

// チームタグ取得
export function useTeamTags(teamId: number, options: UseTeamTagsOptions = {}) {
  const { getToken } = useAuth();

  // enabledをキャッシュキーから除外（キャッシュを共有するため）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { enabled: _enabled, ...cacheKeyOptions } = options;

  return useQuery({
    queryKey: ["team-tags", teamId, cacheKeyOptions],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();

      // チームIDをクエリパラメーターに追加
      params.set("teamId", teamId.toString());

      if (options.search) params.set("q", options.search);
      if (options.sort) params.set("sort", options.sort);
      if (options.limit) params.set("limit", options.limit.toString());

      const queryString = params.toString();
      const url = `${API_BASE_URL}/tags?${queryString}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch team tags: ${response.status}`);
      }

      const data = await response.json();
      return data as Tag[];
    },
    enabled: options.enabled !== false && teamId > 0, // enabledオプションとteamIdチェックを両方適用
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
  });
}

// チームタグ作成
export function useCreateTeamTag(teamId: number) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (tagData: CreateTagData) => {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/tags?teamId=${teamId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create team tag");
      }

      const data = await response.json();
      return data as Tag;
    },
    onSuccess: () => {
      // チームタグ関連のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["team-tags", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
  });
}

// チームタグ更新
export function useUpdateTeamTag(teamId: number) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTagData }) => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/tags/${id}?teamId=${teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update team tag");
      }

      const responseData = await response.json();
      return responseData as Tag;
    },
    onSuccess: () => {
      // チームタグ関連のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["team-tags", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
  });
}

// チームタグ削除
export function useDeleteTeamTag(teamId: number) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/tags/${id}?teamId=${teamId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete team tag");
      }
    },
    onSuccess: (_, id) => {
      // チームタグキャッシュから削除されたタグを即座に除去
      queryClient.setQueriesData<Tag[]>(
        { queryKey: ["team-tags", teamId] },
        (oldTags) => {
          if (!oldTags) return [];
          return oldTags.filter((tag) => tag.id !== id);
        },
      );

      // チームタグ付け情報を無効化
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
  });
}
