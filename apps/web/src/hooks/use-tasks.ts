import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { tasksApi } from '@/src/lib/api-client'
import type { Task, DeletedTask, CreateTaskData, UpdateTaskData } from '@/src/types/task'

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
  })
}

// タスク更新hook
export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
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
  })
}

// タスク削除hook
export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
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
  
  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      const response = await tasksApi.permanentDeleteTask(id, token || undefined)
      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // 削除済みタスク一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['deleted-tasks'] })
    },
  })
}

// タスク復元hook
export function useRestoreTask() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      const response = await tasksApi.restoreTask(id, token || undefined)
      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // タスク一覧と削除済み一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['deleted-tasks'] })
      // ボードキャッシュも無効化（タスクが含まれる可能性）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  })
}