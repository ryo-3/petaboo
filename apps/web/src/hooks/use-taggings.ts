import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { taggingsApi } from '@/src/lib/api-client'
import type { Tagging, CreateTaggingData, Tag } from '@/src/types/tag'

interface UseTaggingsOptions {
  targetType?: 'memo' | 'task' | 'board';
  targetOriginalId?: string;
  tagId?: number;
}

export function useTaggings(options: UseTaggingsOptions = {}) {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['taggings', options],
    queryFn: async () => {
      const token = await getToken()
      const response = await taggingsApi.getTaggings(
        token || undefined,
        options.targetType,
        options.targetOriginalId,
        options.tagId
      )
      if (!response.ok) {
        console.error('🔗 Taggings API error:', response.statusText);
      }
      const data = await response.json()
      return data as Tagging[]
    },
  })
}

export function useItemTags(targetType: 'memo' | 'task' | 'board', targetOriginalId: string) {
  const { data: taggings, isLoading, error } = useTaggings({
    targetType,
    targetOriginalId,
  })

  const tags = taggings?.map(tagging => tagging.tag).filter((tag): tag is Tag => tag !== undefined) || []


  return {
    tags,
    isLoading,
    error,
  }
}

export function useCreateTagging() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (taggingData: CreateTaggingData) => {
      const token = await getToken()
      const response = await taggingsApi.createTagging(taggingData, token || undefined)
      const data = await response.json()
      return data as Tagging
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taggings'] })
    },
  })
}

export function useDeleteTagging() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      await taggingsApi.deleteTagging(id, token || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taggings'] })
    },
  })
}

export function useDeleteTaggingsByTag() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async ({
      tagId,
      targetType,
      targetOriginalId,
    }: {
      tagId: number;
      targetType?: 'memo' | 'task' | 'board';
      targetOriginalId?: string;
    }) => {
      const token = await getToken()
      await taggingsApi.deleteTaggingsByTag(
        tagId,
        targetType,
        targetOriginalId,
        token || undefined
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taggings'] })
    },
  })
}

// アイテム一覧のタグ情報を一括プリフェッチ
export function usePrefetchItemTags(itemType: 'memo' | 'task' | 'board', items: { id: number; originalId?: string }[] | undefined) {
  const { getToken, isLoaded } = useAuth()

  return useQueries({
    queries: (items || []).map(item => {
      const targetOriginalId = item.originalId || item.id.toString()
      return {
        queryKey: ['taggings', { targetType: itemType, targetOriginalId }],
        queryFn: async () => {
          const token = await getToken()
          const response = await taggingsApi.getTaggings(
            token || undefined,
            itemType,
            targetOriginalId
          )
          if (!response.ok) {
            throw new Error(`Failed to fetch item tags: ${response.status}`)
          }
          const data = await response.json()
          return data as Tagging[]
        },
        enabled: isLoaded && !!items,
        staleTime: 2 * 60 * 1000,     // 2分間は新鮮なデータとして扱う
        gcTime: 10 * 60 * 1000,       // 10分間キャッシュを保持
        refetchOnWindowFocus: false,  // ウィンドウフォーカス時の再取得を無効化
        refetchOnMount: false,        // マウント時の再取得を無効化
      }
    })
  })
}