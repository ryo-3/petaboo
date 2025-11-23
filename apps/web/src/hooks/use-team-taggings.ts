import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import type { Tagging, CreateTaggingData, Tag } from "@/src/types/tag";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

interface UseTeamTaggingsOptions {
  targetType?: "memo" | "task" | "board";
  targetDisplayId?: string;
  tagId?: number;
  enabled?: boolean; // API重複呼び出し防止用
}

// チームタグ付け取得
export function useTeamTaggings(
  teamId: number,
  options: UseTeamTaggingsOptions = {},
) {
  const { getToken } = useAuth();

  // enabledをキャッシュキーから除外（キャッシュを共有するため）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { enabled: _enabled, ...cacheKeyOptions } = options;

  return useQuery({
    queryKey: ["team-taggings", teamId, cacheKeyOptions],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();

      // チームIDをクエリパラメーターに追加
      params.set("teamId", teamId.toString());

      if (options.targetType) params.set("targetType", options.targetType);
      if (options.targetDisplayId)
        params.set("targetDisplayId", options.targetDisplayId);
      if (options.tagId) params.set("tagId", options.tagId.toString());

      const queryString = params.toString();
      const url = `${API_BASE_URL}/taggings?${queryString}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        console.error("🔗 Team Taggings API error:", response.statusText);
        return [];
      }

      const data = await response.json();
      return data as Tagging[];
    },
    enabled: teamId > 0,
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
  });
}

// チームアイテムのタグ取得（便利フック）
export function useTeamItemTags(
  teamId: number,
  targetType: "memo" | "task" | "board",
  targetDisplayId: string,
) {
  const {
    data: taggings,
    isLoading,
    error,
  } = useTeamTaggings(teamId, {
    targetType,
    targetDisplayId,
  });

  // タグ情報を含むタグリストを取得
  const tags =
    taggings
      ?.map((tagging) => tagging.tag)
      .filter((tag): tag is Tag => !!tag) || [];

  return {
    tags,
    taggings,
    isLoading,
    error,
  };
}

// チームタグ付け作成
export function useCreateTeamTagging(teamId: number) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (taggingData: CreateTaggingData) => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/taggings?teamId=${teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(taggingData),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create team tagging");
      }

      const data = await response.json();
      return data as Tagging;
    },
    onSuccess: (newTagging) => {
      // 関連するキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });

      // 特定のアイテムのタグも無効化
      if (newTagging.targetType && newTagging.targetDisplayId) {
        queryClient.invalidateQueries({
          queryKey: [
            "team-taggings",
            teamId,
            {
              targetType: newTagging.targetType,
              targetDisplayId: newTagging.targetDisplayId,
            },
          ],
        });
      }
    },
  });
}

// チームタグ付け削除
export function useDeleteTeamTagging(teamId: number) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/taggings/${id}?teamId=${teamId}`,
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
        throw new Error(error.error || "Failed to delete team tagging");
      }
    },
    onSuccess: (_, deletedId) => {
      // チームタグ付けキャッシュから削除されたタグ付けを即座に除去
      queryClient.setQueriesData<Tagging[]>(
        { queryKey: ["team-taggings", teamId] },
        (oldTaggings) => {
          if (!oldTaggings) return [];
          return oldTaggings.filter((tagging) => tagging.id !== deletedId);
        },
      );

      // 関連するキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
  });
}

// チームタグ付け削除（タグとアイテムの組み合わせで削除）
export function useDeleteTeamTaggingByTag(teamId: number) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      tagId: number;
      targetType: "memo" | "task" | "board";
      targetDisplayId: string;
    }) => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/taggings/by-tag?teamId=${teamId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete team tagging");
      }
    },
    onSuccess: (_, { tagId, targetType, targetDisplayId }) => {
      // チームタグ付けキャッシュから該当タグ付けを除去
      queryClient.setQueriesData<Tagging[]>(
        { queryKey: ["team-taggings", teamId] },
        (oldTaggings) => {
          if (!oldTaggings) return [];
          return oldTaggings.filter(
            (tagging) =>
              !(
                tagging.tagId === tagId &&
                tagging.targetType === targetType &&
                tagging.targetDisplayId === targetDisplayId
              ),
          );
        },
      );

      // 関連するキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
  });
}

// 全チームタグ付け取得（検索・フィルタリング用）
export function useAllTeamTaggings(
  teamId: number,
  options?: { enabled?: boolean },
) {
  return useTeamTaggings(teamId, { enabled: options?.enabled });
}

// 【最適化】一括取得からフィルタリングするフック（個別API呼び出しを防ぐ）
export function useFilteredTeamTaggings(
  teamId: number,
  targetType: "memo" | "task" | "board",
  targetDisplayId: string | undefined,
) {
  const { data: allTaggings, isLoading, error } = useAllTeamTaggings(teamId);

  const filteredTaggings = useMemo(() => {
    if (!allTaggings || !targetDisplayId) return [];
    return allTaggings.filter(
      (tagging) =>
        tagging.targetType === targetType &&
        tagging.targetDisplayId === targetDisplayId,
    );
  }, [allTaggings, targetType, targetDisplayId]);

  return {
    data: filteredTaggings,
    isLoading,
    error,
  };
}
