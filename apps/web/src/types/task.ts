import { OriginalId, Uuid } from './common';

export interface Task {
  id: number;
  originalId?: OriginalId;
  uuid?: Uuid;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: number | null; // Unix timestamp
  categoryId: number | null;
  createdAt: number;
  updatedAt: number | null;
}

export interface DeletedTask {
  id: number;
  originalId: OriginalId;
  uuid?: Uuid;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: number | null;
  categoryId: number | null;
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
  categoryId?: number | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: number;
  categoryId?: number | null;
}