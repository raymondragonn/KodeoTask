export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdBy: number;
  assignedTo?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  category?: string; // Categoría/Lista para agrupar tareas
  dueDate?: string; // Fecha de vencimiento
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  userId?: number;
  username?: string;
  message?: string;
  error?: string;
}

