import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { memosApi } from '@/src/lib/api-client'
import type { Memo, DeletedMemo, CreateMemoData, UpdateMemoData } from '@/src/types/memo'

// メモ一覧を取得するhook
export function useMemos() {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['memos'],
    queryFn: async () => {
      const token = await getToken()
      const response = await memosApi.getMemos(token || undefined)
      const data = await response.json()
      return data as Memo[]
    },
  })
}

// 削除済みメモ一覧を取得するhook
export function useDeletedMemos() {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['deletedMemos'],
    queryFn: async () => {
      const token = await getToken()
      const response = await memosApi.getDeletedMemos(token || undefined)
      const data = await response.json()
      return data as DeletedMemo[]
    },
  })
}

// メモを作成するhook
export function useCreateMemo() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (memoData: CreateMemoData) => {
      const token = await getToken()
      const response = await memosApi.createNote(memoData, token || undefined)
      const data = await response.json()
      return data as Memo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
    },
  })
}

// メモを更新するhook
export function useUpdateMemo() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMemoData }) => {
      const token = await getToken()
      const response = await memosApi.updateNote(id, data, token || undefined)
      const responseData = await response.json()
      return responseData as Memo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
    },
  })
}

// メモを削除するhook（削除済みに移動）
export function useDeleteMemo() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      await memosApi.deleteNote(id, token || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
      queryClient.invalidateQueries({ queryKey: ['deletedMemos'] })
      // ボード関連のキャッシュを強制再取得（一覧と詳細両方）
      queryClient.refetchQueries({ queryKey: ['boards'] })
    },
  })
}

// メモを完全削除するhook
export function usePermanentDeleteMemo() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken()
      await memosApi.permanentDeleteNote(originalId, token || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedMemos'] })
    },
  })
}

// メモを復元するhook
export function useRestoreMemo() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken()
      await memosApi.restoreNote(originalId, token || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
      queryClient.invalidateQueries({ queryKey: ['deletedMemos'] })
      // ボード関連のキャッシュを強制再取得（一覧と詳細両方）
      queryClient.refetchQueries({ queryKey: ['boards'] })
    },
  })
}

// CSVインポートhook
export function useImportMemos() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken()
      const response = await memosApi.importMemos(file, token || undefined)
      const data = await response.json()
      return data as { success: boolean; imported: number; errors: string[] }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
    },
  })
}