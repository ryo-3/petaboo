import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { taggingsApi } from "@/src/lib/api-client";
import type { Tagging, CreateTaggingData, Tag } from "@/src/types/tag";

interface UseTaggingsOptions {
  targetType?: "memo" | "task" | "board";
  targetOriginalId?: string;
  tagId?: number;
  teamMode?: boolean; // チームモードでは個人タグを無効化
  enabled?: boolean; // API重複呼び出し防止用
}

export function useTaggings(options: UseTaggingsOptions = {}) {
  const { getToken } = useAuth();

  // enabled, teamModeをキャッシュキーから除外（キャッシュを共有するため）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    enabled: _enabled,
    teamMode: _teamMode,
    ...cacheKeyOptions
  } = options;

  return useQuery({
    queryKey: ["taggings", cacheKeyOptions],
    queryFn: async () => {
      const token = await getToken();
      const response = await taggingsApi.getTaggings(
        token || undefined,
        options.targetType,
        options.targetOriginalId,
        options.tagId,
      );
      if (!response.ok) {
        console.error("🔗 Taggings API error:", response.statusText);
      }
      const data = await response.json();
      return data as Tagging[];
    },
    enabled: options.enabled !== false && !options.teamMode, // enabledオプションとteamModeチェックを両方適用
  });
}

export function useItemTags(
  targetType: "memo" | "task" | "board",
  targetOriginalId: string,
  options?: { teamMode?: boolean; enabled?: boolean },
) {
  const {
    data: taggings,
    isLoading,
    error,
  } = useTaggings({
    targetType,
    targetOriginalId,
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

      // 全タグ付け情報に新しいタグ付けを追加
      queryClient.setQueryData(
        ["taggings", "all"],
        (oldTaggings: Tagging[] | undefined) => {
          if (!oldTaggings) return [newTagging];
          return [...oldTaggings, newTagging];
        },
      );

      // 全タグ付けクエリを強制再取得（キャッシュ更新を確実に反映）
      queryClient.invalidateQueries({
        queryKey: ["taggings", "all"],
        refetchType: "active",
      });

      // 特定のアイテムタイプ・IDのタグ付け情報も無効化
      queryClient.invalidateQueries({
        queryKey: [
          "taggings",
          {
            targetType: taggingData.targetType,
            targetOriginalId: taggingData.targetOriginalId,
          },
        ],
      });
    },
    onError: () => {
      // エラーをサイレントに処理（ログ出力を抑制）
      // console.error('タグ付けエラー:', error);
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
      // 全タグ付け情報から削除されたタグ付けを除去
      queryClient.setQueryData(
        ["taggings", "all"],
        (oldTaggings: Tagging[] | undefined) => {
          if (!oldTaggings) return [];
          return oldTaggings.filter((tagging) => tagging.id !== id);
        },
      );
      // 汎用タグ付けクエリを無効化
      queryClient.invalidateQueries({ queryKey: ["taggings"], exact: false });
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
      targetOriginalId,
    }: {
      tagId: number;
      targetType?: "memo" | "task" | "board";
      targetOriginalId?: string;
    }) => {
      const token = await getToken();
      await taggingsApi.deleteTaggingsByTag(
        tagId,
        targetType,
        targetOriginalId,
        token || undefined,
      );
    },
    onSuccess: (_, { tagId, targetType, targetOriginalId }) => {
      // 全タグ付け情報から条件に一致するタグ付けを除去
      queryClient.setQueryData(
        ["taggings", "all"],
        (oldTaggings: Tagging[] | undefined) => {
          if (!oldTaggings) return [];
          return oldTaggings.filter((tagging) => {
            if (tagging.tagId !== tagId) return true;
            if (targetType && tagging.targetType !== targetType) return true;
            if (
              targetOriginalId &&
              tagging.targetOriginalId !== targetOriginalId
            )
              return true;
            return false;
          });
        },
      );
      // 特定条件のタグ付けクエリを無効化
      if (targetType && targetOriginalId) {
        queryClient.invalidateQueries({
          queryKey: ["taggings", { targetType, targetOriginalId }],
        });
      }
      // 汎用タグ付けクエリを無効化
      queryClient.invalidateQueries({ queryKey: ["taggings"], exact: false });
    },
  });
}
