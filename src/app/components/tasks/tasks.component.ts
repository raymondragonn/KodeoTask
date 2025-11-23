import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task, TaskStatus } from '../../models/task.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit, OnDestroy {
  // Exponer TaskStatus para uso en el template
  TaskStatus = TaskStatus;
  
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  currentUser: any = null;
  showCreateModal = false;
  showCreateListModal = false;
  showEditModal = false;
  showTaskDetailsModal = false;
  isEditingInDetails = false; // Controla si estamos editando en el modal de detalles
  selectedTask: Task | null = null;
  filterStatus: string = 'ALL';
  
  // Agrupación por categoría
  tasksByCategory: { [key: string]: Task[] } = {};
  categories: string[] = [];
  selectedCategory: string | null = null;
  showCompletedTasks: { [key: string]: boolean } = {};
  visibleCategories: { [key: string]: boolean } = {}; // Controla qué categorías están visibles
  sidebarVisible = true; // Controla la visibilidad del sidebar
  
  // Formulario
  taskTitle = '';
  taskDescription = '';
  taskAssignedTo: number | null = null;
  taskCategory: string = '';
  taskDueDate: string = '';
  
  // Formulario Lista
  listName = '';
  
  // Quick add
  quickAddTitle: { [key: string]: string } = {};
  
  private subscriptions: Subscription[] = [];

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // AUTENTICACIÓN DESACTIVADA - Modo mock
    // if (!this.authService.isAuthenticated()) {
    //   this.router.navigate(['/login']);
    //   return;
    // }

    // Usuario mock para desarrollo
    this.currentUser = { id: 1, username: 'Usuario Demo', email: 'demo@taskcore.com' };
    this.loadTasks();

    // Suscribirse a actualizaciones en tiempo real
    const sub = this.taskService.taskUpdate$.subscribe(task => {
      this.loadTasks(); // Recargar tareas cuando hay una actualización
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.applyFilter();
      },
      error: (err) => {
        console.error('Error al cargar tareas', err);
        // AUTENTICACIÓN DESACTIVADA
        // if (err.status === 401) {
        //   this.authService.logout();
        //   this.router.navigate(['/login']);
        // }
      }
    });
  }

  applyFilter(): void {
    if (this.filterStatus === 'ALL') {
      this.filteredTasks = this.tasks;
    } else {
      this.filteredTasks = this.tasks.filter(t => t.status === this.filterStatus);
    }
    this.groupTasksByCategory();
  }

  groupTasksByCategory(): void {
    this.tasksByCategory = {};
    this.categories = [];
    
    this.filteredTasks.forEach(task => {
      const category = task.category || 'Sin categoría';
      if (!this.tasksByCategory[category]) {
        this.tasksByCategory[category] = [];
        this.categories.push(category);
        // Inicializar como visible si no existe
        if (this.visibleCategories[category] === undefined) {
          this.visibleCategories[category] = true;
        }
      }
      this.tasksByCategory[category].push(task);
    });
    
    // Ordenar categorías
    this.categories.sort();
  }

  getVisibleCategories(): string[] {
    return this.categories.filter(category => this.visibleCategories[category] !== false);
  }

  toggleCategoryVisibility(category: string, event: Event): void {
    event.stopPropagation(); // Evitar que se active el click del contenedor
    this.visibleCategories[category] = !this.visibleCategories[category];
  }

  isCategoryVisible(category: string): boolean {
    return this.visibleCategories[category] !== false;
  }

  getPendingTasks(category: string): Task[] {
    return this.tasksByCategory[category]?.filter(t => t.status !== TaskStatus.COMPLETED) || [];
  }

  getCompletedTasks(category: string): Task[] {
    return this.tasksByCategory[category]?.filter(t => t.status === TaskStatus.COMPLETED) || [];
  }

  toggleCompletedTasks(category: string): void {
    this.showCompletedTasks[category] = !this.showCompletedTasks[category];
  }

  quickAddTask(category: string): void {
    const title = this.quickAddTitle[category]?.trim();
    if (!title) return;

    const newTask: Partial<Task> = {
      title: title,
      status: TaskStatus.PENDING,
      category: category !== 'Sin categoría' ? category : undefined
    };

    this.taskService.createTask(newTask).subscribe({
      next: () => {
        this.quickAddTitle[category] = '';
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error al crear tarea', err);
      }
    });
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  openCreateModal(category?: string): void {
    this.taskTitle = '';
    this.taskDescription = '';
    this.taskAssignedTo = null;
    this.taskCategory = category || '';
    this.taskDueDate = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showTaskDetailsModal = false;
    this.selectedTask = null;
  }

  openTaskDetailsModal(task: Task): void {
    this.selectedTask = task;
    this.isEditingInDetails = false;
    // Cargar los valores del formulario
    this.taskTitle = task.title;
    this.taskDescription = task.description || '';
    this.taskCategory = task.category || '';
    this.taskDueDate = task.dueDate || '';
    this.showTaskDetailsModal = true;
  }

  closeTaskDetailsModal(): void {
    if (this.isEditingInDetails) {
      // Si está editando, cancelar cambios
      if (this.selectedTask) {
        this.taskTitle = this.selectedTask.title;
        this.taskDescription = this.selectedTask.description || '';
        this.taskCategory = this.selectedTask.category || '';
        this.taskDueDate = this.selectedTask.dueDate || '';
      }
    }
    this.showTaskDetailsModal = false;
    this.isEditingInDetails = false;
    this.selectedTask = null;
    // Limpiar formulario
    this.taskTitle = '';
    this.taskDescription = '';
    this.taskCategory = '';
    this.taskDueDate = '';
  }

  isTaskOwner(): boolean {
    return this.selectedTask && this.currentUser && 
           this.selectedTask.createdBy === this.currentUser.id;
  }

  toggleEditInDetails(): void {
    if (this.isEditingInDetails) {
      // Guardar cambios
      this.saveTaskFromDetails();
    } else {
      // Activar modo edición
      if (this.selectedTask) {
        this.taskTitle = this.selectedTask.title;
        this.taskDescription = this.selectedTask.description || '';
        this.taskCategory = this.selectedTask.category || '';
        this.taskDueDate = this.selectedTask.dueDate || '';
      }
      this.isEditingInDetails = true;
    }
  }

  cancelEditInDetails(): void {
    if (this.selectedTask) {
      this.taskTitle = this.selectedTask.title;
      this.taskDescription = this.selectedTask.description || '';
      this.taskCategory = this.selectedTask.category || '';
      this.taskDueDate = this.selectedTask.dueDate || '';
    }
    this.isEditingInDetails = false;
  }

  saveTaskFromDetails(): void {
    if (!this.selectedTask || !this.taskTitle.trim()) {
      return;
    }

    const updatedTask: Partial<Task> = {
      title: this.taskTitle,
      description: this.taskDescription,
      category: this.taskCategory || undefined,
      dueDate: this.taskDueDate || undefined
    };

    this.taskService.updateTask(this.selectedTask.id!, updatedTask).subscribe({
      next: () => {
        this.loadTasks();
        this.isEditingInDetails = false;
        // Recargar la tarea actualizada
        this.taskService.getTask(this.selectedTask!.id!).subscribe({
          next: (task) => {
            this.selectedTask = task;
          }
        });
      },
      error: (err) => {
        console.error('Error al actualizar tarea', err);
      }
    });
  }

  openCreateListModal(): void {
    this.listName = '';
    this.showCreateListModal = true;
  }

  closeCreateListModal(): void {
    this.showCreateListModal = false;
    this.listName = '';
  }

  createList(): void {
    if (!this.listName.trim()) {
      return;
    }

    // Crear una tarea vacía con la nueva categoría para que aparezca en la lista
    // O simplemente agregar la categoría a la lista de categorías disponibles
    // Por ahora, crearemos una tarea placeholder que se puede eliminar después
    const newTask: Partial<Task> = {
      title: 'Nueva lista',
      description: '',
      status: TaskStatus.PENDING,
      category: this.listName.trim()
    };

    this.taskService.createTask(newTask).subscribe({
      next: () => {
        this.loadTasks();
        this.closeCreateListModal();
      },
      error: (err) => {
        console.error('Error al crear lista', err);
      }
    });
  }

  openEditModal(task: Task): void {
    this.selectedTask = task;
    this.taskTitle = task.title;
    this.taskDescription = task.description || '';
    this.taskAssignedTo = task.assignedTo || null;
    this.taskCategory = task.category || '';
    this.taskDueDate = task.dueDate || '';
    this.showEditModal = true;
  }

  createTask(): void {
    if (!this.taskTitle.trim()) {
      return;
    }

    const newTask: Partial<Task> = {
      title: this.taskTitle,
      description: this.taskDescription,
      status: TaskStatus.PENDING,
      assignedTo: this.taskAssignedTo || undefined,
      category: this.taskCategory || undefined,
      dueDate: this.taskDueDate || undefined
    };

    this.taskService.createTask(newTask).subscribe({
      next: () => {
        this.loadTasks();
        this.closeCreateModal();
        this.taskCategory = '';
        this.taskDueDate = '';
      },
      error: (err) => {
        console.error('Error al crear tarea', err);
      }
    });
  }

  updateTask(): void {
    if (!this.selectedTask || !this.taskTitle.trim()) {
      return;
    }

    const updatedTask: Partial<Task> = {
      title: this.taskTitle,
      description: this.taskDescription,
      assignedTo: this.taskAssignedTo || undefined,
      category: this.taskCategory || undefined,
      dueDate: this.taskDueDate || undefined
    };

    this.taskService.updateTask(this.selectedTask.id!, updatedTask).subscribe({
      next: () => {
        this.loadTasks();
        this.closeCreateModal();
        this.taskCategory = '';
        this.taskDueDate = '';
      },
      error: (err) => {
        console.error('Error al actualizar tarea', err);
      }
    });
  }

  updateTaskStatus(task: Task, newStatus: string): void {
    const status = newStatus as TaskStatus;
    const updateData: Partial<Task> = { status };
    
    if (status === TaskStatus.COMPLETED && !task.completedAt) {
      updateData.completedAt = new Date().toISOString();
    }
    
    this.taskService.updateTask(task.id!, updateData).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error al actualizar estado', err);
      }
    });
  }

  toggleTaskComplete(task: Task): void {
    const newStatus = task.status === TaskStatus.COMPLETED 
      ? TaskStatus.PENDING 
      : TaskStatus.COMPLETED;
    this.updateTaskStatus(task, newStatus);
  }

  deleteTask(task: Task): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      this.taskService.deleteTask(task.id!).subscribe({
        next: () => {
          this.loadTasks();
        },
        error: (err) => {
          console.error('Error al eliminar tarea', err);
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getStatusClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'status-pending';
      case TaskStatus.IN_PROGRESS:
        return 'status-in-progress';
      case TaskStatus.COMPLETED:
        return 'status-completed';
      case TaskStatus.CANCELLED:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'Pendiente';
      case TaskStatus.IN_PROGRESS:
        return 'En Progreso';
      case TaskStatus.COMPLETED:
        return 'Completada';
      case TaskStatus.CANCELLED:
        return 'Cancelada';
      default:
        return status;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}, ${hours}:${minutes}`;
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }
}

