import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { taggingsApi } from "@/src/lib/api-client";
import type { Tagging, CreateTaggingData, Tag } from "@/src/types/tag";

interface UseTaggingsOptions {
  targetType?: "memo" | "task" | "board";
  targetDisplayId?: string;
  tagId?: number;
  teamId?: number;
  teamMode?: boolean; // チームモードでは個人タグを無効化
  enabled?: boolean; // API重複呼び出し防止用
}

export function useTaggings(options: UseTaggingsOptions = {}) {
  const { getToken } = useAuth();

  // enabled, teamModeをキャッシュキーから除外（キャッシュを共有するため）
  const { enabled, teamMode, ...cacheKeyOptions } = options;

  return useQuery({
    queryKey: ["taggings", cacheKeyOptions],
    queryFn: async () => {
      const token = await getToken();
      const response = await taggingsApi.getTaggings(
        token || undefined,
        options.targetType,
        options.targetDisplayId,
        options.tagId,
        options.teamId,
      );
      if (!response.ok) {
        console.error("🔗 Taggings API error:", response.statusText);
      }
      const data = await response.json();
      return data as Tagging[];
    },
    enabled: enabled !== false && !teamMode, // enabledオプションとteamModeチェックを両方適用
  });
}

export function useItemTags(
  targetType: "memo" | "task" | "board",
  targetDisplayId: string,
  options?: { teamMode?: boolean; enabled?: boolean },
) {
  const {
    data: taggings,
    isLoading,
    error,
  } = useTaggings({
    targetType,
    targetDisplayId,
    teamMode: options?.teamMode,
    enabled: options?.enabled,
  });

  const tags =
    taggings
      ?.map((tagging) => tagging.tag)
      .filter((tag): tag is Tag => tag !== undefined) || [];

  return {
    tags,
    isLoading,
    error,
  };
}

export function useCreateTagging() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (taggingData: CreateTaggingData) => {
      try {
        const token = await getToken();
        const response = await taggingsApi.createTagging(
          taggingData,
          token || undefined,
        );

        if (!response.ok) {
          // 400エラー（重複など）をサイレントに処理
          return { success: false };
        }

        const data = await response.json();
        return data as Tagging;
      } catch {
        // すべてのエラーをサイレントに処理
        return { success: false };
      }
    },
    onSuccess: (result, taggingData) => {
      // エラーケース（{ success: false }）の場合は何もしない
      if (
        !result ||
        (typeof result === "object" &&
          "success" in result &&
          result.success === false)
      ) {
        return;
      }

      const newTagging = result as Tagging;

      // APIはtag情報を含まないので、tagsキャッシュから取得してマージ
      const allTags = queryClient.getQueryData<Tag[]>(["tags", {}]) || [];
      const tag = allTags.find((t) => t.id === newTagging.tagId);
      const taggingWithTag: Tagging = tag ? { ...newTagging, tag } : newTagging;

      // 1. 全タグ付け情報のキャッシュを更新（一覧表示用）
      queryClient.setQueryData<Tagging[]>(
        ["taggings", "all"],
        (oldTaggings) => {
          if (!oldTaggings) return [taggingWithTag];
          const exists = oldTaggings.some((t) => t.id === taggingWithTag.id);
          if (exists) return oldTaggings;
          return [...oldTaggings, taggingWithTag];
        },
      );

      // 2. 該当アイテムのタグ付けキャッシュを更新（エディター用）
      // キャッシュキーがオブジェクトなのでpredicateで部分一致させる
      queryClient.setQueriesData<Tagging[]>(
        {
          predicate: (query) => {
            const key = query.queryKey;
            if (key[0] !== "taggings") return false;
            // "all"キャッシュは既に更新済みなのでスキップ
            if (key[1] === "all") return false;
            const opts = key[1] as Record<string, unknown> | undefined;
            if (!opts || typeof opts !== "object") return false;
            return (
              opts.targetType === taggingData.targetType &&
              opts.targetDisplayId === taggingData.targetDisplayId
            );
          },
        },
        (oldTaggings) => {
          if (!oldTaggings) return [taggingWithTag];
          // 重複チェック
          const exists = oldTaggings.some((t) => t.id === taggingWithTag.id);
          if (exists) return oldTaggings;
          return [...oldTaggings, taggingWithTag];
        },
      );
    },
  });
}

export function useDeleteTagging() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      await taggingsApi.deleteTagging(id, token || undefined);
    },
    onSuccess: (_, id) => {
      // 全てのtaggingsキャッシュから削除されたタグ付けを除去
      queryClient.setQueriesData<Tagging[]>(
        {
          predicate: (query) => query.queryKey[0] === "taggings",
        },
        (oldTaggings) => {
          if (!oldTaggings) return [];
          return oldTaggings.filter((tagging) => tagging.id !== id);
        },
      );
    },
  });
}

export function useDeleteTaggingsByTag() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      tagId,
      targetType,
      targetDisplayId,
      teamId,
    }: {
      tagId: number;
      targetType?: "memo" | "task" | "board";
      targetDisplayId?: string;
      teamId?: number;
    }) => {
      const token = await getToken();
      await taggingsApi.deleteTaggingsByTag(
        tagId,
        targetType,
        targetDisplayId,
        token || undefined,
        teamId,
      );
    },
    onSuccess: (_, { tagId, targetType, targetDisplayId }) => {
      // 1. 全タグ付け情報のキャッシュを更新（一覧表示用）
      queryClient.setQueryData<Tagging[]>(
        ["taggings", "all"],
        (oldTaggings) => {
          if (!oldTaggings) return [];
          return oldTaggings.filter((tagging) => {
            if (tagging.tagId !== tagId) return true;
            if (targetType && tagging.targetType !== targetType) return true;
            if (targetDisplayId && tagging.targetDisplayId !== targetDisplayId)
              return true;
            return false;
          });
        },
      );

      // 2. 該当アイテムのタグ付けキャッシュから条件に一致するタグ付けを除去（エディター用）
      // predicateで部分一致させる
      if (targetType && targetDisplayId) {
        queryClient.setQueriesData<Tagging[]>(
          {
            predicate: (query) => {
              const key = query.queryKey;
              if (key[0] !== "taggings") return false;
              // "all"キャッシュは既に更新済みなのでスキップ
              if (key[1] === "all") return false;
              const opts = key[1] as Record<string, unknown> | undefined;
              if (!opts || typeof opts !== "object") return false;
              return (
                opts.targetType === targetType &&
                opts.targetDisplayId === targetDisplayId
              );
            },
          },
          (oldTaggings) => {
            if (!oldTaggings) return [];
            return oldTaggings.filter((tagging) => tagging.tagId !== tagId);
          },
        );
      }
    },
  });
}
