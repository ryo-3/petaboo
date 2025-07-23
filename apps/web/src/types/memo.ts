export interface Memo {
  id: number
  title: string
  content: string | null
  categoryId?: number | null
  createdAt: number
  updatedAt?: number
  tempId?: string
}

export interface DeletedMemo {
  id: number
  originalId: string
  title: string
  content: string | null
  categoryId?: number | null
  createdAt: number
  updatedAt?: number
  deletedAt: number
}

export interface CreateMemoData {
  title: string
  content?: string
  categoryId?: number | null
}

export interface UpdateMemoData {
  title: string
  content?: string
  categoryId?: number | null
}