// 直接fetchを使用したAPIクライアント
import type { CreateMemoData, UpdateMemoData } from '@/src/types/memo'
import type { CreateTaskData, UpdateTaskData } from '@/src/types/task'

const API_BASE_URL = 'http://localhost:8794'

export const memosApi = {
  // GET /memos
  getMemos: async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/memos`, { headers })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
  
  // POST /memos
  createNote: async (data: CreateMemoData, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/memos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // PUT /memos/:id
  updateNote: async (id: number, data: UpdateMemoData, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/memos/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /memos/:id
  deleteNote: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/memos/${id}`, {
      method: 'DELETE',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // GET /memos/deleted
  getDeletedMemos: async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/memos/deleted`, { headers })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /memos/deleted/:id (完全削除)
  permanentDeleteNote: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/memos/deleted/${id}`, {
      method: 'DELETE',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // POST /memos/deleted/:id/restore (復元)
  restoreNote: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/memos/deleted/${id}/restore`, {
      method: 'POST',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
}

export const tasksApi = {
  // GET /tasks
  getTasks: async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/tasks`, { headers })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
  
  // POST /tasks
  createTask: async (data: CreateTaskData, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // PUT /tasks/:id
  updateTask: async (id: number, data: UpdateTaskData, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /tasks/:id
  deleteTask: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // GET /tasks/deleted
  getDeletedTasks: async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/tasks/deleted`, { headers })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /tasks/deleted/:id (完全削除)
  permanentDeleteTask: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/tasks/deleted/${id}`, {
      method: 'DELETE',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // POST /tasks/deleted/:id/restore (復元)
  restoreTask: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/tasks/deleted/${id}/restore`, {
      method: 'POST',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
}