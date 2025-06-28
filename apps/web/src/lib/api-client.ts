// 直接fetchを使用したAPIクライアント
import type { CreateMemoData, UpdateMemoData } from '@/src/types/memo'

const API_BASE_URL = 'http://localhost:8794'

export const notesApi = {
  // GET /notes
  getNotes: async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/notes`, { headers })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
  
  // POST /notes
  createNote: async (data: CreateMemoData, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // PUT /notes/:id
  updateNote: async (id: number, data: UpdateMemoData, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /notes/:id
  deleteNote: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'DELETE',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // GET /notes/deleted
  getDeletedNotes: async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/notes/deleted`, { headers })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /notes/deleted/:id (完全削除)
  permanentDeleteNote: async (id: number, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/notes/deleted/${id}`, {
      method: 'DELETE',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
}