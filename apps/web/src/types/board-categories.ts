export interface BoardCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NewBoardCategory {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateBoardCategory {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}