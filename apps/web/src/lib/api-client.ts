import { hc } from 'hono/client'
import type { paths } from '@/src/types/api'

// API型からクライアント型を生成
export const apiClient = hc<paths>('http://localhost:8787')

// Notes API クライアント
export const notesApi = {
  // GET /notes
  getNotes: () => apiClient.notes.$get(),
  
  // POST /notes
  createNote: (data: { title: string; content?: string }) => 
    apiClient.notes.$post({ json: data }),
}