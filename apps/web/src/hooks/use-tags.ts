import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { tagsApi } from '@/src/lib/api-client'
import type { Tag, CreateTagData, UpdateTagData } from '@/src/types/tag'

interface UseTagsOptions {
  search?: string;
  sort?: 'name' | 'usage' | 'recent';
  limit?: number;
}

export function useTags(options: UseTagsOptions = {}) {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['tags', options],
    queryFn: async () => {
      const token = await getToken()
      const response = await tagsApi.getTags(
        token || undefined,
        options.search,
        options.sort,
        options.limit
      )
      if (!response.ok) {
        console.error('🏷️ Tags API error:', response.statusText);
      }
      const data = await response.json()
      return data as Tag[]
    },
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (tagData: CreateTagData) => {
      const token = await getToken()
      const response = await tagsApi.createTag(tagData, token || undefined)
      const data = await response.json()
      return data as Tag
    },
    onSuccess: (newTag) => {
      // タグ一覧に新しいタグを追加
      queryClient.setQueryData<Tag[]>(['tags'], (oldTags) => {
        if (!oldTags) return [newTag]
        return [...oldTags, newTag]
      })
      // オプション付きのタグクエリは無効化（検索やソートの結果が変わるため）
      queryClient.invalidateQueries({ 
        queryKey: ['tags'], 
        predicate: (query) => {
          const queryKey = query.queryKey as [string, object?]
          return !!(queryKey[0] === 'tags' && queryKey[1] && Object.keys(queryKey[1]).length > 0)
        }
      })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTagData }) => {
      const token = await getToken()
      const response = await tagsApi.updateTag(id, data, token || undefined)
      const responseData = await response.json()
      return responseData as Tag
    },
    onSuccess: (updatedTag, { id }) => {
      // タグ一覧の特定タグを更新
      queryClient.setQueryData<Tag[]>(['tags'], (oldTags) => {
        if (!oldTags) return [updatedTag]
        return oldTags.map(tag => tag.id === id ? updatedTag : tag)
      })
      // オプション付きのタグクエリは無効化
      queryClient.invalidateQueries({ 
        queryKey: ['tags'], 
        predicate: (query) => {
          const queryKey = query.queryKey as [string, object?]
          return !!(queryKey[0] === 'tags' && queryKey[1] && Object.keys(queryKey[1]).length > 0)
        }
      })
      // 全タグ付け情報を部分的に更新（タグ名が変わった場合）
      queryClient.setQueryData(['taggings', 'all'], (oldTaggings: any) => {
        if (!oldTaggings) return oldTaggings
        return oldTaggings.map((tagging: any) => 
          tagging.tagId === id ? { ...tagging, tag: updatedTag } : tagging
        )
      })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      await tagsApi.deleteTag(id, token || undefined)
    },
    onSuccess: (_, id) => {
      // タグ一覧から削除されたタグを除去
      queryClient.setQueryData<Tag[]>(['tags'], (oldTags) => {
        if (!oldTags) return []
        return oldTags.filter(tag => tag.id !== id)
      })
      // オプション付きのタグクエリは無効化
      queryClient.invalidateQueries({ 
        queryKey: ['tags'], 
        predicate: (query) => {
          const queryKey = query.queryKey as [string, object?]
          return !!(queryKey[0] === 'tags' && queryKey[1] && Object.keys(queryKey[1]).length > 0)
        }
      })
      // タグ付け情報を無効化（削除されたタグに関連する情報が変わるため）
      queryClient.invalidateQueries({ queryKey: ['taggings'] })
      queryClient.invalidateQueries({ queryKey: ['taggings', 'all'] })
    },
  })
}