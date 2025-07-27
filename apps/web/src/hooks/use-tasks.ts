import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { tasksApi } from '@/src/lib/api-client'
import type { Task, DeletedTask, CreateTaskData, UpdateTaskData } from '@/src/types/task'
import { useToast } from '@/src/contexts/toast-context'

// タスク一覧を取得するhook
export function useTasks() {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const token = await getToken()
      const response = await tasksApi.getTasks(token || undefined)
      const data = await response.json()
      return data as Task[]
    },
    staleTime: 2 * 60 * 1000,    // 2分間は新鮮なデータとして扱う
    gcTime: 10 * 60 * 1000,      // 10分間キャッシュを保持
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false,       // マウント時の再取得を無効化
  })
}

// タスク作成hook
export function useCreateTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const token = await getToken()
      const response = await tasksApi.createTask(data, token || undefined)
      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // タスク一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      // ボードキャッシュも無効化（タスクが含まれる可能性）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      // アイテムボード情報も無効化
      queryClient.invalidateQueries({ queryKey: ["item-boards"] });
    },
    onError: (error) => {
      console.error("タスク作成に失敗しました:", error);
      showToast("タスク作成に失敗しました", "error");
    },
  })
}

// タスク更新hook
export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTaskData }) => {
      const token = await getToken()
      const response = await tasksApi.updateTask(id, data, token || undefined)
      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // タスク一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      // ボードキャッシュも無効化（タスクが含まれる可能性）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      // アイテムボード情報も無効化
      queryClient.invalidateQueries({ queryKey: ["item-boards"] });
    },
    onError: (error) => {
      console.error("タスク更新に失敗しました:", error);
      showToast("タスク更新に失敗しました", "error");
    },
  })
}

// タスク削除hook
export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      const response = await tasksApi.deleteTask(id, token || undefined)
      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // タスク一覧と削除済み一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['deleted-tasks'] })
      // ボード関連のキャッシュも無効化（メモ削除と同様）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ['board-with-items'] })
      queryClient.invalidateQueries({ queryKey: ['board-deleted-items'] })
    },
    onError: (error) => {
      console.error("タスク削除に失敗しました:", error);
      showToast("タスク削除に失敗しました", "error");
    },
  })
}

// 削除済みタスク一覧を取得するhook
export function useDeletedTasks() {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['deleted-tasks'],
    queryFn: async () => {
      const token = await getToken()
      const response = await tasksApi.getDeletedTasks(token || undefined)
      const data = await response.json()
      return data as DeletedTask[]
    },
    staleTime: 2 * 60 * 1000,    // 2分間は新鮮なデータとして扱う
    gcTime: 10 * 60 * 1000,      // 10分間キャッシュを保持
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false,       // マウント時の再取得を無効化
  })
}

// タスク完全削除hook
export function usePermanentDeleteTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken()
      const response = await tasksApi.permanentDeleteTask(originalId, token || undefined)
      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // 削除済みタスク一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['deleted-tasks'] })
    },
    onError: (error) => {
      console.error("タスクの完全削除に失敗しました:", error);
      showToast("タスクの完全削除に失敗しました", "error");
    },
  })
}

// タスク復元hook
export function useRestoreTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken()
      const response = await tasksApi.restoreTask(originalId, token || undefined)
      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // タスク一覧と削除済み一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['deleted-tasks'] })
      // ボード関連のキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['board-with-items'] })
      queryClient.invalidateQueries({ queryKey: ['board-deleted-items'] })
    },
    onError: (error) => {
      console.error("タスク復元に失敗しました:", error);
      showToast("タスク復元に失敗しました", "error");
    },
  })
}

// CSVインポートhook
export function useImportTasks() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken()
      const response = await tasksApi.importTasks(file, token || undefined)
      const data = await response.json()
      return data as { success: boolean; imported: number; errors: string[] }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      console.error("タスクのCSVインポートに失敗しました:", error);
      showToast("タスクのCSVインポートに失敗しました", "error");
    },
  })
}