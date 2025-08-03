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
      queryClient.invalidateQueries({ queryKey: ['tags'] })
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
      queryClient.invalidateQueries({ queryKey: ['tags'] })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['taggings'] })
    },
  })
}