export interface Memo {
  id: number
  title: string
  content: string | null
  createdAt: number
  updatedAt?: number
}

export interface DeletedMemo {
  id: number
  originalId: number
  title: string
  content: string | null
  createdAt: number
  updatedAt?: number
  deletedAt: number
}

export interface CreateMemoData {
  title: string
  content?: string
}

export interface UpdateMemoData {
  title: string
  content?: string
}