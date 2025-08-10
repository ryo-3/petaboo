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
    onSuccess: (newMemo) => {
      // 新規作成されたメモのキャッシュを更新
      queryClient.setQueryData<Memo[]>(['memos'], (oldMemos) => {
        if (!oldMemos) return [newMemo]
        return [...oldMemos, newMemo]
      })
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
    onSuccess: (updatedMemo, { id }) => {
      // 特定のメモのキャッシュを更新
      queryClient.setQueryData<Memo[]>(['memos'], (oldMemos) => {
        if (!oldMemos) return [updatedMemo]
        return oldMemos.map(memo => memo.id === id ? updatedMemo : memo)
      })
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
    onSuccess: (_, id) => {
      // メモ一覧から削除されたメモを除去
      queryClient.setQueryData<Memo[]>(['memos'], (oldMemos) => {
        if (!oldMemos) return []
        return oldMemos.filter(memo => memo.id !== id)
      })
      // 削除済み一覧は無効化（削除済みメモが追加されるため）
      queryClient.invalidateQueries({ queryKey: ['deletedMemos'] })
      // ボード関連のキャッシュを強制再取得（統計が変わるため）
      queryClient.refetchQueries({ queryKey: ['boards'] })
      // 全タグ付け情報を無効化（削除されたメモに関連するタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ['taggings', 'all'] })
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
    onSuccess: (_, originalId) => {
      // 削除済み一覧から完全削除されたメモを除去
      queryClient.setQueryData<DeletedMemo[]>(['deletedMemos'], (oldDeletedMemos) => {
        if (!oldDeletedMemos) return []
        return oldDeletedMemos.filter(memo => memo.originalId !== originalId)
      })
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
      // メモと削除済みメモの両方を無効化（復元されたメモの新しいIDが分からないため）
      queryClient.invalidateQueries({ queryKey: ['memos'] })
      queryClient.invalidateQueries({ queryKey: ['deletedMemos'] })
      // ボード関連のキャッシュを強制再取得（復元されたメモがボードに含まれる可能性があるため）
      queryClient.refetchQueries({ queryKey: ['boards'] })
      // 全タグ付け情報を無効化（復元されたメモのタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ['taggings', 'all'] })
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
      // CSVインポートは大量データの可能性があるため一覧を無効化
      queryClient.invalidateQueries({ queryKey: ['memos'] })
    },
  })
}