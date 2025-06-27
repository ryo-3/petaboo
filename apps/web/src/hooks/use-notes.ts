import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '@/src/lib/api-client'

// Notes取得用フック
export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await notesApi.getNotes()
      return response.json()
    },
  })
}

// Note作成用フック
export function useCreateNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { title: string; content?: string }) => {
      const response = await notesApi.createNote(data)
      return response.json()
    },
    onSuccess: () => {
      // 作成後にnotesリストを再取得
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

// Note更新用フック
export function useUpdateNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title: string; content?: string } }) => {
      const response = await notesApi.updateNote(id, data)
      return response.json()
    },
    onSuccess: () => {
      // 更新後にnotesリストを再取得
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

// Note削除用フック
export function useDeleteNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await notesApi.deleteNote(id)
      return response.json()
    },
    onSuccess: () => {
      // 削除後にnotesリストを再取得
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

// 削除済みメモ取得用フック
export function useDeletedNotes() {
  return useQuery({
    queryKey: ['deleted-notes'],
    queryFn: async () => {
      const response = await notesApi.getDeletedNotes()
      return response.json()
    },
  })
}

// 完全削除用フック
export function usePermanentDeleteNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await notesApi.permanentDeleteNote(id)
      return response.json()
    },
    onSuccess: () => {
      // 完全削除後に削除済みメモリストを再取得
      queryClient.invalidateQueries({ queryKey: ['deleted-notes'] })
    },
  })
}