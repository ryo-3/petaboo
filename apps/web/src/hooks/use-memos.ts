import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { notesApi } from '@/src/lib/api-client'
import type { Memo, DeletedMemo, CreateMemoData, UpdateMemoData } from '@/src/types/memo'

// メモ一覧を取得するhook
export function useMemos() {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['memos'],
    queryFn: async () => {
      const token = await getToken()
      const response = await notesApi.getNotes(token || undefined)
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
      const response = await notesApi.getDeletedNotes(token || undefined)
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
      const response = await notesApi.createNote(memoData, token || undefined)
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
      const response = await notesApi.updateNote(id, data, token || undefined)
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
      await notesApi.deleteNote(id, token || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
      queryClient.invalidateQueries({ queryKey: ['deletedMemos'] })
    },
  })
}

// メモを完全削除するhook
export function usePermanentDeleteMemo() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      await notesApi.permanentDeleteNote(id, token || undefined)
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
    mutationFn: async (id: number) => {
      const token = await getToken()
      await notesApi.restoreNote(id, token || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
      queryClient.invalidateQueries({ queryKey: ['deletedMemos'] })
    },
  })
}