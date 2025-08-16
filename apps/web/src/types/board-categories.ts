export interface BoardCategory {
  id: number;
  name: string;
  boardId: number;
  icon?: string;
  userId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NewBoardCategory {
  name: string;
  boardId: number;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateBoardCategory {
  name?: string;
  icon?: string;
  sortOrder?: number;
}