export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: number | null; // Unix timestamp
  createdAt: number;
  updatedAt: number | null;
}

export interface DeletedTask {
  id: number;
  originalId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: number | null;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: number;
}