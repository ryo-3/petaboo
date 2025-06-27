// 直接fetchを使用したAPIクライアント
const API_BASE_URL = 'http://localhost:8787'

export const notesApi = {
  // GET /notes
  getNotes: async () => {
    const response = await fetch(`${API_BASE_URL}/notes`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
  
  // POST /notes
  createNote: async (data: { title: string; content?: string }) => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // PUT /notes/:id
  updateNote: async (id: number, data: { title: string; content?: string }) => {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /notes/:id
  deleteNote: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // GET /notes/deleted
  getDeletedNotes: async () => {
    const response = await fetch(`${API_BASE_URL}/notes/deleted`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },

  // DELETE /notes/deleted/:id (完全削除)
  permanentDeleteNote: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/notes/deleted/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  },
}