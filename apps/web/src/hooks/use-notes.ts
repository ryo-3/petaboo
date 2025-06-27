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