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
    onSuccess: () => {
      // console.log('🔄 新規タグ作成成功、全キャッシュ無効化:', { id: newTag.id, name: newTag.name });
      
      // 新規タグ作成時は複数のキャッシュキーに影響するため、全て無効化して再取得を促す
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['taggings', 'all'] })
      
      // console.log('✅ 全タグキャッシュとタグ付けキャッシュを無効化完了');
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
    onSuccess: () => {
      // 全てのタグ関連クエリを無効化して再取得（確実にキャッシュ更新）
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      
      // 全タグ付け情報も無効化（タグ名・色が変わった場合に確実に更新）
      queryClient.invalidateQueries({ queryKey: ['taggings'] })
      queryClient.invalidateQueries({ queryKey: ['taggings', 'all'] })
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