export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdBy: number;
  createdByUsername?: string; // Nombre de usuario del creador
  assignedTo?: number; // Mantener para compatibilidad
  assignedUsers?: number[]; // Lista de usuarios asignados (IDs)
  assignedUsersNames?: string[]; // Lista de nombres de usuarios asignados
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
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  message?: string;
  error?: string;
}

